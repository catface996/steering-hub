# Research: 仓库管理与规范绑定

**Feature**: 003-repo-management
**Phase**: 0 — Research
**Date**: 2026-03-23

---

## 1. 现有 `repo` 表结构确认

**Decision**: 直接在现有 `repo` 表基础上扩展，不修改字段。
**Rationale**: 表已包含所有 spec 要求的字段（id, name, full_name, description, url, language, team, enabled, created_at, updated_at, deleted），`@TableLogic` 注解处理软删除。
**Current fields**: `id`, `name`, `fullName`, `description`, `url`, `language`, `team`, `enabled`, `createdAt`, `updatedAt`, `deleted`

---

## 2. `repo_steering` 关联表设计

**Decision**: 新建 `repo_steering` 表，包含 `(repo_id, steering_id, mandatory)` + 时间戳，**不加 deleted 字段**，UNIQUE(repo_id, steering_id) 保证幂等。
**Rationale**: 绑定关系无需软删除语义，解绑就是真实删除，避免孤儿数据和状态混乱。
**Alternatives considered**:
- 加 deleted 字段：会导致仓库删除后遗留脏数据，复杂性增加。
- 在 steering 表加 repo_ids 列：破坏关系范式，查询反向关联困难。

---

## 3. Repo CRUD API 扩展策略

**Decision**: 扩展现有 `RepoController` + `RepoService`，新增完整 CRUD 端点（list/create/update/toggle/delete）。
**Rationale**: 现有 RepoController 只有一个 registerRepo 端点，功能不完整；扩展现有 controller 比新建更符合项目约定。
**Key design points**:
- `POST /api/v1/web/repos` 注册时若 full_name 重复则返回 409 错误（现有实现静默返回现有记录，需改为报错）。
- `DELETE /api/v1/web/repos/{id}` 软删除 + 同步物理删除 `repo_steering` 记录（事务内）。
- `PATCH /api/v1/web/repos/{id}/toggle` 切换 enabled 状态。
- 列表支持 name/team/enabled 筛选 + 分页，使用 XML Mapper 动态 SQL。

---

## 4. 规范绑定 API 设计

**Decision**: 绑定接口 `PUT /api/v1/web/repos/{repoId}/steerings`（批量 upsert）+ 解绑 `DELETE /api/v1/web/repos/{repoId}/steerings/{steeringId}`。
**Rationale**: PUT upsert 语义天然满足幂等要求（同一仓库同一规范重复提交更新 mandatory），客户端不需要先查后写。
**Alternatives considered**:
- POST + 单独 PATCH：两个接口增加客户端复杂度。
- 只做 POST (create) + DELETE：无法满足幂等 mandatory 更新要求。

---

## 5. MCP Search Boost 实现策略

**Decision**: boost 逻辑在后端 Java `SearchServiceImpl.hybridSearch()` 中实现：在现有 `hybridSearch` 完成后，若 `SearchRequest.repo` 非空，查询该仓库绑定的 steering_id 列表，对结果列表进行**次排序**（相似度相同时绑定规范优先，mandatory 优先于非 mandatory）。
**Rationale**:
- MCP server 仅透传 `repo` 参数，不做任何计算（符合 FR-011/FR-012 要求）。
- 复合排序保留了相似度作为主排序维度，不会把低相似度绑定规范强行推到高相似度未绑定规范之前（符合 Assumption）。
- 实现简单：在结果列表上做一次 stable sort 即可。

**Sort key** (per result):
```
primarySort = -score  (越大越靠前)
secondarySort = binding_priority  (0=mandatory-bound, 1=non-mandatory-bound, 2=unbound)
```

**Alternatives considered**:
- 在 SQL 向量搜索层实现 boost（JOIN repo_steering 修改 similarity 值）：会使语义搜索 SQL 复杂且污染 score，可读性差。
- 固定加分（e.g., bound += 0.1）：会导致低相似度绑定规范排在高相似度未绑定规范之前，违反 Assumption。

---

## 6. 前端仓库管理页面结构

**Decision**: 实现两个页面：`RepoListPage`（列表+注册）和 `RepoDetailPage`（详情+规范绑定管理）。
**Rationale**: 规范绑定列表可能超过 100 条，需要独立页面支持分页；列表页轻量用于注册和状态管理。
**Key UI patterns** (from existing codebase):
- 使用 `Pagination.tsx` 组件（禁止自行实现分页）。
- 暗色主题，复用 `useHeader`、`TableCard` 等现有组件。
- Git URL 输入时实时解析预填 full_name（FR-014）：用 `onChange` + regex 提取 `org/repo`。

---

## 7. full_name 唯一性校验

**Decision**: 后端 `RepoService.createRepo()` 在插入前查询是否存在相同 full_name（含已软删除记录也检查），若存在则抛出 `BusinessException`（409）。
**Rationale**: spec FR-005 要求全局唯一。现有 `registerRepo` 静默返回现有记录的行为不符合要求（需要明确错误提示）。
**Implementation**: 在 XML Mapper 中查询时不过滤 deleted=false，确保已软删除的 full_name 也被占用（避免同名复活场景）。
**Alternatives considered**: 数据库 UNIQUE 约束：更可靠，但需要 migration；可以同时加上 DB 约束作为兜底。

---

## 8. 仓库删除的级联处理

**Decision**: `RepoService.deleteRepo()` 在同一事务中：(1) 软删除 repo（deleted=true），(2) 物理删除 `repo_steering` 中所有 `repo_id = ?` 的行。
**Rationale**: 保证无孤儿数据；合规报告通过 `compliance_report` 表保存快照，不受影响。
**Implementation**: `@Transactional` 注解，先 delete repo_steering，再 updateById repo（MyBatis Plus @TableLogic 自动处理 deleted 字段）。

---

## 9. 既有代码违规说明（不在本 feature 修改范围）

`RepoServiceImpl` 和 `SearchServiceImpl` 中已有 `LambdaQueryWrapper` 用法，违反 Constitution III 规定。本 feature 的**新增代码**全部使用 XML Mapper，不修改上述既有违规代码。
