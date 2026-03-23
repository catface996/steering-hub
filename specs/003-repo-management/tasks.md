# Tasks: 仓库管理与规范绑定

**Input**: Design documents from `/specs/003-repo-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/repo-api.md, contracts/repo-steering-api.md, contracts/search-api-delta.md, quickstart.md

**Tests**: No automated tests (per plan.md: 无自动化测试框架，与现有一致)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on concurrent tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration — must be applied before any backend code is run

- [x] T001 Create DB migration script: `repo_steering` table + UNIQUE constraint on `repo.full_name` in `docs/sql/migration_003_repo_management.sql`; migration SQL 须包含以下索引：`CREATE INDEX idx_repo_steering_repo_id ON repo_steering(repo_id);` 和 `CREATE INDEX idx_repo_steering_steering_id ON repo_steering(steering_id);`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared entities, mappers, and DTOs that multiple user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Create `RepoSteering` entity in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/entity/RepoSteering.java` (fields: id, repoId, steeringId, mandatory, createdAt, updatedAt; `@TableName("repo_steering")`, `@TableLogic` absent — no soft delete)
- [x] T003 [P] Create `RepoSteeringMapper.java` interface in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/RepoSteeringMapper.java` (method signatures: upsertBinding, deleteByPair, deleteByRepoId, listByRepoIdPaged, listBySteeringIdPaged)；关键签名明确如下：
  - `List<RepoSteeringItem> listByRepoIdPaged(@Param("repoId") Long repoId, @Param("offset") int offset, @Param("size") int size)`
  - 需同步创建 `RepoSteeringItem` VO 类，路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/response/RepoSteeringItem.java`，字段：steeringId, steeringTitle, steeringStatus, mandatory, bindingId, createdAt
  - XML（T004）中需为 `RepoSteeringItem` 定义对应 ResultMap
- [x] T004 [P] Create `RepoSteeringMapper.xml` in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/xml/RepoSteeringMapper.xml` with SQL for all RepoSteeringMapper methods (INSERT … ON CONFLICT DO UPDATE for upsert; JOINs to steering/repo tables for paged list queries)；关键签名与 VO 明确如下：
  - `listBySteeringIdPaged` 返回 `List<RepoItem>`，签名：`List<RepoItem> listBySteeringIdPaged(@Param("steeringId") Long steeringId, @Param("offset") int offset, @Param("size") int size)`
  - 需同步创建 `RepoItem` VO 类，路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/response/RepoItem.java`，字段：repoId, repoName, repoFullName, repoEnabled, mandatory, bindingId, createdAt
  - XML 中需为 `RepoItem` 和 `RepoSteeringItem` 分别定义对应 ResultMap
- [x] T005 [P] Extend `RepoMapper.java` with XML method signatures (listByCondition, findByFullNameIncludeDeleted) and add corresponding dynamic SQL to `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/xml/RepoMapper.xml`；过滤规则明确：`listByCondition` 查询必须添加 `AND deleted = false`（仅返回未软删除仓库）；`findByFullNameIncludeDeleted` 查全部记录（包含 `deleted = true`），专用于 full_name 唯一性校验，防止同名仓库复活
- [x] T006 [P] Create Repo CRUD DTOs: `RepoCreateRequest.java`, `RepoUpdateRequest.java`, `RepoQueryRequest.java` in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/request/`; create binding DTOs `RepoSteeringBindRequest.java` in same `request/` dir and `RepoSteeringItem.java` in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/response/`；关键校验注解要求：
  - `RepoCreateRequest`: name `@NotBlank @Size(max=200)`、fullName `@NotBlank @Size(max=300)`、description `@Size(max=1000)`、url `@Size(max=500)`、language `@Size(max=100)`、team `@Size(max=200)`
  - `RepoUpdateRequest`: name `@NotBlank @Size(max=200)`、description `@Size(max=1000)`、url `@Size(max=500)`、language `@Size(max=100)`、team `@Size(max=200)`（fullName 不在 UpdateRequest 中，不可修改）

**Checkpoint**: All shared entities, mappers, and DTOs are in place — user story phases can now begin

---

## Phase 3: User Story 1 - 注册与管理代码仓库 (Priority: P1) — MVP

**Goal**: Full Repo CRUD via REST API and frontend list page — register, list, filter, edit, enable/disable, delete

**Independent Test**: Register a new repo → list with filters → edit description → disable → delete; verify list reflects all changes after page refresh; verify duplicate `full_name` returns 409; verify Git URL auto-fills `full_name` in create form

### Implementation for User Story 1

- [x] T007 [P] [US1] Add CRUD method signatures to `RepoService.java` in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/RepoService.java` (createRepo, listRepos, getRepo, updateRepo, toggleRepo, deleteRepo)
- [x] T008 [US1] 【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Service 类型对应规范）。Implement CRUD methods in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/impl/RepoServiceImpl.java`: createRepo checks full_name uniqueness including soft-deleted records (throw BusinessException 409 if exists); deleteRepo uses `@Transactional` — physically deletes all `repo_steering` rows for the repo then soft-deletes repo; toggleRepo flips `enabled`
- [x] T009 [US1] 【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Controller 类型对应规范）。Extend `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/controller/RepoController.java` with endpoints: `POST /api/v1/web/repos`, `GET /api/v1/web/repos`, `GET /api/v1/web/repos/{id}`, `PUT /api/v1/web/repos/{id}`, `PATCH /api/v1/web/repos/{id}/toggle`, `DELETE /api/v1/web/repos/{id}`; all use `@Valid` + DTO parameters and return `Result<T>`；错误处理：`GET /repos/{id}`、`PUT /repos/{id}`、`DELETE /repos/{id}` 操作时，若记录不存在或 `deleted=true`，则抛出 `BusinessException(404, "仓库不存在")`
- [x] T010 [P] [US1] Add `Repo` TypeScript type to `steering-hub-frontend/src/types/index.ts` (id, name, fullName, description, url, language, team, enabled, createdAt, updatedAt)
- [x] T011 [P] [US1] Create `steering-hub-frontend/src/services/repoService.ts` with functions: `listRepos`, `createRepo`, `getRepo`, `updateRepo`, `toggleRepo`, `deleteRepo` (all call `/api/v1/web/repos` base path)
- [x] T012 [US1] Create `steering-hub-frontend/src/pages/repo/RepoListPage.tsx`: table with columns (name, fullName, team, language, enabled status tag, actions); filter bar (name fuzzy, team exact, enabled select); `Pagination` component; create modal with form (name, url with onChange that parses Git URL to auto-fill fullName via regex `/([\w.-]+\/[\w.-]+)(?:\.git)?$/`, description, language, team); enable/disable toggle; delete confirm modal; show 409 error message if fullName duplicate
- [x] T013 [US1] Add `仓库管理` menu item (icon: `DatabaseOutlined`) to `steering-hub-frontend/src/components/Sidebar.tsx`（插入在"健康检查" HealthOutlined 菜单项之后，侧边栏底部功能区之前）; add route `/repos` → `RepoListPage` to `steering-hub-frontend/src/App.tsx`（仅添加列表页路由和 import，`/repos/:id` → `RepoDetailPage` 路由及其 import 延迟到 T020 中添加）

**Checkpoint**: User Story 1 is fully functional — admin can manage repos end-to-end without implementing binding or search boost

---

## Phase 4: User Story 2 - 为仓库绑定规范 (Priority: P2)

**Goal**: Bind/unbind steerings to a repo (with mandatory flag); view bound steerings per repo; view repos bound to a steering (reverse lookup); idempotent upsert; warning for non-active steerings

**Independent Test**: Open repo detail → add 3 bindings (mix of mandatory/non-mandatory, including a deprecated steering) → verify mandatory badges and warning for deprecated → remove one binding → verify list; open a steering detail and see repos list via `/api/v1/web/steerings/{steeringId}/repos`

### Implementation for User Story 2

- [x] T014 [P] [US2] Add binding method signatures to `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/RepoService.java` (bindSteering, unbindSteering, listSteeringsByRepo, listReposBySteering)
- [x] T015 [US2] 【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Service 类型对应规范）。Implement binding methods in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/impl/RepoServiceImpl.java`: bindSteering calls upsert via `RepoSteeringMapper`; checks steering status and appends `warning` field in response if status is not `active`; listSteeringsByRepo returns paginated `RepoSteeringItem` list
- [x] T016 [US2] 【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Controller 类型对应规范）。Add binding endpoints to `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/controller/RepoController.java`: `GET /api/v1/web/repos/{repoId}/steerings`, `PUT /api/v1/web/repos/{repoId}/steerings/{steeringId}`, `DELETE /api/v1/web/repos/{repoId}/steerings/{steeringId}`；错误处理：`DELETE` 绑定时若绑定记录不存在则抛出 `BusinessException(404, "绑定关系不存在")`
- [x] T017 [P] [US2] 【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Controller 类型对应规范）。Add reverse lookup endpoint `GET /api/v1/web/steerings/{steeringId}/repos` to `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/controller/SteeringController.java`; delegates to `RepoService.listReposBySteering`
- [x] T018 [P] [US2] Add `RepoSteeringBinding` TypeScript type to `steering-hub-frontend/src/types/index.ts` (steeringId, steeringTitle, steeringStatus, mandatory, bindingId, createdAt, warning)
- [x] T019 [P] [US2] Extend `steering-hub-frontend/src/services/repoService.ts` with: `listSteeringsByRepo`, `bindSteering`, `unbindSteering`, `listReposBySteering`
- [x] T020 [US2] Create `steering-hub-frontend/src/pages/repo/RepoDetailPage.tsx`: displays repo info card; bound steerings list table (columns: title, status tag, mandatory badge, warning icon for non-active, createdAt, unbind action); add binding section — searchable steering selector, mandatory toggle, bind button; `Pagination` component for list; warning alert for deprecated/draft status on bind response
- [x] T020a [US2] 扩展 `steering-hub-frontend/src/pages/steering/SteeringDetailPage.tsx`，新增"引用仓库"Tab（或 Section）：调用接口 `GET /api/v1/web/steerings/{steeringId}/repos`，展示绑定该规范的仓库列表（列：name、full_name、mandatory 标记、仓库状态 enabled/disabled），复用 `Pagination` 组件；覆盖 FR-008 和 US2 AC-3；同时在 `steering-hub-frontend/src/types/index.ts` 中新增 `RepoBindingItem` 类型：
  ```typescript
  export interface RepoBindingItem {
    bindingId: number;
    repoId: number;
    repoName: string;
    repoFullName: string;
    repoEnabled: boolean;
    mandatory: boolean;
    createdAt: string;
  }
  ```

**Checkpoint**: User Stories 1 and 2 are fully functional — repo CRUD and steering binding work end-to-end

---

## Phase 5: User Story 3 - 基于仓库上下文的 MCP 搜索增强 (Priority: P3)

**Goal**: MCP `search_steering` tool accepts optional `repo` param; backend boosts bound steerings in results (composite sort: primary by score, secondary by binding priority: mandatory-bound > non-mandatory-bound > unbound); no-repo behavior unchanged

**Independent Test**: Call `search_steering` with `repo='org/my-service'` — bound steerings appear before unbound steerings of same score; call without `repo` — results identical to before this change; call with non-existent or inactive repo — results identical to before this change

### Implementation for User Story 3

- [x] T021 [P] [US3] Add `private String repo;` field to `steering-hub-backend/search-service/src/main/java/com/steeringhub/search/dto/SearchRequest.java`
- [x] T022 [P] [US3] ~~Update `SearchService.java` interface~~ **[NO-OP]** `SearchService` 接口签名无需变更——`search(SearchRequest)` 方法已能承载新增的 `repo` 字段（T021 仅在 `SearchRequest` DTO 上加字段，接口签名不变）。本任务合并为 T023 的前置说明，无需额外改动。
- [x] T023 [US3] 【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Service 类型对应规范）。**前置说明（原 T022）**：`SearchService` 接口签名无需变更，`search(SearchRequest)` 已能承载 repo 字段。Implement repo boost in `steering-hub-backend/search-service/src/main/java/com/steeringhub/search/service/impl/SearchServiceImpl.java`: after existing hybridSearch completes, if `SearchRequest.repo` is non-blank, query repo by full_name (enabled=true, deleted=false); if found, retrieve its bound steering_id list with mandatory flags from `RepoSteeringMapper`（注：search-service pom.xml 已依赖 steering-service 模块，可直接注入 RepoSteeringMapper Spring Bean，注入方式：`@Autowired RepoSteeringMapper repoSteeringMapper`，与现有 `SteeringMapper` 注入方式一致）; apply stable composite sort: primary key = `-score`, secondary key = binding priority (0 = mandatory-bound, 1 = non-mandatory-bound, 2 = unbound); if repo not found or inactive, skip boost entirely；**boost 仅重排 hybridSearch 已返回的结果集，不追加新条目；结果数量保持与原始搜索一致，无需裁剪处理**
- [x] T024 [P] [US3] Update `steering-hub-mcp/src/steering_hub_mcp/client.py` `search_steerings()` function to accept `repo: Optional[str] = None` and pass it as `params["repo"] = repo` when non-empty; update `server.py` `handle_search_steering` to pass `repo=repo` when calling `client.search_steerings()`；同时更新 `server.py` 中 `search_steering` tool 的 `inputSchema`，在 `properties` 中新增可选字段：
  ```json
  "repo": {
    "type": "string",
    "description": "仓库 full_name（如 org/repo-name），传入后优先返回该仓库绑定的规范（可选）"
  }
  ```
  （`required` 数组无需包含 `repo`，保持可选）

**Checkpoint**: All three user stories are fully functional. MCP search boost works for bound repos without breaking existing behavior

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, UI polish, and end-to-end validation

- [x] T025 [P] Validate edge cases in `steering-hub-frontend/src/pages/repo/RepoListPage.tsx`: show inline form error message on 409 response (fullName duplicate); disable submit button while request is in-flight
- [x] T026 [P] Validate edge cases in `steering-hub-frontend/src/pages/repo/RepoDetailPage.tsx`: show `Alert` component with warning text when steering status is `deprecated` or `draft` in the bound steerings table row
- [ ] T027 Run end-to-end validation using all scenarios from `specs/003-repo-management/quickstart.md` (DB migration, backend CRUD API, binding API, MCP search boost, frontend flows)；核查清单：
  - ✓ fullName 重复提交返回 409
  - ✓ inactive repo 传入 MCP search 时行为与不传 repo 参数一致
  - ✓ 软删除仓库时 repo_steering 绑定行已被物理删除
  - ✓ boost 后结果数量与不传 repo 时相同

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (DB migration applied) — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — can start once foundational is done
- **Phase 4 (US2)**: Depends on Phase 2 — can start in parallel with Phase 3, or after
- **Phase 5 (US3)**: Depends on Phase 2 — can start after Phase 3 and Phase 4 (bindings must exist to test boost)
- **Phase 6 (Polish)**: Depends on Phase 3 + Phase 4 + Phase 5

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2 — no dependency on US2 or US3
- **US2 (P2)**: Independent after Phase 2 — no dependency on US1 at backend level; frontend RepoDetailPage logically follows RepoListPage but can be built in parallel
- **US3 (P3)**: Independent after Phase 2 at code level; requires US1+US2 complete for meaningful testing (need repos and bindings to exist)

### Within Each User Story

- DTOs/entity (Phase 2) before service, service before controller
- Backend service interface before implementation
- TypeScript types before service layer, service layer before page components
- Backend before frontend (API must exist for frontend to call)

### Parallel Opportunities

- All Phase 2 tasks (T002–T006) can run in parallel — all different files
- T007 and T010 (service interface + frontend types) can start in parallel within Phase 3
- T011 can start once T010 is done; T012 once T011; T013 once T012
- T014, T017, T018 can run in parallel within Phase 4
- T021, T022, T024 can run in parallel within Phase 5
- T025 and T026 can run in parallel within Phase 6

---

## Parallel Example: User Story 1

```bash
# Start both in parallel (different files, no dependency):
Task: "T007 - Add CRUD method signatures to RepoService.java"
Task: "T010 - Add Repo TypeScript type to types/index.ts"

# After T010 completes:
Task: "T011 - Create repoService.ts"

# After T007 completes:
Task: "T008 - Implement RepoServiceImpl.java CRUD"

# After T008 completes:
Task: "T009 - Extend RepoController.java with CRUD endpoints"

# After T011 completes:
Task: "T012 - Create RepoListPage.tsx"

# After T009 + T012 complete (API ready, page ready):
Task: "T013 - Add Sidebar menu item and App.tsx routes"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Apply Phase 1: DB migration (`migration_003_repo_management.sql`)
2. Complete Phase 2: Foundational entities, mappers, DTOs
3. Complete Phase 3: US1 — Repo CRUD API + frontend list page
4. **STOP and VALIDATE**: Register repo, list, filter, edit, toggle, delete all work
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → Repo management works → Demo
3. Phase 4 (US2) → Binding management works → Demo
4. Phase 5 (US3) → MCP search boost works → Demo
5. Phase 6 → Polish → Release

### Parallel Team Strategy

With multiple developers:

1. Team applies DB migration and completes Phase 2 together
2. Once Phase 2 is done:
   - Developer A: Phase 3 (US1 — Repo CRUD)
   - Developer B: Phase 4 (US2 — Binding) backend
   - Developer C: Phase 5 (US3 — MCP boost)
3. Frontend for US2 (T018–T020) follows backend completion
4. Phase 6 polish once all stories are done

---

## Notes

- `[P]` tasks = different files, no dependency on concurrent tasks in the same phase
- `[Story]` label maps each task to a specific user story for traceability
- `repo_steering` table has **no `deleted` field** — unbind and repo soft-delete both use hard DELETE
- `full_name` uniqueness check includes soft-deleted records (no same-name revival)
- Boost sort is stable composite: `-score` primary, `binding_priority` secondary (0=mandatory-bound, 1=non-mandatory-bound, 2=unbound)
- No test tasks generated (spec states no automated test framework)
- Commit after each phase checkpoint or logical group of tasks
- Stop at each checkpoint to validate story independently before proceeding
