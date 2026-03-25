# Tasks: 规范相似性检测

**Input**: Design documents from `/specs/001-similarity-conflict-detection/`
**Branch**: `001-similarity-conflict-detection`
**Date**: 2026-03-22

> **范围说明**: 本次迭代仅实现相似性检测（US1/US2）。冲突检测（US3）、合并操作（US4/US5）推迟到后续迭代。
>
> **设计修正**: 相似度基于 `content_embedding`（规范全文向量余弦），非 data-model.md 中的四维加权公式。`overall_score = vector_score = content_embedding 余弦相似度`；`title_score / tags_score / keywords_score` 写 NULL；`reason_tags` 固定为 `["内容语义相近"]`。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- No automated tests (手动验证，无测试框架)

---

## Phase 1: Setup

**Purpose**: 创建数据库迁移文件——所有后端编码的前提

- [X] T001 Create `docs/sql/migration_001_similarity.sql` with: (1) `health_check_task` table per data-model.md; (2) `similar_spec_pair` table per data-model.md with UNIQUE(task_id,spec_a_id,spec_b_id) and CHECK(spec_a_id < spec_b_id); (3) `ALTER TABLE steering ADD COLUMN content_embedding vector(512)`; (4) `CREATE INDEX idx_steering_content_embedding ON steering USING hnsw (content_embedding vector_cosine_ops)`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 实体、Mapper、配置——阻塞所有 US 实现

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add `health-check` config block to `steering-hub-backend/app/src/main/resources/application.yml`: `similarity-threshold: 0.7`, `sse-timeout-ms: 300000`, `async-thread-pool-size: 2`
- [X] T003 [P] Add `TASK_ALREADY_RUNNING(409, "检测任务正在进行中")`, `SPEC_COUNT_INSUFFICIENT(400, "active 规范数量不足，无法检测")`, `TASK_NOT_FOUND(404, "检测任务不存在")` to `steering-hub-backend/common/src/main/java/com/steeringhub/common/response/ResultCode.java`
- [X] T004 [P] Create `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/entity/HealthCheckTask.java` per data-model.md (`@TableName("health_check_task")`, fields: id/status/similarPairCount/activeSpecCount/startedAt/completedAt/errorMessage)
- [X] T005 [P] Create `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/entity/SimilarSpecPair.java` per data-model.md (`@TableName("similar_spec_pair")`, fields: id/taskId/specAId/specBId/overallScore/vectorScore/titleScore/tagsScore/keywordsScore/reasonTags/createdAt; all score fields use `BigDecimal`)
- [X] T006 [P] Add `contentEmbedding` field (`float[]`) to existing `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/entity/Steering.java`; add `updateContentEmbedding(Long id, float[] vec)` and `findTopKSimilarByContentEmbedding(Long excludeId, String vecStr, int limit)` to existing `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/SteeringMapper.java`
- [X] T007 [P] Create `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/HealthCheckTaskMapper.java` extending `BaseMapper<HealthCheckTask>`; add `insertAndGetId`, `updateStatus`, `findLatestCompleted`, `findRunning` method signatures
- [X] T008 [P] Create `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/SimilarSpecPairMapper.java` extending `BaseMapper<SimilarSpecPair>`; add `batchInsert(List<SimilarSpecPair>)` and `findByTaskIdPaged(Long taskId, int offset, int pageSize)` method signatures
- [X] T009 Add SQL to existing `steering-hub-backend/steering-service/src/main/resources/mapper/SteeringMapper.xml`: (1) `updateContentEmbedding` — `UPDATE steering SET content_embedding = CAST(#{vecStr} AS vector) WHERE id = #{id}`; (2) `findTopKSimilarByContentEmbedding` — SELECT id, content, 1-(content_embedding <=> CAST(#{vecStr} AS vector)) AS score FROM steering WHERE status='active' AND id != #{excludeId} AND content_embedding IS NOT NULL ORDER BY content_embedding <=> CAST(#{vecStr} AS vector) LIMIT #{limit}; explicitly list all needed columns (no SELECT *)
- [X] T010 Create `steering-hub-backend/steering-service/src/main/resources/mapper/HealthCheckTaskMapper.xml` with: `insertAndGetId` (INSERT with useGeneratedKeys), `updateStatus` (UPDATE status/completedAt/similarPairCount/errorMessage WHERE id), `findLatestCompleted` (SELECT explicit columns WHERE status='completed' ORDER BY completed_at DESC LIMIT 1), `findRunning` (SELECT explicit columns WHERE status='running' LIMIT 1)
- [X] T011 Create `steering-hub-backend/steering-service/src/main/resources/mapper/SimilarSpecPairMapper.xml` with: `batchInsert` (INSERT ... VALUES batch); `findByTaskIdPaged` (JOIN steering sa ON sa.id=spec_a_id JOIN steering sb ON sb.id=spec_b_id, return id/specAId/specBId/overallScore/vectorScore/reasonTags + sa.title/sa.tags/sa.status + sb.title/sb.tags/sb.status, ORDER BY overall_score DESC, LIMIT/OFFSET paged, explicit columns only)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - 运行相似性检测并查看结果 (Priority: P1) MVP

**Goal**: 管理员可触发检测，SSE 感知完成，查看按相似度排序的规范对列表

**Independent Test**: 存在 2+ 条 active 规范时，点击"运行检测"后等待完成，相似规范对列表出现并按 overall_score 降序排列

### Implementation for User Story 1

- [X] T012 [US1] Create `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/HealthCheckService.java` interface with methods: `triggerCheck(): HealthCheckTask`, `subscribeEvents(): SseEmitter`, `getLatestTask(): Optional<HealthCheckTaskVO>`, `getSimilarPairs(Long taskId, int page, int pageSize): PageResult<SimilarPairVO>`
- [X] T013 [US1] Add `generateContentEmbedding(Long id)` to `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/SteeringService.java` interface and implement in `SteeringServiceImpl.java`: load steering by id, strip Markdown syntax from content, call EmbeddingService (from search-service) with plain text, convert float[] to pgvector string `[v1,v2,...]`, call `steeringMapper.updateContentEmbedding(id, vecStr)`
- [X] T014 [US1] Add `POST /api/v1/web/steerings/{id}/content-embedding` endpoint to `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/controller/SteeringController.java` — calls `steeringService.generateContentEmbedding(id)`, returns `Result.success()`
- [X] T015 [US1] Create `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/impl/HealthCheckServiceImpl.java`: (1) `triggerCheck`: check running task → 409; count active specs < 2 → 400 with count; create task (status=running); submit `@Async` job; return task; (2) async job: batch-call `generateContentEmbedding` for all active specs where content_embedding IS NULL; load all active specs with content_embedding; for each spec run `steeringMapper.findTopKSimilarByContentEmbedding(id, vecStr, 10)`; collect unique pairs where score >= threshold (spec_a_id < spec_b_id, no duplicates); batch-insert SimilarSpecPair with overallScore=vectorScore=score, titleScore/tagsScore/keywordsScore=null, reasonTags=`["内容语义相近"]`; update task to completed; emit SSE `task-completed` event; (3) configure `ThreadPoolTaskExecutor` with size from config; (4) SSE emitter registry (CopyOnWriteArrayList) with heartbeat scheduled every 30s; emit `task-failed` on exception; (5) `getLatestTask`: query findLatestCompleted, compute isExpired (completedAt < now-24h); (6) `getSimilarPairs`: call `similarSpecPairMapper.findByTaskIdPaged` with offset=(page-1)*pageSize
- [X] T016 [US1] Create `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/controller/HealthCheckController.java` with: `POST /api/v1/health-check/trigger` → Result<TriggerVO>; `GET /api/v1/health-check/events` → SseEmitter (timeout from config, register emitter, return directly without Result<T> wrapper per spec); `GET /api/v1/health-check/latest` → Result<HealthCheckTaskVO>; `GET /api/v1/health-check/{taskId}/similar-pairs` → Result<PageResult<SimilarPairVO>> with `@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="10") int pageSize`
- [X] T017 [P] [US1] Create `steering-hub-frontend/src/services/healthService.ts` with: `triggerCheck(): Promise<{taskId: number, status: string}>`, `getLatestTask(): Promise<HealthCheckTaskVO | null>`, `getSimilarPairs(taskId: number, page: number, pageSize: number): Promise<PageResult<SimilarPairVO>>`; define TypeScript types for HealthCheckTaskVO and SimilarPairVO matching contracts/api.md response shape
- [X] T018 [US1] Create `steering-hub-frontend/src/pages/health/HealthPage.tsx`: (1) on mount call `getLatestTask()` and load results if taskId exists; (2) "运行检测" button — on click POST trigger, set running state (button disabled + Spin), immediately open EventSource to `/api/v1/health-check/events`; (3) useEffect cleanup: EventSource.close() on unmount; on `task-completed` event: close EventSource, reload task + pairs list; on `task-failed` event: close, show error message; on `heartbeat`: no-op; (4) task status bar (when task exists): 检测时间/耗时/规范数/发现对数 Badge; isExpired=true 时显示 Alert "结果已过期，建议重新检测"; (5) Ant Design Table for similar pairs: columns — 规范A标题, 规范B标题, 综合相似度(Progress percent=overallScore*100), 相似原因(Tag group from reasonTags), 操作([查看对比] Button); (6) use `src/components/Pagination.tsx` for pagination; (7) "规范数量不足" and "未发现相似规范对" empty states
- [X] T019 [P] [US1] Add route `<Route path="/health" element={<HealthPage />} />` to `steering-hub-frontend/src/App.tsx`
- [X] T019-EXT [US1] 在 HealthPage.tsx 列表上方增加内联搜索栏：标题关键词输入框（`specTitle`，模糊匹配规范A/B标题）、分类下拉框（`categoryId`，从 `/api/v1/web/categories` 动态加载）、查询/重置按钮；`SimilarPairVO` 扁平化新增字段：`specAId/specATitle/specACategoryId/specACategoryName/specBId/specBTitle/specBCategoryId/specBCategoryName`；规范A/B列展示分类名称（灰色小字）；后端 `GET /{taskId}/similar-pairs` 新增 `specTitle`（LIKE 匹配）和 `categoryId` 查询参数，XML 中 JOIN category 表取分类名称
- [X] T020 [P] [US1] Add "规范健康度" menu item (icon: HeartOutlined, path: `/health`) to `steering-hub-frontend/src/components/Sidebar.tsx` without altering existing menu items

**Checkpoint**: US1 fully functional — trigger detection, SSE notification, view sorted similar pairs list

---

## Phase 4: User Story 2 - 查看规范内容对比 (Priority: P2)

**Goal**: 点击相似规范对的"查看对比"按钮，左右分屏展示两条规范完整内容

**Independent Test**: 点击任意相似规范对的"查看对比"，Drawer 打开并左右各显示对应规范的标题、tags、完整正文

### Implementation for User Story 2

- [X] T021 [US2] Add `GET /api/v1/steerings/compare` endpoint to `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/controller/SteeringController.java`: `@RequestParam Long idA, @RequestParam Long idB`; query both specs; return `Result<CompareVO>` where `CompareVO` has `specA` and `specB` each with fields `id/title/tags/keywords/content/status/updatedAt`; return 404 if either spec not found
- [X] T022 [US2] Add `SpecCompareDrawer` component inline to `steering-hub-frontend/src/pages/health/HealthPage.tsx` (or extract to `steering-hub-frontend/src/pages/health/SpecCompareDrawer.tsx`): Ant Design Drawer `width="80%"`, title="规范内容对比"; inside use `Row` with two `Col span={12}` each wrapped in `div` with `overflowY: auto, maxHeight: calc(100vh - 120px)`; left col shows specA (title h3 + Tags row + Markdown rendered content); right col shows specB (same structure); fetch via `healthService.compareSpecs(idA, idB)` when drawer opens; add `compareSpecs` method to `healthService.ts`; wire "查看对比" button in HealthPage to open drawer with selected pair's specAId/specBId

**Checkpoint**: US1 + US2 both functional — similarity list with drill-down content comparison

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 边界验证和集成检查

- [X] T023 Validate integration against quickstart.md scenarios: (1) run DB migration `psql -f docs/sql/migration_001_similarity.sql` and confirm tables created; (2) verify spec count ≤ 1 returns 400 with message "规范数量不足...（当前 active 规范 N 条）"; (3) verify duplicate trigger while running returns 409; (4) verify `isExpired` flag in `/latest` response when completedAt > 24h ago; (5) confirm SSE endpoint `/api/v1/health-check/events` passes JWT auth (Bearer Token in EventSource via URL param or custom header as needed); (6) confirm `spec_a_id < spec_b_id` constraint is enforced in HealthCheckServiceImpl before insert; (7) confirm Pagination.tsx is used (not custom pagination) in HealthPage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2) complete
- **US2 (Phase 4)**: Depends on US1 complete (reuses HealthPage, healthService)
- **Polish (Phase 5)**: Depends on US1 + US2 complete

### User Story Dependencies

- **US1 (P1)**: No dependency on US2
- **US2 (P2)**: Depends on US1 (HealthPage and healthService already exist; adds Drawer + compare endpoint)

### Within Phase 3 (US1) Sequential Order

```
T012 (interface) → T013 (SteeringService embedding) → T014 (embedding endpoint)
                                                     ↓
                                         T015 (HealthCheckServiceImpl) → T016 (Controller)
T017 [P] (healthService.ts) ──────────────────────────────────────────────→ T018 (HealthPage)
T019 [P] (App.tsx route) ─────────────────────────────────────────────────→ T018
T020 [P] (Sidebar.tsx) ───────────────────────────────────────────────────→ T018
```

### Parallel Opportunities

Within Phase 2, the following can run in parallel: T003, T004, T005, T006, T007, T008 (all touch different files).
T009, T010, T011 are XML files — can be written in parallel but require T006–T008 mapper interfaces first.

Within Phase 3: T017, T019, T020 can be written in parallel once T012 is done.

---

## Parallel Example: Phase 2 Foundation

```
# Launch simultaneously (all different files):
Task T003: Add ResultCode values
Task T004: Create HealthCheckTask.java
Task T005: Create SimilarSpecPair.java
Task T006: Add contentEmbedding to Steering.java + SteeringMapper.java
Task T007: Create HealthCheckTaskMapper.java
Task T008: Create SimilarSpecPairMapper.java

# Then (after T006-T008):
Task T009: SteeringMapper.xml additions
Task T010: HealthCheckTaskMapper.xml
Task T011: SimilarSpecPairMapper.xml
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T011)
3. Complete Phase 3: User Story 1 (T012–T020)
4. **STOP and VALIDATE**: Trigger detection, verify SSE, confirm pair list renders
5. Demo / deploy if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → Detection + results list (MVP)
3. Phase 4 (US2) → Content comparison Drawer
4. Phase 5 → Polish and edge-case validation

---

## Notes

- [P] tasks = different files, no blocking dependencies
- No automated tests — manual validation per quickstart.md
- SSE endpoint returns `SseEmitter` directly (not `Result<T>`) — this is intentional per plan.md
- `spec_a_id < spec_b_id` ordering is a DB constraint AND must be enforced in Java before insert
- content_embedding is stored as pgvector; Java side uses `float[]` for in-memory ops; SQL side uses `CAST(#{vecStr} AS vector)` pattern
- similarity-threshold read from config via `@Value("${health-check.similarity-threshold:0.7}")`
- Markdown stripping for content embedding: use simple regex to remove `#`, `**`, `_`, backtick blocks before passing to Bedrock
- EmbeddingService is in search-service module; HealthCheckServiceImpl in steering-service needs it injected (confirm Maven dependency exists in steering-service pom.xml, or inject BedrockRuntimeClient directly)
