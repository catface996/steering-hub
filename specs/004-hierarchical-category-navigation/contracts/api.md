# API Contracts: 分级 Category 导航

**Feature**: 004-hierarchical-category-navigation
**Date**: 2026-03-25

---

## 后端接口（REST）

所有新增接口使用 `/api/v1/mcp/` 路由前缀，不修改现有 `/api/v1/web/` 接口。

---

### GET /api/v1/mcp/categories

查询分类列表（直接子节点）。

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| parent_id | Long | 否 | 父分类 ID；不传或传 0 时返回顶层分类（parent_id IS NULL） |

**Response**: `Result<List<CategoryNavItem>>`

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "name": "编码规范",
      "code": "coding",
      "description": "代码风格、命名、注释等规范",
      "childCount": 3
    },
    {
      "id": 2,
      "name": "架构规范",
      "code": "architecture",
      "description": "DDD、分层、模块化等架构规范",
      "childCount": 0
    }
  ]
}
```

**Response DTO**: `CategoryNavItem`

```java
public class CategoryNavItem {
    private Long id;
    private String name;
    private String code;
    private String description;
    private Integer childCount;  // 直接子分类数量（enabled=true, deleted=false）
}
```

**排序规则**: `ORDER BY sort_order ASC, id ASC`

**过滤规则**: 仅返回 `enabled=true AND deleted=false` 的分类

**边界处理**:
- parent_id 不存在 → 返回空数组，HTTP 200
- parent_id=0 等价于 parent_id=null → 返回顶层分类

---

### GET /api/v1/mcp/steerings

查询某分类下的规范摘要列表。

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category_id | Long | **是** | 分类 ID |
| limit | Integer | 否 | 返回条数，1~50，默认 10 |

**Response**: `Result<List<SteeringNavItem>>`

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 42,
      "title": "Controller REST 接口规范",
      "tags": "Controller,REST,HTTP",
      "updatedAt": "2026-03-22T10:30:00+08:00"
    },
    {
      "id": 7,
      "title": "统一返回格式规范",
      "tags": "Controller,Result",
      "updatedAt": "2026-03-20T09:15:00+08:00"
    }
  ]
}
```

**Response DTO**: `SteeringNavItem`

```java
public class SteeringNavItem {
    private Long id;
    private String title;
    private String tags;       // 原始逗号分隔字符串，如 "Controller,REST"
    private OffsetDateTime updatedAt;
}
```

**过滤规则**: `status='active' AND deleted=false AND category_id=?`

**排序规则**: `ORDER BY updated_at DESC`

**limit 校验**: 小于 1 时取 1，大于 50 时取 50（Clamp）；@Valid 注解：`@Min(1) @Max(50)`

**边界处理**:
- category_id 不存在 → 返回空数组，HTTP 200
- 分类下无 active 规范 → 返回空数组，HTTP 200

---

## Controller 位置

新增接口添加到现有 `SteeringCategoryController` 中，使用新的请求映射路径：

```java
// 当前：/api/v1/web/categories（不动）
// 新增：两个独立的 MCP 专用端点

@GetMapping("/api/v1/mcp/categories")
public Result<List<CategoryNavItem>> listCategoriesForMcp(
    @RequestParam(required = false) Long parentId) { ... }

@GetMapping("/api/v1/mcp/steerings")
public Result<List<SteeringNavItem>> listSteeringsForMcp(
    @RequestParam Long categoryId,
    @RequestParam(defaultValue = "10") @Min(1) @Max(50) Integer limit) { ... }
```

或新建 `CategoryNavController`（如果需要保持 Controller 职责单一）。设计决策见 research.md。

---

## MCP 工具定义

### list_categories

```json
{
  "name": "list_categories",
  "description": "Browse the steering category tree by listing direct children of a given parent. Call without parent_id to get top-level categories, then drill down level by level. Use this when you know the domain (e.g. 'coding', 'architecture') but not the exact keyword for search_steering.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "parent_id": {
        "type": "integer",
        "description": "Parent category ID. Omit (or pass 0) to list top-level categories. Pass a category ID to list its direct subcategories."
      }
    }
  }
}
```

**Python 函数签名**:
```python
async def list_categories(parent_id: Optional[int] = None) -> list[dict]:
    """GET /api/v1/mcp/categories?parent_id={parent_id}"""
```

---

### list_steerings

```json
{
  "name": "list_steerings",
  "description": "List all active (effective) steerings in a specific category. Returns title, id, and tags — call get_steering with the id to retrieve full content. Use after list_categories to browse steerings by category.",
  "inputSchema": {
    "type": "object",
    "required": ["category_id"],
    "properties": {
      "category_id": {
        "type": "integer",
        "description": "Category ID from list_categories result."
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of results to return (1-50, default: 10).",
        "default": 10
      }
    }
  }
}
```

**Python 函数签名**:
```python
async def list_steerings(category_id: int, limit: int = 10) -> list[dict]:
    """GET /api/v1/mcp/steerings?category_id={category_id}&limit={limit}"""
```

---

## Agent 推荐工作流

```
# 不确定关键词时，使用导航路径：
1. list_categories()                    → 获取顶层分类列表
2. list_categories(parent_id=<id>)      → 下钻到子分类（可选，多层）
3. list_steerings(category_id=<id>)     → 获取该分类下规范摘要
4. get_steering(id=<id>)                → 获取具体规范完整内容

# 已知关键词时，使用搜索路径（不变）：
1. search_steering(query="...")         → 语义搜索直接命中
```
