# API Contracts: 分级 Category 导航（DAG 方案）

**Feature**: 004-hierarchical-category-navigation
**Date**: 2026-03-25 (rev 2: DAG 方案)

---

## 接口总览

| 路径前缀 | 用途 |
|---------|------|
| `/api/v1/mcp/` | MCP Server 调用，只读，无鉴权（与现有 MCP 接口一致） |
| `/api/v1/web/` | Web 管理端调用，DAG 关系的增删管理 |

---

## MCP 只读接口

### GET /api/v1/mcp/categories

查询分类列表。`parent_id` 未传或为 0 时返回顶层分类（无父节点），传正整数时返回该节点的直接子分类。

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| parent_id | Long | 否 | 父分类 ID；不传或 0 → 顶层分类；正整数 → 直接子分类 |

**Response**: `Result<List<CategoryNavItem>>`

```json
{
  "code": 200,
  "data": [
    { "id": 10, "name": "Java 后端", "code": "java-backend", "description": "...", "childCount": 2, "sortOrder": 1 },
    { "id": 11, "name": "前端", "code": "frontend", "description": "...", "childCount": 3, "sortOrder": 2 }
  ]
}
```

**排序**: `ORDER BY ch.sort_order ASC, sc.id ASC`（顶层分类按 `steering_category.sort_order`）

**过滤**: 仅返回 `enabled=true AND deleted=false` 的分类

**边界**: parent_id 不存在 → 空数组；叶节点 → 空数组；均 HTTP 200

---

### GET /api/v1/mcp/steerings

查询某分类下的规范摘要列表（仅 active）。

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category_id | Long | **是** | 分类 ID |
| limit | Integer | 否 | 返回条数，1~50，默认 10 |

**Response**: `Result<List<SteeringNavItem>>`

```json
{
  "code": 200,
  "data": [
    { "id": 7, "title": "HTTP 流量入口层规范（Controller）", "tags": "编码规范,Controller,DDD", "updatedAt": "2026-03-22T10:30:00+08:00" }
  ]
}
```

**过滤**: `status='active' AND deleted=false AND category_id=#{categoryId}`

**排序**: `ORDER BY updated_at DESC`

**limit**: Clamp [1, 50]；不报错，超出范围自动调整

---

## Web 管理接口（DAG 关系管理）

### POST /api/v1/web/category-hierarchy

添加一条父子分类关系。插入前执行环检测，若成环则返回 400。

**Request Body**: `CategoryHierarchyRequest`

```json
{
  "parentCategoryId": 1,
  "childCategoryId": 10,
  "sortOrder": 1
}
```

```java
public class CategoryHierarchyRequest {
    @NotNull Long parentCategoryId;
    @NotNull Long childCategoryId;
    @Min(0) Integer sortOrder = 0;
}
```

**Response**: `Result<Void>`

**错误**:
- `400 CYCLE_DETECTED` — 添加此关系将形成环
- `400 SELF_LOOP` — parent 与 child 相同
- `404 CATEGORY_NOT_FOUND` — parent 或 child 不存在

---

### DELETE /api/v1/web/category-hierarchy

删除一条父子分类关系（物理删除）。

**Request Body**: `CategoryHierarchyDeleteRequest`

```json
{
  "parentCategoryId": 1,
  "childCategoryId": 10
}
```

```java
public class CategoryHierarchyDeleteRequest {
    @NotNull Long parentCategoryId;
    @NotNull Long childCategoryId;
}
```

**Response**: `Result<Void>`

**边界**: 关系不存在时返回成功（幂等 DELETE）

---

## Controller 定位

```java
// 新建 CategoryNavController（不修改任何现有 Controller）
@RestController
@RequiredArgsConstructor
@Validated
public class CategoryNavController {

    // MCP 只读
    @GetMapping("/api/v1/mcp/categories")
    public Result<List<CategoryNavItem>> listCategories(
        @RequestParam(required = false) Long parentId) { ... }

    @GetMapping("/api/v1/mcp/steerings")
    public Result<List<SteeringNavItem>> listSteerings(
        @RequestParam Long categoryId,
        @RequestParam(defaultValue = "10") @Min(1) @Max(50) Integer limit) { ... }

    // Web 管理
    @PostMapping("/api/v1/web/category-hierarchy")
    public Result<Void> addHierarchy(
        @RequestBody @Valid CategoryHierarchyRequest req) { ... }

    @DeleteMapping("/api/v1/web/category-hierarchy")
    public Result<Void> removeHierarchy(
        @RequestBody @Valid CategoryHierarchyDeleteRequest req) { ... }
}
```

---

## MCP 工具定义（不变）

### list_categories

```json
{
  "name": "list_categories",
  "description": "Browse the steering category DAG by listing direct children of a given parent. Omit parent_id (or pass 0) to get top-level categories (nodes with no parents). Pass a category ID to list its direct subcategories. A category may appear under multiple parents — use this tool to navigate the hierarchy level by level.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "parent_id": {
        "type": "integer",
        "description": "Parent category ID. Omit or pass 0 for top-level categories. Pass a positive integer for direct subcategories of that node."
      }
    }
  }
}
```

### list_steerings

```json
{
  "name": "list_steerings",
  "description": "List all active steerings in a specific category. Returns id, title, and tags — call get_steering(id) for full content. Note: 'tags' and 'category' are orthogonal dimensions. Tags describe technology stack (Java, React, etc); categories describe architectural grouping.",
  "inputSchema": {
    "type": "object",
    "required": ["category_id"],
    "properties": {
      "category_id": {
        "type": "integer",
        "description": "Category ID from list_categories."
      },
      "limit": {
        "type": "integer",
        "description": "Max results to return (1-50, default 10).",
        "default": 10
      }
    }
  }
}
```

---

## Tags 与 Category 的正交关系

```
search_steering(query="...", tags=["Java","Controller"])   → tags 维度（技术栈）
list_categories() + list_steerings(category_id=N)          → category 维度（架构分层）

两者正交，互不影响：
- search_steering 完全不感知 category_hierarchy 表
- list_steerings 不过滤 tags，返回该分类下全部 active 规范
- 可以组合：list_categories 定位分类 → search_steering(category_code=...) 在该分类内精搜
```

---

## Agent 推荐工作流

```
# 路径 A：导航模式（不确定关键词时）
1. list_categories()                    → 顶层分类
2. list_categories(parent_id=<id>)      → 子分类（可多级下钻）
3. list_steerings(category_id=<id>)     → 规范摘要列表
4. get_steering(id=<id>)                → 完整规范内容

# 路径 B：搜索模式（已知关键词时，不变）
1. search_steering(query="Controller REST 接口")  → 直接命中

# 路径 C：组合模式
1. list_categories() → 定位到 category_code="coding"
2. search_steering(query="...", category_code="coding") → 缩小搜索范围
```
