# Feature Specification: 规范版本管理与搜索行为优化

**Feature Branch**: `002-version-history-search`
**Created**: 2026-03-22
**Status**: Draft
**Input**: User description: "规范版本管理与搜索行为优化"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 搜索始终返回 active 版本 (Priority: P1)

AI 编码助手（或开发者）通过 MCP 搜索接口查询规范时，即使某条规范正处于修订审批流程中（pending_review），搜索结果也应返回该规范当前仍在生效的 active 版本，而不是尚未审批通过的新版本草稿。

**Why this priority**: 这是核心问题修复。搜索返回未审批内容会导致 AI Agent 使用未经审核的规范指导代码生成，直接影响代码质量与合规性。

**Independent Test**: 创建一条 active 规范，提交修订使其进入 pending_review 状态，执行搜索，验证返回内容与旧 active 版本一致，可独立验证且交付明确价值。

**Acceptance Scenarios**:

1. **Given** 一条规范同时拥有 active 版本（v1）和 pending_review 版本（v2），**When** 通过搜索接口查询该规范相关内容，**Then** 返回 v1 的内容，v2 不出现在结果中。
2. **Given** 一条规范仅有 active 版本（无 pending_review），**When** 执行搜索，**Then** 正常返回该规范内容，行为与现有一致。
3. **Given** 一条规范仅有 pending_review 版本（从未被 activate），**When** 执行搜索，**Then** 该规范不出现在搜索结果中。
4. **Given** 一条规范的新版本已被 approve 并 activate，**When** 执行搜索，**Then** 返回新 active 版本内容，旧版本不再出现。

---

### User Story 2 - Embedding 向量锁定在 active 版本内容 (Priority: P2)

当规范提交修订（进入 pending_review）时，系统不重新生成 embedding 向量。Embedding 始终反映当前 active 版本的内容，确保语义搜索的一致性与可靠性。

**Why this priority**: Embedding 是语义搜索的基础。若 embedding 随 pending_review 内容更新，语义搜索会"偷跑"未审批内容，破坏审批管控。此项与 P1 紧密配合，但可独立在后端验证。

**Independent Test**: 提交规范修订后，验证 `content_embedding` 字段未发生变化（与修订前一致），可通过比对哈希值或直接查询向量确认。

**Acceptance Scenarios**:

1. **Given** 一条规范处于 active 状态且已有 embedding，**When** 提交修订使其进入 pending_review，**Then** 该规范的 embedding 向量保持不变。
2. **Given** 一条规范的修订版本被 activate，**When** activate 操作完成，**Then** 系统基于新版本内容重新生成 embedding 向量；若 embedding 生成失败，整个 activate 事务回滚，activate 不成功。
3. **Given** 一条规范被 deprecated，**When** 查询其 embedding，**Then** embedding 仍保留（不删除），但该规范不再出现在搜索结果中。

---

### User Story 3 - 查看规范版本历史列表 (Priority: P3)

规范管理员或开发者打开规范详情页时，可以在"版本历史"标签页查看该规范所有历史版本的摘要信息（版本号、状态、修改时间），了解规范的演进轨迹。

**Why this priority**: 版本可追溯是合规管理的基本要求。此功能为只读展示，不影响主流程，可独立开发。

**Independent Test**: 一条经过多次修订的规范，在详情页"版本历史"Tab 中应列出所有历史版本条目，可独立测试展示逻辑。

**Acceptance Scenarios**:

1. **Given** 一条规范经历了 v1（active→superseded）、v2（active）两个版本，**When** 打开该规范详情页并切换到版本历史 Tab，**Then** 显示两条记录，包含版本号、状态标签、更新时间，按版本号倒序排列。
2. **Given** 一条从未修订的规范（只有 v1 active），**When** 打开版本历史 Tab，**Then** 仅显示一条记录。
3. **Given** 版本历史列表，**When** 点击任意历史版本，**Then** 可查看该版本的完整内容（只读模式，无编辑入口）。

---

### User Story 4 - 版本状态自动流转（superseded）(Priority: P4)

当规范新版本被 activate 时，原 active 版本自动变为 superseded 状态，无需人工操作，系统自动完成状态切换，保证任意时刻一条规范只有一个 active 版本。

**Why this priority**: 这是版本一致性的数据层保障，是 P1/P3 正确运行的前提，但本身是后台自动行为，用户无感知，属于基础保障层。

**Independent Test**: 触发 activate 操作后，查询数据库确认旧版本状态变为 superseded、新版本状态变为 active，且全表只有一条 active 记录。

**Acceptance Scenarios**:

1. **Given** 规范 A 的 v1 处于 active 状态，v2 处于 approved 状态，**When** 执行 activate(v2)，**Then** v1 状态变为 superseded，v2 状态变为 active。
2. **Given** 已有 active 版本的规范，**When** 尝试直接将另一个版本设为 active（绕过流程），**Then** 系统拒绝操作，返回错误提示。
3. **Given** 规范同时存在 superseded 版本和 active 版本，**When** 该规范再次被 deprecated，**Then** active 版本变为 deprecated，superseded 版本状态保持不变。

---

### Edge Cases

- 当规范从未进入过 active 状态（一直在 draft/pending_review/approved 之间流转）时，版本历史 Tab 显示现有版本记录，搜索中不出现。
- 当规范被 deprecated 后，用户提交新修订进入 pending_review：系统允许，但搜索中不返回（因无 active 版本）。
- 并发场景：两个管理员同时尝试 activate 同一规范的不同版本，通过 `steering` 主表 `lock_version` 字段实现乐观锁控制；后到的请求检测到版本冲突后返回 409 错误，提示用户刷新后重试。
- 已有大量历史版本（如 50+ 个版本）的规范：版本历史列表使用 `Pagination.tsx` 组件分页（total>20 时显示），避免性能问题。
- 数据迁移：现有 active 规范需自动生成其对应的 v1 版本历史记录，不丢失任何数据。
- withdraw 场景：pending_review 版本被撤回后状态变为 draft，此时允许再次提交修订。

## Clarifications

### Session 2026-03-22

- Q: activate 时 Embedding 生成失败应如何处理？ → A: 事务回滚，activate 整体失败
- Q: 并发 activate 冲突如何解决？ → A: 乐观锁，`steering` 主表新增 `lock_version` 字段
- Q: steering_version 版本记录存储方式？ → A: 完整内容快照（每版本独立存储 title/content/tags 全量数据）
- Q: withdraw（撤回 pending_review 版本）操作是否纳入范围？ → A: 纳入范围
- Q: steering 主表与 steering_version 的内容关系？ → A: 保留 content/embedding 作为热缓存，steering_version 存历史快照
- Q: steering_version 表包含哪些字段？ → A: id, steering_id, version_number, title, content, tags, status, change_summary, created_at, updated_at

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 搜索接口（包括语义搜索和全文搜索）MUST 仅返回状态为 active 的规范版本内容。
- **FR-002**: 系统 MUST 在规范提交修订（重新进入 pending_review）时，不更新该规范的 embedding 向量。
- **FR-003**: 系统 MUST 在规范新版本被 activate 时，基于新版本内容重新生成 embedding 向量；若 embedding 生成失败，整个 activate 操作事务回滚，activate 不成功。
- **FR-004**: 系统 MUST 在 activate 新版本时，将原 active 版本的状态自动变更为 superseded。
- **FR-005**: 系统 MUST 保证任意时刻同一规范最多只有一个 active 版本。
- **FR-006**: 系统 MUST 保证任意时刻同一规范最多只有一个 pending_review 版本（提交第二次修订前须先撤回或拒绝当前 pending_review 版本）。
- **FR-007**: 系统 MUST 记录每一次版本状态变更，形成可查询的版本历史。
- **FR-008**: 用户 MUST 能在规范详情页的"版本历史"Tab 中查看该规范所有历史版本的版本号、状态、更新时间。
- **FR-009**: 用户 MUST 能点击历史版本查看其完整内容（只读，不可编辑）。
- **FR-010**: superseded 状态 MUST 与 deprecated 状态区分：superseded 表示被新版本自动替代，deprecated 表示主动废弃，两者在界面和逻辑上均需区分展示。
- **FR-011**: 现有审批流（submit/approve/activate/deprecate）的操作入口和调用方式 MUST 保持不变，不影响已有集成。
- **FR-012**: 数据迁移 MUST 将现有 active 规范的当前内容作为其 v1 版本历史记录保留，不丢失任何现有数据。
- **FR-013**: 系统 MUST 提供 withdraw（撤回）操作，允许将 pending_review 状态的版本撤回至 draft 状态；撤回后允许再次提交修订。

### Key Entities

- **规范（Steering）**: 代表一条唯一的规范定义，拥有唯一 ID。主表保留 `title`、`content`、`content_embedding` 字段作为当前 active 版本的热缓存（用于搜索），同时新增 `lock_version` 字段用于并发 activate 的乐观锁控制。状态反映当前 active 版本的存在性。

- **规范版本（Steering Version）**: 规范在某一时刻的完整内容快照。每个版本独立存储全量数据，字段如下：
  - `id` — 主键
  - `steering_id` — 关联规范 ID
  - `version_number` — 整数递增版本号（1, 2, 3...）
  - `title` — 版本标题快照
  - `content` — 版本内容快照（全量）
  - `tags` — 版本标签快照
  - `status` — 版本状态（draft / pending_review / approved / active / superseded / deprecated）
  - `change_summary` — 本次修订摘要（可为空）
  - `created_at` — 创建时间
  - `updated_at` — 最后更新时间

- **版本状态流转**: 版本状态的合法流转路径：
  - `draft` → `pending_review`（提交审批）
  - `pending_review` → `draft`（withdraw 撤回）
  - `pending_review` → `approved`（审批通过）
  - `pending_review` → `rejected`（审批拒绝，回到 draft 或终结）
  - `approved` → `active`（activate，同时触发旧 active 版本变为 superseded 及 embedding 更新）
  - `active` → `superseded`（系统自动，新版本 activate 时触发）
  - `active` → `deprecated`（人工主动废弃）

- **搜索索引**: 仅基于 active 版本内容维护，embedding 向量在 active 版本变更时更新（steering 主表热缓存同步更新）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 搜索结果中不再出现 pending_review 或其他非 active 状态的规范版本内容，准确率达到 100%。
- **SC-002**: 规范修订提交后，embedding 向量保持不变（与修订前向量完全一致），可通过自动化测试验证。
- **SC-003**: activate 操作完成后，旧 active 版本自动变为 superseded，整个状态切换在单次操作内完成，用户无需额外操作。
- **SC-004**: 用户可在规范详情页"版本历史"Tab 中查看完整版本历史，版本列表加载时间在正常网络条件下不超过 2 秒。
- **SC-005**: 数据迁移后，现有所有 active 规范均可查到至少一条版本历史记录，迁移数据无丢失。
- **SC-006**: 现有集成了审批流接口的系统（如前端页面、MCP 工具）无需修改即可继续正常运行。
- **SC-007**: 并发 activate 冲突时，后到请求返回 409 错误且数据库状态保持一致（无脏数据）。

## Assumptions

- 当前 `steering` 表的每条记录对应一条规范，`current_version` 字段记录版本号。本次实现将引入独立的 `steering_version` 表存储历史版本完整快照，`steering` 主表继续作为规范的"当前状态"载体及搜索热缓存（保留 `content`、`content_embedding`）。
- 版本号采用整数递增（1, 2, 3...），由系统自动生成，不由用户手动指定。
- 同一时间一条规范只允许一个 pending_review 版本：若当前存在 pending_review 版本，用户需先 withdraw 撤回或等待审批结果，才能提交新修订。
- 并发 activate 冲突通过乐观锁解决：`steering` 主表新增 `lock_version` 整数字段，activate 操作使用 `WHERE lock_version = ?` 校验并原子递增；冲突时返回 409，不使用数据库锁。
- Embedding 生成为同步操作，包含在 activate 事务内；生成失败导致事务回滚，activate 整体不成功，前端/调用方需处理失败响应并提示重试。
- 版本历史为永久保留，不设自动清理策略（历史版本数量不大，无需分片）。
- 前端详情页已有 Tab 组件支持，新增"版本历史"Tab 为扩展现有页面，不重建。
