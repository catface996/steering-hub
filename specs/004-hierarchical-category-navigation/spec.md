# Feature Specification: 分级 Category 导航

**Feature Branch**: `004-hierarchical-category-navigation`
**Created**: 2026-03-25
**Status**: Draft
**Input**: User description: "为 Steering Hub 新增分级分类导航功能，让 AI Agent 可以通过树形分级目录来精准浏览规范，作为关键词搜索的补充路径，提升规范发现的准确性。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent 通过分级导航浏览分类树 (Priority: P1)

AI Coding Agent 在不确定搜索关键词时，需要先浏览顶层分类列表，然后逐级展开子分类，最终定位到目标分类，以便在该分类下查看全部规范，而不是依赖关键词搜索。

**Why this priority**: 这是本 Feature 的核心路径，没有分类浏览则导航无从谈起。

**Independent Test**: 调用 `list_categories()`（不传 parent_id）返回顶层分类列表；再调用 `list_categories(parent_id=N)` 返回某父节点的子分类；每层返回分类的 id、name、code、description、childCount。

**Acceptance Scenarios**:

1. **Given** 系统已有多个顶层分类（如 coding、architecture、business），**When** Agent 调用 `list_categories()` 不传 parent_id，**Then** 返回所有顶层分类（parent_id 为 NULL），按 sort_order 升序排列，每项包含 id、name、code、childCount。
2. **Given** 某顶层分类下有 3 个子分类，**When** Agent 调用 `list_categories(parent_id=N)`，**Then** 返回这 3 个子分类，childCount 反映各自的下一级子分类数量。
3. **Given** 某分类为叶节点（无子分类），**When** 调用 `list_categories(parent_id=N)`，**Then** 返回空数组，不报错。
4. **Given** 传入的 parent_id 不存在，**When** 调用 `list_categories(parent_id=999)`，**Then** 返回空数组，不报错。
5. **Given** 某分类已被软删除（deleted=true）或 enabled=false，**When** 调用 `list_categories()`，**Then** 该分类不出现在返回结果中。

---

### User Story 2 - Agent 查看某分类下的规范列表 (Priority: P1)

Agent 定位到目标分类后，需要获取该分类下所有「已生效」规范的摘要列表（title、id、tags），用于进一步调用 `get_steering` 查看完整内容。

**Why this priority**: 与 User Story 1 并列为核心路径，浏览到分类后必须能获取该分类规范。

**Independent Test**: 调用 `list_steerings(category_id=N)` 返回该分类下 active 状态的规范列表（含 id、title、tags、updatedAt）；非 active 规范不出现；支持 limit 参数控制条数。

**Acceptance Scenarios**:

1. **Given** 分类 N 下有 5 条 active 规范、2 条 draft 规范，**When** Agent 调用 `list_steerings(category_id=N)`，**Then** 仅返回 5 条 active 规范，按 updated_at 降序排列。
2. **Given** 分类 N 下规范数量超过默认 limit（10 条），**When** 不传 limit，**Then** 返回最多 10 条；**When** 传 limit=20，**Then** 返回最多 20 条（上限 50）。
3. **Given** 传入不存在的 category_id，**When** 调用 `list_steerings(category_id=9999)`，**Then** 返回空数组，不报错。
4. **Given** 分类 N 下无任何 active 规范，**When** 调用 `list_steerings(category_id=N)`，**Then** 返回空数组。

---

### User Story 3 - 搜索与导航并行使用 (Priority: P2)

Agent 工作流中，搜索（search_steering）和导航（list_categories + list_steerings）是两条并行路径，Agent 可根据任务上下文自由选择：已知关键词时优先用搜索，分类结构已知时优先用导航，两者互不干扰。

**Why this priority**: 确保改动不破坏现有搜索路径，新功能作为补充而非替换。

**Independent Test**: 改动上线后，`search_steering` 的返回结果与改动前完全一致（100% 向后兼容）；同时可与 `list_categories` + `list_steerings` 组合使用而无冲突。

**Acceptance Scenarios**:

1. **Given** 现有 `search_steering` 逻辑，**When** 本 Feature 上线，**Then** 不修改 `search_steering` 的任何代码或接口签名，行为 100% 向后兼容。
2. **Given** Agent 先调用 `list_categories` 确定分类，再调用 `search_steering` 传入 `category_code`，**Then** 两工具配合使用可进一步缩小搜索范围，无错误。

---

### Edge Cases

- `parent_id=0` 与 `parent_id=null`：均视为查询顶层分类（parent_id IS NULL），对 Agent 友好。
- 分类 enabled=false：不在导航中展示（与搜索 category_code 过滤一致）。
- `list_steerings` 的 `limit` 上限为 50，防止单次返回内容过多消耗 token。
- 同一个规范不会重复出现（一对一 category_id）。

## Requirements *(mandatory)*

### Functional Requirements

**分类导航**

- **FR-001**: MCP 必须提供 `list_categories` 工具，接受可选参数 `parent_id`（整数）；未传或传 0 时返回顶层分类（`parent_id IS NULL`）；传正整数时返回该节点的直接子分类。
- **FR-002**: `list_categories` 返回的每个分类节点必须包含：id、name、code、description（可选）、childCount（直接子分类数量）。
- **FR-003**: 返回列表按 `sort_order` 升序、`id` 升序排列；仅返回 `enabled=true` 且 `deleted=false` 的分类。
- **FR-004**: MCP 必须提供 `list_steerings` 工具，接受必填参数 `category_id`（整数）和可选参数 `limit`（1~50，默认 10）。
- **FR-005**: `list_steerings` 仅返回 `status='active'` 且 `deleted=false` 的规范；每条记录包含：id、title、tags、updatedAt。
- **FR-006**: `list_steerings` 返回列表按 `updated_at` 降序排列。
- **FR-007**: 现有 `search_steering` 工具和相关后端接口不得有任何改动（只增不改）。

**后端接口**

- **FR-008**: 新增 `GET /api/v1/mcp/categories?parent_id={N}` 接口，返回直接子分类列表（含 childCount），供 MCP Server 调用。
- **FR-009**: 新增 `GET /api/v1/mcp/steerings?category_id={N}&limit={L}` 接口，返回分类下 active 规范摘要列表，供 MCP Server 调用。

### Key Entities

- **SteeringCategory（规范分类）**: 已有，`parent_id` 字段支持树形结构，`sort_order` 支持同级排序。无需 schema 变更。
- **Steering（规范）**: 已有，`category_id` 外键关联分类。无需 schema 变更。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Agent 可在 3 次 MCP 工具调用内（`list_categories` × 2 + `list_steerings` × 1）定位并获取任意叶节点分类下的规范列表。
- **SC-002**: `list_categories` 和 `list_steerings` 在分类和规范总量 10,000+ 条时，响应时间 p95 < 500ms（基于现有 PostgreSQL 索引）。
- **SC-003**: 改动上线后，`search_steering` 的行为与改动前完全一致（zero regression）。
- **SC-004**: `list_steerings` 单次返回 token 消耗可控：默认 limit=10，最大 50，每条规范仅返回摘要字段（不含 content）。

## Assumptions

- `steering_category` 表已有 `parent_id`、`sort_order`、`enabled`、`deleted` 字段及 `idx_steering_category_parent` 索引，无需 DB migration。
- `steering` 表已有 `category_id`、`status`、`deleted` 字段及相关索引，无需 DB migration。
- 仅 MCP 通道（`/api/v1/mcp/` 路由前缀）暴露分级导航接口；Web 管理端已有 `listTree()` 接口，不修改。
- 分类层级深度通常为 2~3 层，逐级懒加载策略（按需查询子节点）优于一次性返回完整树（避免过大响应）。
- 前端分类树导航为可选后续工作，不在本 Feature 范围内。

## Clarifications

### Session 2026-03-25

- Q: 为什么不提供 `list_subcategories` 而是复用 `list_categories(parent_id)`？→ A: 统一一个工具减少 Agent 记忆负担；parent_id 参数自然表达"查某节点的子节点"语义。
- Q: 为什么不提供"一次返回完整树"的接口？→ A: 完整树可能包含数百节点，消耗大量 token；逐级懒加载让 Agent 按需取数据，控制 token 开销。
- Q: `list_steerings` 为什么不包含 content？→ A: content 通常较长；Agent 获取列表后可选择调用 `get_steering` 获取完整内容，避免一次性传输大量文本。
- Q: 是否需要 DB migration？→ A: 否。`steering_category.parent_id` 和 `steering_category.sort_order` 已存在于 `init.sql`，现有索引 `idx_steering_category_parent` 已支持按 parent_id 查询。
