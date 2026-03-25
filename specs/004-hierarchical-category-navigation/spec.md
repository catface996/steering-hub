# Feature Specification: 分级 Category 导航（DAG 方案）

**Feature Branch**: `004-hierarchical-category-navigation`
**Created**: 2026-03-25
**Revised**: 2026-03-25 (rev 2: 改用 DAG 多对多关联表，保留 tags 正交性)
**Status**: Draft
**Input**: User description: "为 Steering Hub 新增分级分类导航功能，让 AI Agent 可以通过树形分级目录来精准浏览规范，作为关键词搜索的补充路径，提升规范发现的准确性。使用 DAG 而非单亲树，保留现有 tags 不变。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent 通过分级导航浏览分类 DAG (Priority: P1)

AI Coding Agent 在不确定搜索关键词时，需要先浏览顶层分类列表，然后逐级展开子分类，最终定位到目标分类，以便在该分类下查看全部规范，而不是依赖关键词搜索。分类支持多父节点（DAG），一个子分类可出现在多个父分类下。

**Why this priority**: 这是本 Feature 的核心路径，没有分类浏览则导航无从谈起。

**Independent Test**: 调用 `list_categories()`（不传 parent_id）返回顶层分类列表；再调用 `list_categories(parent_id=N)` 返回某父节点的子分类；每层返回分类的 id、name、code、description、childCount、sortOrder。

**Acceptance Scenarios**:

1. **Given** 系统已通过 `category_hierarchy` 建立了层级关系，**When** Agent 调用 `list_categories()` 不传 parent_id，**Then** 返回所有顶层分类（在 `category_hierarchy` 中无父节点的分类），按 `sort_order` 升序排列，每项包含 id、name、code、childCount。
2. **Given** 某分类在 `category_hierarchy` 中有 3 条子关系，**When** Agent 调用 `list_categories(parent_id=N)`，**Then** 返回这 3 个直接子分类，childCount 反映各自的下一级子分类数量。
3. **Given** 某分类同时是 A 和 B 两个父分类的子节点，**When** 分别调用 `list_categories(parent_id=A)` 和 `list_categories(parent_id=B)`，**Then** 两次调用都返回该分类（正常 DAG 行为）。
4. **Given** 某分类为叶节点（无子分类），**When** 调用 `list_categories(parent_id=N)`，**Then** 返回空数组，不报错。
5. **Given** 传入的 parent_id 不存在，**When** 调用 `list_categories(parent_id=999)`，**Then** 返回空数组，不报错。
6. **Given** 某分类 enabled=false 或 deleted=true，**When** 调用导航接口，**Then** 该分类不出现在返回结果中。

---

### User Story 2 - Agent 查看某分类下的规范列表 (Priority: P1)

Agent 定位到目标分类后，需要获取该分类下所有「已生效」规范的摘要列表（title、id、tags），用于进一步调用 `get_steering` 查看完整内容。

**Why this priority**: 与 User Story 1 并列为核心路径，浏览到分类后必须能获取该分类规范。

**Independent Test**: 调用 `list_steerings(category_id=N)` 返回该分类下 active 状态的规范摘要（id、title、tags、updatedAt）；非 active 规范不出现；limit 参数可控；tags 字段原样返回，不做任何处理。

**Acceptance Scenarios**:

1. **Given** 分类 N 下有 5 条 active 规范、2 条 draft 规范，**When** Agent 调用 `list_steerings(category_id=N)`，**Then** 仅返回 5 条 active 规范，按 updated_at 降序排列。
2. **Given** 分类 N 下规范数量超过默认 limit（10 条），**When** 不传 limit，**Then** 返回最多 10 条；**When** 传 limit=20，**Then** 返回最多 20 条（上限 50）。
3. **Given** 传入不存在的 category_id，**When** 调用 `list_steerings(category_id=9999)`，**Then** 返回空数组，不报错。
4. **Given** 分类 N 下的规范有多个 tags（如 `"Java,SpringBoot,DDD"`），**When** 调用 `list_steerings`，**Then** tags 字段原样返回（逗号分隔字符串），不拆分也不过滤。

---

### User Story 3 - 管理员建立分类层级关系 (Priority: P2)

平台管理员需要通过 Web API 在现有分类之间建立父子关系，从而构建分类 DAG，同时系统自动防止形成有向环（循环引用）。

**Why this priority**: 没有管理接口，导航树无法建立，P1 故事将无数据可用。

**Independent Test**: 调用 `POST /api/v1/web/category-hierarchy` 建立关系；尝试建立会成环的关系时返回 400；`DELETE` 时删除成功且幂等。

**Acceptance Scenarios**:

1. **Given** 分类 A 和分类 B 均已存在，**When** 管理员 POST `{parentCategoryId: A, childCategoryId: B}`，**Then** 关系建立成功，`list_categories(parent_id=A)` 返回 B。
2. **Given** 已存在 A→B 和 B→C 关系，**When** 尝试建立 C→A（会形成环），**Then** 返回 400 CYCLE_DETECTED，A→B→C 关系不受影响。
3. **Given** 已存在 A→B 关系，**When** 重复 POST 相同关系，**Then** 返回成功（幂等，不报错，不重复插入）。
4. **Given** 已存在 A→B 关系，**When** DELETE `{parentCategoryId: A, childCategoryId: B}`，**Then** 删除成功；`list_categories(parent_id=A)` 不再返回 B。
5. **Given** A→B 关系不存在，**When** DELETE 该关系，**Then** 返回成功（幂等 DELETE）。

---

### User Story 4 - 搜索与导航并行使用（tags 正交性） (Priority: P2)

Agent 工作流中，`search_steering`（tags 维度）和 `list_categories + list_steerings`（category 维度）是两条并行路径，互不干扰。tags 字段完全不受本 Feature 改动影响。

**Acceptance Scenarios**:

1. **Given** 现有 `search_steering` 逻辑，**When** 本 Feature 上线，**Then** `search_steering` 代码、接口签名、返回结果与改动前 100% 一致（zero regression）。
2. **Given** 规范 X 同时有 tags="Java,Controller" 且 category_id 指向"Java 后端"分类，**When** 调用 `search_steering(tags=["Controller"])` 和 `list_steerings(category_id=<java-backend-id>)`，**Then** 两个路径都能找到规范 X，互不影响。

---

### Edge Cases

- `parent_id=0` 等价于 `parent_id=null`：均返回顶层分类（DAG 中无父节点的分类）。
- 分类 `enabled=false`：不在导航中展示，也不计入 childCount。
- `list_steerings` 的 `limit` 超出 [1, 50] 范围时 Clamp 处理，不报 400。
- DAG 中同一分类可有多个父节点，`list_categories(parent_id=A)` 只返回 A 的直接子节点，不去重（子节点在不同 parent 下独立出现是预期行为）。
- `steering.tags` 字段不受任何改动，相关搜索逻辑不受影响。

## Requirements *(mandatory)*

### Functional Requirements

**分类导航（MCP 工具）**

- **FR-001**: MCP 必须提供 `list_categories` 工具；`parent_id` 未传或为 0 时返回顶层分类（`category_hierarchy` 中无父节点的分类）；传正整数时返回该节点的直接子分类。
- **FR-002**: `list_categories` 返回的每个分类节点必须包含：id、name、code、description、childCount、sortOrder。
- **FR-003**: 返回列表按 `sort_order` 升序、`id` 升序；仅返回 `enabled=true AND deleted=false` 的分类。
- **FR-004**: MCP 必须提供 `list_steerings` 工具；接受必填参数 `category_id`、可选参数 `limit`（1~50，默认 10）。
- **FR-005**: `list_steerings` 仅返回 `status='active' AND deleted=false` 的规范；字段：id、title、tags（原始逗号分隔字符串，不拆分）、updatedAt。
- **FR-006**: `list_steerings` 按 `updated_at` 降序排列。
- **FR-007**: 现有 `search_steering` 工具和相关后端接口、`steering.tags` 字段、tags 相关查询逻辑**不得有任何改动**（只增不改）。

**分类关系管理（Web API）**

- **FR-008**: `POST /api/v1/web/category-hierarchy` 建立父子关系，插入前必须执行环检测，成环时返回 400 CYCLE_DETECTED。
- **FR-009**: 重复 POST 相同 `(parentCategoryId, childCategoryId)` 必须幂等（不报错，不重复插入）。
- **FR-010**: `DELETE /api/v1/web/category-hierarchy` 物理删除一条关系，幂等（不存在时返回成功）。

**后端 MCP 端点**

- **FR-011**: `GET /api/v1/mcp/categories?parent_id={N}` 实现 FR-001~FR-003 的查询逻辑。
- **FR-012**: `GET /api/v1/mcp/steerings?category_id={N}&limit={L}` 实现 FR-004~FR-006 的查询逻辑。

### Key Entities

- **CategoryHierarchy（分类父子关系）**: **新增**，多对多关联表，`PRIMARY KEY(parent_category_id, child_category_id)`，含环检测。
- **SteeringCategory（规范分类）**: 已有，不修改；`parent_id` 字段保留但不在本 Feature 中使用。
- **Steering（规范）**: 已有，`category_id` 和 `tags` 字段均不修改。

## Success Criteria *(mandatory)*

- **SC-001**: Agent 可在 3 次 MCP 调用内（`list_categories` × 2 + `list_steerings` × 1）定位并获取任意分类下的规范列表。
- **SC-002**: 添加会成环的关系时，系统返回 400 CYCLE_DETECTED，现有关系不受影响。
- **SC-003**: `search_steering` 的返回结果与本 Feature 上线前完全一致（zero regression）。
- **SC-004**: `list_steerings` 默认 limit=10，最大 50，每条仅返回摘要（不含 content）。
- **SC-005**: `POST category-hierarchy` 幂等：重复提交同一关系不产生重复行，返回成功。

## Assumptions

- 现有 `steering_category` 表 6 个分类全部平铺（`parent_id` 均为 NULL），需通过 `migration_004` 新建 `category_hierarchy` 表并初始化子分类和关系数据。
- `steering_category.parent_id` 字段保留但不在本 Feature 中使用（不设置也不查询）。
- `steering.tags` 字段和所有 tags 相关逻辑完全不受本 Feature 影响（正交维度）。
- 分类总数通常 < 100，环检测 BFS 遍历开销可忽略（< 1ms）。
- 前端分类树管理 UI 为可选后续工作，不在本 Feature 范围内。

## Clarifications

### Session 2026-03-25 (rev 2)

- Q: 为什么改用 DAG 而非 `steering_category.parent_id` 单亲树？→ A: 数据审计发现所有分类均平铺（无层级），且某些子分类（如"MyBatisPlus 规范"）语义上属于多个父分类，DAG 表达更精确；`parent_id` 字段虽然存在，但没有任何已用数据，改动成本为零。
- Q: tags 和 category_hierarchy 是什么关系？→ A: 完全正交。tags = 技术栈维度（Java、React、Controller 等），category_hierarchy = 架构分层维度（Java 后端、前端等）。两者均可独立使用，也可组合（先导航到分类，再在分类内按 tags 搜索）。
- Q: `steering.tags` 会被修改吗？→ A: **绝对不会**。`search_steering(tags=[...])` 完全不感知 `category_hierarchy`，行为 100% 不变。
- Q: 为什么需要环检测？→ A: DAG 允许多父节点但不允许有向环（循环引用）。若 A→B→C→A 成环，`getAllDescendants` 将无限循环，必须在插入时拒绝。
- Q: 为什么用幂等 INSERT 而非先查后写？→ A: `PRIMARY KEY(parent, child)` 保证唯一性，重复插入直接忽略（ON CONFLICT DO NOTHING），减少竞态条件。
