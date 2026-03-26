# Data Model: 分级 Category 导航（DAG 方案）

**Feature**: 004-hierarchical-category-navigation
**Phase**: 1 — Design
**Date**: 2026-03-25 (rev 2: DAG 方案)

---

## 设计决策：DAG 多对多关系表，不使用 parent_id

`steering_category` 表已有 `parent_id` 字段（单亲树），但审计发现现有 6 个分类**全部平铺**（parent_id 均为 NULL），尚未建立任何层级关系。

本 Feature 改用独立关联表 `category_hierarchy` 实现 DAG（有向无环图）：
- 一个分类可属于多个父分类（如"MyBatisPlus" 同时属于 "Java 后端" 和 "数据访问"）
- 不修改 `steering_category.parent_id` 字段（保留，但本 Feature 不读写它）
- `steering.tags` 字段和相关查询**完全不动**（tags 与 category_hierarchy 是正交的两个维度）

---

## 新增表

### `category_hierarchy` 表（分类父子关系）

```sql
CREATE TABLE IF NOT EXISTS category_hierarchy (
    parent_category_id  BIGINT  NOT NULL REFERENCES steering_category(id),
    child_category_id   BIGINT  NOT NULL REFERENCES steering_category(id),
    sort_order          INT     NOT NULL DEFAULT 0,
    PRIMARY KEY (parent_category_id, child_category_id),
    CONSTRAINT chk_no_self_loop CHECK (parent_category_id != child_category_id)
);

CREATE INDEX IF NOT EXISTS idx_cat_hier_parent ON category_hierarchy(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_cat_hier_child  ON category_hierarchy(child_category_id);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| parent_category_id | BIGINT NOT NULL PK FK | 父分类 ID |
| child_category_id | BIGINT NOT NULL PK FK | 子分类 ID |
| sort_order | INT NOT NULL DEFAULT 0 | 同一父分类下子分类的排序权重 |

**约束**:
- `PRIMARY KEY(parent_category_id, child_category_id)` — 幂等，重复插入同一对关系返回成功
- `CHECK(parent_category_id != child_category_id)` — DB 层自环防护
- 应用层插入前必须执行**环检测**（见下文），DB 层仅做自环检查

**索引**:
- `idx_cat_hier_parent` — 按父节点查子节点列表（`list_categories` 核心查询）
- `idx_cat_hier_child` — 按子节点查父节点列表（反向导航 / 面包屑）

---

## 顶层分类定义

顶层分类 = 在 `category_hierarchy` 中**没有任何父节点**的分类：

```sql
-- 顶层分类查询
SELECT sc.*
FROM steering_category sc
WHERE sc.enabled = TRUE AND sc.deleted = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM category_hierarchy ch
    WHERE ch.child_category_id = sc.id
  )
ORDER BY sc.sort_order, sc.id;
```

> `parent_id=null`（或 `parent_id=0`）时，使用此查询替代原来的 `WHERE parent_id IS NULL`。

---

## 环检测算法

**触发时机**: `POST /api/v1/web/category-hierarchy`（添加关系）时，插入前执行。

**算法**: 从 `child_category_id` 出发，沿 `category_hierarchy` 做 BFS/DFS 向下遍历所有后代，若发现 `parent_category_id` 出现在后代集合中，则拒绝插入（会成环）。

**伪代码**:

```java
// 检测 addRelation(parentId, childId) 是否会形成环
// 策略：从 childId 出发找所有后代，若 parentId 在其中则成环
Set<Long> descendants = getAllDescendants(childId);  // BFS via category_hierarchy
if (descendants.contains(parentId)) {
    throw new BusinessException("添加此关系将形成环，操作已拒绝");
}

private Set<Long> getAllDescendants(Long rootId) {
    Set<Long> visited = new HashSet<>();
    Queue<Long> queue = new LinkedList<>();
    queue.add(rootId);
    while (!queue.isEmpty()) {
        Long cur = queue.poll();
        if (!visited.add(cur)) continue;  // 已访问，跳过
        // 查 cur 的直接子节点（XML Mapper，禁止循环单条查询）
        List<Long> children = categoryHierarchyMapper.selectChildIds(cur);
        queue.addAll(children);
    }
    return visited;
}
```

**性能说明**: 分类总数通常 < 100，BFS 遍历开销可忽略不计。

---

## 现有表（不修改）

### `steering_category` 表（相关字段）

| 字段 | 说明 |
|------|------|
| id | 分类主键 |
| name | 显示名称 |
| code | 唯一编码 |
| description | 描述 |
| parent_id | **已存在，本 Feature 不读写**（保留字段，不删除） |
| sort_order | **用于同级排序**（`category_hierarchy.sort_order` 覆盖此语义） |
| enabled | 是否启用 |
| deleted | 软删除 |

### `steering` 表（只读）

| 字段 | 说明 |
|------|------|
| category_id | 一对一关联 `steering_category.id`，本 Feature 不修改 |
| tags | **完全不动**，与 category_hierarchy 正交 |
| status | 过滤 active 规范时使用 |

---

## 两个维度的正交关系

```
category_hierarchy  ← 架构分层维度（一个规范属于哪个分类，分类如何组织层级）
steering.tags       ← 技术栈维度（Java、React、Controller 等标签）
```

- `search_steering(query, tags=[...])` 走 tags 维度，完全不感知 category_hierarchy
- `list_steerings(category_id=N)` 走 category_hierarchy 维度，过滤 `steering.category_id = N`
- 两个维度可以组合：先用 `list_categories` 定位分类，再用 `search_steering(category_code=...)` 在该分类内按 tags 精搜

---

## 新增 Java 实体与 DTO

### `CategoryHierarchy` 实体（新增）

```java
@Data
@TableName("category_hierarchy")
public class CategoryHierarchy implements Serializable {
    private Long parentCategoryId;
    private Long childCategoryId;
    private Integer sortOrder;
}
```

注：复合主键，MyBatis Plus 用 `@TableId` 注解可省略，直接通过 XML Mapper 操作。

### `CategoryNavItem` DTO（新增）

```java
@Data
public class CategoryNavItem {
    private Long id;
    private String name;
    private String code;
    private String description;
    private Integer childCount;   // 直接子分类数量（enabled=true, deleted=false）
    private Integer sortOrder;    // category_hierarchy.sort_order（相对于父节点）
}
```

### `SteeringNavItem` DTO（新增）

```java
@Data
public class SteeringNavItem {
    private Long id;
    private String title;
    private String tags;
    private OffsetDateTime updatedAt;
}
```

---

## 关键 SQL 查询

### 1. 查顶层分类（无父节点）

```xml
<select id="listTopLevel" resultType="CategoryNavItem">
    SELECT
        sc.id,
        sc.name,
        sc.code,
        sc.description,
        sc.sort_order AS sort_order,
        (
            SELECT COUNT(*)
            FROM category_hierarchy ch2
            JOIN steering_category sc2 ON sc2.id = ch2.child_category_id
            WHERE ch2.parent_category_id = sc.id
              AND sc2.enabled = TRUE AND sc2.deleted = FALSE
        ) AS child_count
    FROM steering_category sc
    WHERE sc.enabled = TRUE AND sc.deleted = FALSE
      AND NOT EXISTS (
          SELECT 1 FROM category_hierarchy ch
          WHERE ch.child_category_id = sc.id
      )
    ORDER BY sc.sort_order ASC, sc.id ASC
</select>
```

### 2. 查某父分类的直接子分类

```xml
<select id="listChildren" resultType="CategoryNavItem">
    SELECT
        sc.id,
        sc.name,
        sc.code,
        sc.description,
        ch.sort_order AS sort_order,
        (
            SELECT COUNT(*)
            FROM category_hierarchy ch2
            JOIN steering_category sc2 ON sc2.id = ch2.child_category_id
            WHERE ch2.parent_category_id = sc.id
              AND sc2.enabled = TRUE AND sc2.deleted = FALSE
        ) AS child_count
    FROM category_hierarchy ch
    JOIN steering_category sc ON sc.id = ch.child_category_id
    WHERE ch.parent_category_id = #{parentId}
      AND sc.enabled = TRUE AND sc.deleted = FALSE
    ORDER BY ch.sort_order ASC, sc.id ASC
</select>
```

### 3. 查分类下 active 规范摘要

```xml
<select id="listActiveByCategory" resultType="SteeringNavItem">
    SELECT id, title, tags, updated_at
    FROM steering
    WHERE category_id = #{categoryId}
      AND status = 'active'
      AND deleted = FALSE
    ORDER BY updated_at DESC
    LIMIT #{limit}
</select>
```

### 4. 查子节点 ID 列表（用于环检测 BFS）

```xml
<select id="selectChildIds" resultType="Long">
    SELECT child_category_id
    FROM category_hierarchy
    WHERE parent_category_id = #{parentId}
</select>
```

---

## DB Migration 脚本

路径：`docs/sql/migration_004_category_hierarchy.sql`

```sql
-- Feature 004: 分级 Category 导航 - DAG 关联表
-- ============================================================

CREATE TABLE IF NOT EXISTS category_hierarchy (
    parent_category_id  BIGINT  NOT NULL REFERENCES steering_category(id),
    child_category_id   BIGINT  NOT NULL REFERENCES steering_category(id),
    sort_order          INT     NOT NULL DEFAULT 0,
    PRIMARY KEY (parent_category_id, child_category_id),
    CONSTRAINT chk_no_self_loop CHECK (parent_category_id != child_category_id)
);

CREATE INDEX IF NOT EXISTS idx_cat_hier_parent
    ON category_hierarchy(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_cat_hier_child
    ON category_hierarchy(child_category_id);

-- 初始化：建立推荐的二级分类结构（先插入子分类，再建立关系）
-- 子分类 INSERT 见 quickstart.md，此处仅建立关系示例
-- INSERT INTO category_hierarchy VALUES (parent_id, child_id, sort_order);
```
