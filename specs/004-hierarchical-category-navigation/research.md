# Research: 分级 Category 导航

**Feature**: 004-hierarchical-category-navigation
**Phase**: 0 — Research
**Date**: 2026-03-25

---

## 1. 现有分类表结构确认

**Decision**: 直接使用现有 `steering_category` 表，无需 migration。
**Rationale**: 表已有 `parent_id`（树形结构）、`sort_order`（同级排序）、`enabled`、`deleted` 字段及 `idx_steering_category_parent` 索引，完全满足本 Feature 需求。
**Confirmed fields**: `id`, `name`, `code`, `description`, `parent_id`, `sort_order`, `enabled`, `created_at`, `updated_at`, `deleted`

---

## 2. 分类导航策略：逐级懒加载 vs 完整树一次返回

**Decision**: 逐级懒加载——`list_categories(parent_id?)` 每次只返回直接子节点。
**Rationale**:
- 完整树返回在分类数量大时会产生大量 token 消耗，对 Agent 不友好。
- 逐级加载让 Agent 按需获取数据，通常 2~3 次调用即可定位目标分类。
- 与浏览器 Tree 组件懒加载模式一致，概念简单。

**Alternatives considered**:
- 一次返回完整树（`/api/v1/mcp/categories/tree`）：token 消耗不可控，分类多时响应体巨大。
- 提供"路径导航"接口（按 code 或 path 查询）：增加接口数量，Agent 需记更多工具。

---

## 3. 新工具 vs 复用现有 get_steering_tags

**Decision**: 新增两个独立工具 `list_categories` 和 `list_steerings`，不修改 `get_steering_tags`。
**Rationale**:
- `get_steering_tags` 返回的是 tag 列表（非分类树），语义不同，不宜混用。
- 新工具职责清晰：`list_categories` = 导航树，`list_steerings` = 按分类取规范。
- 保持现有工具不变，zero regression。

**get_steering_tags 现有能力（保留）**:
- 不传 category_code → 返回所有分类概览（tag 数量、规范数量）
- 传 category_code → 返回该分类下的 tag 列表

---

## 4. Controller 位置：新 Controller vs 扩展现有 Controller

**Decision**: 新建 `CategoryNavController` 处理 `/api/v1/mcp/categories` 和 `/api/v1/mcp/steerings` 两个接口。
**Rationale**:
- `SteeringCategoryController` 当前路径为 `/api/v1/web/categories`，专属 Web 管理端。
- MCP 专用接口放在独立 Controller 更清晰，职责分离；路径前缀也不同（`/mcp/` vs `/web/`）。
- `SteeringController` 当前路径为 `/api/v1/web/steerings`，不混入 MCP 用途的端点。

**Alternatives considered**:
- 在 `SteeringCategoryController` 增加 `@GetMapping("/api/v1/mcp/categories")` 方法：会出现同一 Controller 承载不同路径前缀的情况，混乱。
- 在 `SteeringController` 增加 `list by category` 方法：`SteeringController` 职责是规范 CRUD，不应承载导航语义。

---

## 5. list_steerings 返回字段设计

**Decision**: 仅返回 id、title、tags、updatedAt，不含 content。
**Rationale**:
- content 字段通常为长 Markdown 文档，一次返回多条会消耗大量 token。
- Agent 获取列表后，可按需调用 `get_steering(id)` 获取完整内容。
- 与 `search_steering` 返回格式保持一致（search 也返回摘要而非全文）。

---

## 6. limit 上限设计

**Decision**: `list_steerings` 的 limit 默认 10，上限 50（Clamp 处理，不报错）。
**Rationale**:
- 默认 10 条覆盖大多数使用场景（大多数分类规范 < 20 条）。
- 上限 50 防止单次返回内容过多，同时提供足够弹性。
- Clamp 处理（而非报错）对 Agent 更友好，减少重试成本。

---

## 7. parent_id=0 的处理

**Decision**: `parent_id=0` 等价于 `parent_id=null`，均返回顶层分类。
**Rationale**:
- MCP 工具 inputSchema 中 parent_id 类型为 integer，部分 Agent 可能传 0 表示"根节点"。
- SQL 层统一处理：`parent_id=0` 时转为 `WHERE parent_id IS NULL`，避免 Agent 出错。

---

## 8. 现有 SteeringCategoryService 评估

**Current state**:
- `listTree()` 方法已存在，但返回完整树（非逐级）
- 内部实现未使用 XML Mapper（可能使用 QueryWrapper，待确认）

**Decision**: 新服务方法 `listChildren(Long parentId)` 和 `listActiveSteeringsByCategory(Long categoryId, int limit)` 使用 XML Mapper 实现，不复用 `listTree()`。
**Rationale**: 合规 Constitution III，新增查询方法必须通过 XML Mapper；`listTree()` 为既有代码不在修改范围。
