# Feature Specification: 仓库管理与规范绑定

**Feature Branch**: `003-repo-management`
**Created**: 2026-03-23
**Status**: Draft
**Input**: User description: "为 Steering Hub 实现代码仓库管理功能，支持仓库与规范的关系绑定，让代码仓库能够声明它需要遵守哪些规范，并支持基于仓库上下文的合规检查。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 注册与管理代码仓库 (Priority: P1)

平台管理员需要在 Steering Hub 中注册团队所有的代码仓库，统一维护仓库基本信息（名称、Git URL、负责人、所属团队），并可以随时启用或停用某个仓库。

**Why this priority**: 仓库管理是后续规范绑定和合规检查的基础数据，没有仓库注册则其他功能无法运转。

**Independent Test**: 管理员可以完整地完成"注册一个新仓库 → 查看仓库列表 → 编辑仓库信息 → 停用仓库"这一完整流程，所有操作均持久化且在刷新后仍有效。

**Acceptance Scenarios**:

1. **Given** 管理员进入仓库管理页面，**When** 填写仓库名称、Git URL、负责人、所属团队后提交，**Then** 新仓库出现在列表中，状态为 active。
2. **Given** 仓库列表中存在若干仓库，**When** 管理员按名称或团队进行筛选，**Then** 列表只显示符合条件的仓库。
3. **Given** 某个仓库处于 active 状态，**When** 管理员点击"停用"，**Then** 仓库状态变为 inactive，且在搜索结果和 MCP 工具中不再作为有效仓库上下文返回。
4. **Given** 管理员点击某仓库的"编辑"，**When** 修改描述或负责人后保存，**Then** 列表和详情均反映最新数据。
5. **Given** 管理员点击某仓库的"删除"，**When** 确认后，**Then** 仓库从列表中移除（软删除 `deleted=true`），对应的 repo_steering 绑定关系同步物理删除（hard delete），合规报告不受破坏。

---

### User Story 2 - 为仓库绑定规范 (Priority: P2)

团队负责人需要为某个仓库声明它必须（或建议）遵守哪些规范，从而让 AI Agent 和合规检查工具能够针对该仓库优先应用相关规范。

**Why this priority**: 规范绑定是区分"通用规范"和"仓库专属规范"的核心机制，直接决定 MCP 搜索增强和合规检查的上下文精准度。

**Independent Test**: 为一个仓库添加若干条规范绑定（含强制/非强制），在仓库详情页可以看到绑定列表，在某条规范的详情页也能看到引用该规范的仓库列表。

**Acceptance Scenarios**:

1. **Given** 仓库详情页已打开，**When** 管理员从规范列表中选择若干规范并设置是否强制，**Then** 绑定关系保存成功，仓库详情页展示绑定规范列表（含强制标识）。
2. **Given** 仓库已绑定若干规范，**When** 管理员解除某条规范的绑定，**Then** 该规范从仓库的绑定列表中移除，但规范本身及其他绑定关系不受影响。
3. **Given** 一条规范被多个仓库绑定，**When** 管理员查看该规范的详情或引用列表，**Then** 可以看到所有绑定该规范的仓库名称及是否强制。
4. **Given** 某仓库已有绑定规范，**When** 将某条已绑定规范的 mandatory 属性从"强制"改为"建议"，**Then** 更新成功，不产生重复绑定。

---

### User Story 3 - 基于仓库上下文的 MCP 搜索增强 (Priority: P3)

在某个仓库中工作的 Claude Code Agent 向 MCP 发起规范搜索时，可以附带仓库 ID，系统优先返回该仓库绑定的规范，帮助 Agent 优先找到与当前工作上下文相关的规范。

**Why this priority**: 这是对现有 MCP `search_steering` 工具的增量增强，前两个故事完成后才能充分发挥作用，且不应破坏现有无 repoId 的搜索行为。

**Independent Test**: 调用 `search_steering` 时传入 `repo`（仓库 full_name 字符串，如 `org/repo`），搜索结果中仓库绑定的规范得分高于未绑定的同类规范，排名靠前。不传 `repo` 时行为与现有完全一致。

**Acceptance Scenarios**:

1. **Given** 仓库 A（full_name: `org/repo-a`）已绑定规范 X（强制）和规范 Y（建议），**When** 以"查询关键字"和 `repo='org/repo-a'` 调用 search_steering，**Then** 规范 X 和 Y 在结果列表中排名高于其他语义相似但未绑定该仓库的规范。
2. **Given** 调用 search_steering 不传 `repo` 参数，**When** 执行搜索，**Then** 行为与当前完全一致，不受本次改动影响。
3. **Given** 传入的 `repo` full_name 不存在或对应仓库为 inactive，**When** 执行搜索，**Then** 忽略 `repo` 参数，返回正常搜索结果，不报错。
4. **Given** 仓库绑定了若干强制规范，**When** 以 `repo` 搜索，**Then** 强制规范的排名高于同仓库的非强制规范（同等语义相似度时）。

---

### Edge Cases

- 注册仓库时 `full_name`（唯一标识）重复，系统应拒绝并给出明确提示。
- 绑定规范时，规范状态为 deprecated 或 draft，系统应给出警告提示（仍允许绑定，但标记提醒）。
- 同一仓库对同一规范重复提交绑定，系统应幂等处理（更新 mandatory，不新增重复行）。
- 删除仓库时，已存在的 repo_steering 绑定关系需同步物理删除（hard delete，无 deleted 字段），不留孤儿数据。
- 当某仓库绑定规范数量极多（>100 条）时，绑定规范列表需分页显示。
- MCP 搜索结果总数上限由现有逻辑控制，repoId boost 不应导致结果数超限。

## Requirements *(mandatory)*

### Functional Requirements

**仓库管理**

- **FR-001**: 系统必须支持仓库的新增、查看、编辑、软删除操作。
- **FR-002**: 仓库必须记录以下信息：名称（name）、唯一全名（full_name）、描述（description）、Git URL（url）、编程语言（language）、所属团队（team）、启用状态（enabled: true=active / false=inactive）。
- **FR-003**: 系统必须支持按名称、团队、状态对仓库列表进行筛选，并支持分页。
- **FR-004**: 系统必须支持对仓库进行启用 / 停用操作，切换后立即对 MCP 搜索生效。
- **FR-005**: full_name 字段在系统范围内唯一，重复提交时返回明确错误。

**规范-仓库绑定**

- **FR-006**: 系统必须支持为仓库绑定多条规范，每条绑定带有 mandatory（是否强制）标记。
- **FR-007**: 系统必须支持查看某仓库绑定的全部规范列表（含 mandatory 标记）。
- **FR-008**: 系统必须支持查看某规范被哪些仓库引用（反向关联列表）。
- **FR-009**: 同一仓库对同一规范的绑定操作必须幂等——重复绑定时更新 mandatory 而非新增重复记录。
- **FR-010**: 解除绑定操作不影响规范本身及其他仓库的绑定关系。

**MCP 搜索增强**

- **FR-011**: `search_steering` MCP 工具必须新增可选参数 `repo`（字符串，即仓库 full_name，格式如 `org/repo`）；MCP Server 仅将 `repo` 参数透传至后端搜索 API，不在 MCP 层执行任何 boost 计算；后端通过 full_name 精确匹配仓库记录。
- **FR-012**: 当传入有效 `repo` 时，**boost 逻辑由后端 Java `SearchService` 层实现**：搜索结果以相似度为主排序维度，绑定关系为次排序维度；相似度相同时绑定规范排在未绑定规范之前，强制（mandatory）绑定排在非强制绑定之前；高相似度未绑定规范仍可排在低相似度绑定规范之前。
- **FR-013**: 不传 `repo` 或 `repo` 对应仓库不存在 / 为 inactive 时，搜索行为与现有逻辑完全一致。
- **FR-014**: 前端新增仓库表单中，当用户在 Git URL 字段输入内容时，系统应实时解析 URL 并预填 full_name 字段（如 `https://github.com/org/repo` → `org/repo`）；用户可手动修正预填内容。

### Key Entities

- **Repo（仓库）**: 代码仓库的注册记录，包含名称、唯一全名、Git URL、负责人、所属团队、启用状态；已存在于数据库，需扩展前端管理入口。
- **RepoSteering（仓库-规范绑定）**: 多对多关联表，记录某仓库绑定了哪条规范，以及该绑定是否为强制（mandatory）；需新建。**表不含 deleted 字段，绑定解除时物理删除（hard delete）。**
- **Steering（规范）**: 已有实体，需扩展反向关联查询（被哪些仓库引用）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 管理员可在 2 分钟内完成新仓库注册并为其绑定至少 3 条规范。
- **SC-002**: 在相同搜索 query 下，相似度分差 < 0.05 的规范中，mandatory 绑定规范排名高于未绑定规范。
- **SC-003**: 不传 repo（full_name 字符串）的现有搜索在本次改动后返回结果与改动前完全一致（100% 回归通过）。
- **SC-004**: 仓库列表、绑定规范列表、规范引用仓库列表均支持分页，单页响应时间在数据量 1000+ 条时不超过 2 秒。
- **SC-005**: 重复绑定同一规范时，系统返回成功且数据库中不产生重复记录（幂等率 100%）。

## Assumptions

- 系统暂无角色权限控制，所有已登录用户均可执行仓库管理和绑定操作（与现有规范管理权限模型一致）。
- `repo` 表已存在（字段：id, name, full_name, description, url, language, team, enabled, created_at, updated_at, deleted），本功能在此基础上扩展，不修改已有字段语义。
- 规范绑定只针对状态为 active 的规范生效于 MCP boost，但允许绑定任意状态的规范（含 draft/deprecated），届时给出界面提示。
- MCP `search_steering` boost 策略为**复合排序**：相似度为主排序维度，绑定关系为次排序维度。即先按相似度正常召回并排序，在相似度相同（或相近浮点值相等）时，绑定规范优先于未绑定规范，强制（mandatory）绑定优先于非强制绑定；高相似度的未绑定规范仍可排在低相似度的绑定规范之前。
- 仓库删除采用软删除（`deleted=true`），与现有规范管理一致。`repo_steering` 绑定表**不加 deleted 字段**，解绑和仓库软删除时均物理删除对应绑定行（hard delete）。
- 前端与现有 steering-hub 风格一致（Ant Design + 暗色主题），复用现有 `useHeader`、`Pagination` 等组件。

## Clarifications

### Session 2026-03-23

- Q: MCP `search_steering` 传入 repoId 时，如何对绑定规范进行排名提升（boost 机制）？ → A: 复合排序（修订）：相似度为主排序维度，绑定关系为次排序维度；相似度相同时绑定规范（mandatory 优先）靠前，但高相似度未绑定规范仍可排在低相似度绑定规范之前。
- Q: MCP `search_steering` 通过什么参数标识仓库上下文，类型是什么？ → A: 新增可选参数 `repo`（字符串），传入仓库 full_name（如 `org/repo`）；后端通过精确匹配 full_name 字段找到对应仓库。
- Q: 前端新增仓库表单中，full_name 字段如何填入？ → A: 用户输入 Git URL 时实时解析预填 full_name（如 `https://github.com/org/repo` → `org/repo`），用户可手动修正。
- Q: repo_steering 绑定关系解除时是软删除还是物理删除？ → A: 物理删除（hard delete），repo_steering 表不加 deleted 字段；仓库软删除时同步物理删除其所有绑定行。
- Q: MCP boost 逻辑在哪一层实现？MCP Server 是否参与 boost 计算？ → A: boost 逻辑完全由后端 Java `SearchService` 层实现，MCP Server 仅将 `repo` 参数透传至后端 API，不在 MCP 层执行任何排序或 boost 计算。
