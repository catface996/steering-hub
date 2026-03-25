# Data Model: 分级 Category 导航

**Feature**: 004-hierarchical-category-navigation
**Phase**: 1 — Design
**Date**: 2026-03-25

---

## 结论：无需 DB Migration

`steering_category` 表已具备支撑本 Feature 所需的全部字段和索引，**不需要新建表、不需要迁移脚本**。

---

## 现有表（不修改）

### `steering_category` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL PK | 自增主键 |
| name | VARCHAR(100) NOT NULL | 分类显示名称 |
| code | VARCHAR(50) NOT NULL UNIQUE | 唯一编码，如 `coding`、`architecture` |
| description | TEXT | 分类描述 |
| **parent_id** | BIGINT FK→steering_category(id) | **父分类 ID；顶层分类此字段为 NULL** |
| **sort_order** | INT NOT NULL DEFAULT 0 | **同级排序权重，数值越小越靠前** |
| enabled | BOOLEAN NOT NULL DEFAULT TRUE | 是否启用 |
| created_at | TIMESTAMPTZ NOT NULL | 创建时间 |
| updated_at | TIMESTAMPTZ NOT NULL | 最后更新时间 |
| deleted | BOOLEAN NOT NULL DEFAULT FALSE | 软删除标记 |

**现有索引**:
```sql
-- 按 parent_id 查子节点（本 Feature 核心查询路径）
CREATE INDEX idx_steering_category_parent ON steering_category(parent_id);

-- 按 code 唯一查找（MCP client 支持按 category_code 搜索时使用）
CREATE INDEX idx_steering_category_code ON steering_category(code) WHERE deleted = FALSE;
```

### `steering` 表（相关字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL PK | 自增主键 |
| title | VARCHAR(500) NOT NULL | 规范标题 |
| **category_id** | BIGINT NOT NULL FK→steering_category(id) | **所属分类** |
| status | VARCHAR(20) | 状态：active / deprecated / draft 等 |
| tags | VARCHAR(500) | 逗号分隔标签 |
| updated_at | TIMESTAMPTZ NOT NULL | 最后更新时间 |
| deleted | BOOLEAN NOT NULL DEFAULT FALSE | 软删除标记 |

**现有索引**:
```sql
-- 按 category_id 查规范（本 Feature 核心查询路径）
CREATE INDEX idx_steering_category ON steering(category_id) WHERE deleted = FALSE;

-- 按 status 过滤（配合 category_id 的联合查询）
CREATE INDEX idx_steering_status ON steering(status) WHERE deleted = FALSE;
```

---

## 新增 DTO（Java 类）

### `CategoryNavItem`（新增）

路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/response/CategoryNavItem.java`

```java
@Data
public class CategoryNavItem {
    private Long id;
    private String name;
    private String code;
    private String description;
    private Integer childCount;  // 直接子分类数量
}
```

### `SteeringNavItem`（新增）

路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/response/SteeringNavItem.java`

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

### 查询子分类列表（含 childCount）

```xml
<select id="listChildrenWithCount" resultType="CategoryNavItem">
    SELECT
        c.id,
        c.name,
        c.code,
        c.description,
        (
            SELECT COUNT(*)
            FROM steering_category sub
            WHERE sub.parent_id = c.id
              AND sub.enabled = TRUE
              AND sub.deleted = FALSE
        ) AS child_count
    FROM steering_category c
    WHERE
        <choose>
            <when test="parentId != null and parentId > 0">
                c.parent_id = #{parentId}
            </when>
            <otherwise>
                c.parent_id IS NULL
            </otherwise>
        </choose>
        AND c.enabled = TRUE
        AND c.deleted = FALSE
    ORDER BY c.sort_order ASC, c.id ASC
</select>
```

### 查询分类下规范摘要列表

```xml
<select id="listActiveByCategory" resultType="SteeringNavItem">
    SELECT
        id,
        title,
        tags,
        updated_at
    FROM steering
    WHERE category_id = #{categoryId}
      AND status = 'active'
      AND deleted = FALSE
    ORDER BY updated_at DESC
    LIMIT #{limit}
</select>
```

---

## 查询性能分析

| 查询 | 使用索引 | 预期延迟（1w+ 数据） |
|------|---------|-------------------|
| 查子分类（WHERE parent_id=N） | `idx_steering_category_parent` | < 5ms |
| 查顶层分类（WHERE parent_id IS NULL） | `idx_steering_category_parent` | < 5ms |
| 子查询 childCount | `idx_steering_category_parent`（相关子查询） | 每行 < 2ms |
| 查规范摘要（WHERE category_id=N AND status='active'） | `idx_steering_category` + `idx_steering_status` | < 10ms |

> 分类层级通常 ≤ 3 层，子分类数量通常 ≤ 20，性能无忧。
