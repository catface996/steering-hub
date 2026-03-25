# Tasks: 规范版本管理与搜索行为优化

**Input**: Design documents from `/specs/002-version-history-search/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Both backend and frontend tasks are included in every user story phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths are included in all descriptions

---

## Phase 1: Setup

**Purpose**: Create DB migration script that all phases depend on.

- [X] T001 Create DB migration script per research.md §3: (1) `ALTER TABLE steering ADD COLUMN lock_version INT NOT NULL DEFAULT 0`; (2) `ALTER TABLE steering_version ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft'`, `ALTER TABLE steering_version ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`; (3) update CHECK constraints for `steering` (add `superseded`) and `steering_review` (add `withdraw`); (4) backfill version history for existing records: `INSERT INTO steering_version (steering_id, version, title, content, keywords, tags, status, change_log, created_at, updated_at) SELECT id, 1, title, content, keywords, tags, status, 'initial version', created_at, updated_at FROM steering WHERE deleted = FALSE ON CONFLICT (steering_id, version) DO NOTHING`; (5) `CREATE INDEX IF NOT EXISTS idx_sv_steering_status ON steering_version(steering_id, status)` in `docs/sql/migration_002_version_status.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Enum extensions, entity updates, and TypeScript types that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `SUPERSEDED("superseded", "已被取代")` to `SteeringStatus` enum in `steering-hub-backend/common/src/main/java/com/steeringhub/common/enums/SteeringStatus.java`
- [X] T003 [P] Add `WITHDRAW("withdraw", "撤回")` to `ReviewAction` enum in `steering-hub-backend/common/src/main/java/com/steeringhub/common/enums/ReviewAction.java`
- [X] T004 [P] Add `private Integer lockVersion;` field (column `lock_version`) to `Steering` entity in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/entity/Steering.java`
- [X] T005 [P] Add `private String status;` and `private OffsetDateTime updatedAt;` fields to `SteeringVersion` entity in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/entity/SteeringVersion.java`
- [X] T006 [P] Create `SteeringVersionVO` DTO (fields: id, versionNumber, status, changeSummary, createdAt, updatedAt) in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/response/SteeringVersionVO.java`
- [X] T007 [P] Create `SteeringVersionDetailVO` DTO (fields: id, steeringId, versionNumber, title, content, tags, keywords, status, changeSummary, createdAt, updatedAt) in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/response/SteeringVersionDetailVO.java`
- [X] T008 [P] Extend `SteeringStatus` TypeScript union type with `'superseded'` and add `SteeringVersionVO` / `SteeringVersionDetailVO` interfaces per contracts/api.md in `steering-hub-frontend/src/types/index.ts`

**Checkpoint**: Foundation ready — all enums, entities, and types updated. User story phases can now begin in parallel.

---

## Phase 3: User Story 1 — 搜索始终返回 active 版本 (Priority: P1) 🎯 MVP

**Goal**: When an active spec is edited, system creates a new draft version instead of overwriting the active content — preserving search index fidelity.

**Independent Test**: Create + activate a spec (v1), edit it, submit for pending_review (v2), run hybrid search — verify response title/content matches v1 exactly.

### Implementation for User Story 1

- [X] T009 [US1] Add `selectMaxVersionBySteeringId(@Param("steeringId") Long steeringId)` to `SteeringVersionMapper.java` and implement `<select id="selectMaxVersionBySteeringId">SELECT MAX(version) FROM steering_version WHERE steering_id=#{steeringId}</select>` in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/SteeringVersionMapper.java` and `steering-hub-backend/steering-service/src/main/resources/mapper/SteeringVersionMapper.xml`
- [X] T010 [US1] Refactor `updateSteering()` in `SteeringServiceImpl.java`: when `steering.status == ACTIVE`, do NOT overwrite `steering.content/title/tags/status`; instead insert new `SteeringVersion(version = MAX+1, status = draft, title/content/tags from request)` only — leave `steering.currentVersion` unchanged until activate in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/impl/SteeringServiceImpl.java`
- [X] T010a [US1] Add duplicate `pending_review` guard in `updateSteering()` in `SteeringServiceImpl.java` (FR-006): at the start of `updateSteering`, query `steering_version WHERE steering_id=? AND status='pending_review'` via `findVersionBySteeringIdAndStatus` (T013); if a row is found throw `BusinessException(409, "存在待审核版本，请先撤回后再修改")` — prevents a spec from having more than one pending_review version simultaneously in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/impl/SteeringServiceImpl.java`
- [X] T011 [P] [US1] Add info banner in the edit form area of `SteeringDetailPage.tsx`: when `steering.status === 'active'` render an Ant Design `Alert` with message "当前规范处于生效状态，编辑将创建新草稿版本，不会直接修改现有内容" in `steering-hub-frontend/src/pages/steering/SteeringDetailPage.tsx`

**Checkpoint**: US1 complete — editing an active spec no longer overwrites the search-indexed content. Search always returns active version.

---

## Phase 4: User Story 2 — Embedding 向量锁定在 active 版本 (Priority: P2)

**Goal**: Activate transaction atomically: optimistic lock → generate embedding → supersede old active → activate new → update hot cache. Withdraw operation resets pending_review to draft without touching embedding.

**Independent Test**: Submit a revision; verify `content_embedding` in DB unchanged. Approve + activate; verify embedding regenerated with new content, `steering_version` old row status = superseded.

### Implementation for User Story 2 — Backend

- [X] T012 [US2] Add two methods to `SteeringMapper.java` and implement their XML SQL in `SteeringMapper.xml`: (1) `int claimActivateLock(@Param("id") Long id, @Param("lockVersion") Integer lockVersion)` — SQL: `UPDATE steering SET lock_version=lock_version+1 WHERE id=#{id} AND lock_version=#{lockVersion}` （乐观锁 CAS，返回影响行数；为 0 则说明并发冲突，不更新任何热缓存字段）; (2) `int commitActivate(Steering steering)` — SQL: `UPDATE steering SET title=#{title}, content=#{content}, tags=#{tags}, current_version=#{currentVersion}, status='active', embedding=#{embedding}, content_embedding=#{contentEmbedding}, updated_at=NOW() WHERE id=#{id}` （在 embedding 已生成后调用，更新热缓存；`embedding` 为原始语义搜索向量供 search-service 使用，`content_embedding` 为相似度检测向量供 Feature-001 使用，两者均需更新为新 active 版本内容；WHERE 仅用 id，lock_version 已在 claimActivateLock 中递增） — in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/SteeringMapper.java` and `steering-hub-backend/steering-service/src/main/resources/mapper/SteeringMapper.xml`
- [X] T013 [P] [US2] Add `updateVersionStatus(@Param("steeringId") Long steeringId, @Param("fromStatus") String fromStatus, @Param("toStatus") String toStatus)` and `findVersionBySteeringIdAndStatus(@Param("steeringId") Long steeringId, @Param("status") String status)` to `SteeringVersionMapper.java` and implement XML SQL with `UPDATE steering_version SET status=#{toStatus}, updated_at=NOW() WHERE steering_id=#{steeringId} AND status=#{fromStatus}` and `SELECT * FROM steering_version WHERE steering_id=#{steeringId} AND status=#{status} LIMIT 1` in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/SteeringVersionMapper.java` and `steering-hub-backend/steering-service/src/main/resources/mapper/SteeringVersionMapper.xml`
- [X] T014 [US2] Refactor `reviewSteering(ACTIVATE)` in `SteeringServiceImpl.java` as `@Transactional` 7-step sequence: (1) `claimActivateLock(id, steering.getLockVersion())` — if 0 rows returned throw `BusinessException(409, "并发冲突，请刷新后重试")`（仅递增 lock_version，不触碰热缓存字段）; (2) fetch `steering_version` where `status='approved'`; (3) call Bedrock to generate `embedding` for approved version content — exception propagates and causes full rollback（lock_version 已递增，调用方需刷新后重试）; (4) `updateVersionStatus(steeringId, "active", "superseded")`; (5) `updateVersionStatus(steeringId, "approved", "active")`; (6) populate a `Steering` object with newVersion.title/content/tags/version（作为 currentVersion）以及 Step 3 生成的 embedding（同时赋给 embedding 和 contentEmbedding 字段），调用 `commitActivate(steering)` 更新主表热缓存; (7) insert `SteeringReview(steeringId, action=activate, comment)` — in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/impl/SteeringServiceImpl.java`
- [X] T015 [US2] Implement `reviewSteering(WITHDRAW)` in `SteeringServiceImpl.java`: call `updateVersionStatus(steeringId, "pending_review", "draft")`; if `steering.status == PENDING_REVIEW` (no active version exists) update `steering.status = draft`; insert `SteeringReview(action=withdraw, comment)`; do NOT touch `steering.embedding/content_embedding` — in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/impl/SteeringServiceImpl.java`

### Implementation for User Story 2 — Frontend

- [X] T016 [P] [US2] Add `withdraw(id: number, comment?: string): Promise<void>` method to `steeringService.ts` calling `POST /api/v1/web/steerings/${id}/review` with body `{ action: 'withdraw', comment }` in `steering-hub-frontend/src/services/steeringService.ts`
- [X] T017 [US2] Add diff-hint banner to `SteeringDetailPage.tsx` approval area: when `steering.status === 'active'` AND a pending_review version exists in the version list, render an Ant Design `Alert` with message "存在待审核的修订版本，当前搜索返回的仍为已生效版本内容" in `steering-hub-frontend/src/pages/steering/SteeringDetailPage.tsx`
- [X] T018 [P] [US2] Add withdraw button to `SteeringListPage.tsx`: render "撤回" Ant Design `Button` on spec cards/rows where `status === 'pending_review'`; on confirm call `steeringService.withdraw(id)` then refresh list in `steering-hub-frontend/src/pages/steering/SteeringListPage.tsx`

**Checkpoint**: US2 complete — activate is fully atomic, embedding updates only on activate, withdraw correctly restores draft state.

---

## Phase 5: User Story 3 — 查看规范版本历史列表 (Priority: P3)

**Goal**: Users view complete version history in "版本历史" Tab on the detail page; clicking any version row opens a read-only content modal.

**Independent Test**: Open a spec with 3+ versions → Tab shows all versions in descending version number order with status badges; click v1 row → readonly modal renders full title/content/tags/changeSummary.

### Implementation for User Story 3 — Backend

- [X] T019 [P] [US3] Add `listVersionsBySteeringId(@Param("steeringId") Long steeringId, @Param("offset") long offset, @Param("size") long size)` and `findVersionByNumber(@Param("steeringId") Long steeringId, @Param("versionNumber") int versionNumber)` to `SteeringVersionMapper.java`; implement XML SQL: `SELECT id, steering_id, version, title, content, tags, keywords, change_log, status, created_by, created_at, updated_at FROM steering_version WHERE steering_id=#{steeringId} ORDER BY version DESC LIMIT #{size} OFFSET #{offset}` and `SELECT id, steering_id, version, title, content, tags, keywords, change_log, status, created_by, created_at, updated_at FROM steering_version WHERE steering_id=#{steeringId} AND version=#{versionNumber}`（注：DB 列名为 `version`，Java 参数 `#{versionNumber}` 对应此列；Java VO 字段 `versionNumber` 通过 MyBatis resultMap 或 `@TableField` 映射；与 T009 的 `SELECT MAX(version)` 一致） in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/SteeringVersionMapper.java` and `steering-hub-backend/steering-service/src/main/resources/mapper/SteeringVersionMapper.xml`
- [X] T020 [US3] Add `IPage<SteeringVersionVO> listVersions(Long id, long current, long size)` and `SteeringVersionDetailVO getVersionDetail(Long id, int versionNumber)` signatures to `SteeringService.java` interface in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/SteeringService.java`
- [X] T021 [US3] Implement `listVersions()` (maps `changeLog → changeSummary` in VO, manual `IPage` construction using total count + list) and `getVersionDetail()` (throws `BusinessException(404)` if version not found) in `SteeringServiceImpl.java` in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/impl/SteeringServiceImpl.java`
- [X] T022 [US3] Add `GET /{id}/versions` (query params: current=1, size=20) returning `Result<IPage<SteeringVersionVO>>` and `GET /{id}/versions/{versionNumber}` returning `Result<SteeringVersionDetailVO>` to `SteeringController.java` in `steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/controller/SteeringController.java`

### Implementation for User Story 3 — Frontend

- [X] T023 [P] [US3] Add `listVersions(id: number, current?: number, size?: number): Promise<PageResult<SteeringVersionVO>>` and `getVersionDetail(id: number, versionNumber: number): Promise<SteeringVersionDetailVO>` to `steeringService.ts` calling `GET /api/v1/web/steerings/${id}/versions` in `steering-hub-frontend/src/services/steeringService.ts`
- [X] T024 [US3] Add "版本历史" Tab to `SteeringDetailPage.tsx`: render Ant Design `Table` listing versions by versionNumber desc with columns (版本号, 状态 badge, 修改摘要, 更新时间); use `src/components/Pagination.tsx` when total > 20; clicking any row opens Ant Design `Modal` displaying `SteeringVersionDetailVO` fields (title/content/tags/changeSummary) in read-only mode with no edit button in `steering-hub-frontend/src/pages/steering/SteeringDetailPage.tsx`

**Checkpoint**: US3 complete — version history Tab is live with pagination and read-only version detail modal.

---

## Phase 6: User Story 4 — 版本状态自动流转 superseded (Priority: P4)

**Goal**: UI correctly displays and distinguishes `superseded` ("已被取代", gray) vs `deprecated` status in all views.

**Independent Test**: After activate, verify list page and detail page render old version with "已被取代" gray badge (not "已废弃").

### Implementation for User Story 4

- [X] T025 [P] [US4] Add `superseded` entry (label: "已被取代", color: gray / Ant Design `default` tag color) to the status label/color map in `SteeringDetailPage.tsx` status rendering logic in `steering-hub-frontend/src/pages/steering/SteeringDetailPage.tsx`
- [X] T026 [P] [US4] Add `superseded` entry (label: "已被取代", Ant Design `Tag` color: `default`) to the status badge map in `SteeringListPage.tsx` so superseded specs render correctly in the list view in `steering-hub-frontend/src/pages/steering/SteeringListPage.tsx`

**Note**: The automatic superseding logic is fully implemented in T014 (activate transaction). This phase adds only the missing UI display support.

**Checkpoint**: US4 complete — superseded state flows automatically on activate and is correctly displayed across all UI surfaces.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T027 [P] Verify `SteeringMapper.xml` `fullTextSearch` and `vectorSearch` query blocks still contain `AND status = 'active'` filter (no regression from Phase 2–6 changes) in `steering-hub-backend/steering-service/src/main/resources/mapper/SteeringMapper.xml`
- [X] T028 Run quickstart.md verifications 1–5 end-to-end: (1) search returns active only, (2) embedding unchanged after submit, (3) activate triggers superseded + embedding update, (4) 409 on concurrent activate, (5) version history Tab renders correctly in browser

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires T001 complete; **blocks all user stories**
- **US1 (Phase 3)**: Requires Phase 2 complete; T010 requires T009; T010a requires T013 (uses `findVersionBySteeringIdAndStatus`) and Phase 2
- **US2 (Phase 4)**: Requires Phase 2 complete; T014 requires T012 + T013; T015 requires T013
- **US3 (Phase 5)**: Requires Phase 2 complete; T020/T021/T022 require T019; T024 requires T023
- **US4 (Phase 6)**: Requires Phase 4 complete (T014 implements auto-supersede logic)
- **Polish (Phase 7)**: Requires all user stories complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories — start after Phase 2
- **US2 (P2)**: No dependency on US1 — start after Phase 2 (can parallelize with US1)
- **US3 (P3)**: No dependency on US1/US2 — start after Phase 2 (can parallelize)
- **US4 (P4)**: Depends on US2 (T014 must complete for the supersede transition to work)

### Within Each User Story

- Backend: Mapper (interface + XML) → Service implementation → Controller
- Frontend: Service methods → UI component
- Backend and frontend work within the same story can proceed in parallel

### Parallel Opportunities

- T002–T008 (Phase 2): All parallelizable — different files
- T012 and T013 (Phase 4 backend): Parallelizable — different mapper files
- T016, T017, T018 (Phase 4 frontend): Parallelizable with each other and with backend T012/T013
- T019 (Phase 5 backend): Parallelizable with T023 (frontend)
- T025, T026 (Phase 6): Parallelizable — different files

---

## Parallel Example: User Story 2

```bash
# These two mapper tasks can run in parallel (different files):
Task T012: "Add activateUpdate SQL to SteeringMapper.java + SteeringMapper.xml"
Task T013: "Add updateVersionStatus + findVersionByStatus to SteeringVersionMapper.java + SteeringVersionMapper.xml"

# Then sequentially (both depend on T012 + T013):
Task T014: "Refactor reviewSteering(ACTIVATE) — 6-step transaction"
Task T015: "Implement reviewSteering(WITHDRAW)"  # depends on T013 only

# Frontend tasks (parallel with backend mapper work):
Task T016: "Add withdraw() to steeringService.ts"
Task T017: "Add diff hint banner to SteeringDetailPage.tsx"
Task T018: "Add withdraw button to SteeringListPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: DB Migration
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (updateSteering fix + edit notice)
4. **STOP and VALIDATE**: Search returns active version while pending_review exists
5. Deploy/demo — core search correctness bug is fixed

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → Search correctness fixed — **MVP**
3. Phase 4 (US2) → Activate transaction + withdraw + embedding locked
4. Phase 5 (US3) → Version history browsable in UI
5. Phase 6 (US4) → Superseded state fully visible in all UI
6. Phase 7 → Polish + end-to-end validation via quickstart.md

---

## Notes

- [P] tasks operate on different files with no shared dependencies — safe to parallelize
- Constitution rule III: All new conditional queries MUST use XML Mapper — no `QueryWrapper` or `LambdaQueryWrapper` in new code
- Constitution rule V: Version history list pagination MUST use `src/components/Pagination.tsx`
- T014 is the highest-risk task (7-step transaction + synchronous Bedrock call) — implement and test carefully
- Embedding generation in T014 is synchronous and within the transaction; failure rolls back entire activate (FR-003)
- Optimistic lock in T014: `activateUpdate` returning 0 rows → throw `BusinessException(409, "并发冲突，请刷新后重试")` (SC-007)
- `steering_version.change_log` DB column maps to `changeLog` in Java entity and to `changeSummary` in VO layer (Decision 7 in research.md) — do NOT rename the DB column
