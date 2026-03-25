# Research: 规范版本管理与搜索行为优化

**Branch**: `002-version-history-search` | **Date**: 2026-03-22

## 1. 现有架构现状分析

### 1.1 steering 主表状态

- 字段：id, title, content, category_id, status, current_version, tags, keywords, author, agent_queries, embedding (vector 512), content_embedding (vector 512, migration_001 添加), created_by, updated_by, created_at, updated_at, deleted
- status CHECK: `draft | pending_review | approved | rejected | active | deprecated` — **缺少 `superseded`**
- **缺少** `lock_version` 字段

### 1.2 steering_version 表现状

- 字段：id, steering_id, version (INT), title, content, tags, keywords, change_log, created_by, created_at
- **缺少** `status` 字段
- **缺少** `updated_at` 字段（spec 要求显示更新时间）

### 1.3 SteeringStatus 枚举

- 现有：DRAFT, PENDING_REVIEW, APPROVED, REJECTED, ACTIVE, DEPRECATED
- **缺少** SUPERSEDED

### 1.4 ReviewAction 枚举

- 现有：SUBMIT, APPROVE, REJECT, ACTIVATE, DEPRECATE, ROLLBACK
- **缺少** WITHDRAW

### 1.5 搜索行为分析

- `SteeringMapper.xml` 中 `fullTextSearch` 和 `vectorSearch` 均已包含 `AND status = 'active'` 过滤 ✅
- **根本问题**：当前 `SteeringServiceImpl.updateSteering()` 对 ACTIVE 规范调用时，直接将 `steering.content` 覆盖为新内容并将 `steering.status` 重置为 DRAFT，导致该规范从搜索中消失而非返回旧 active 内容

### 1.6 当前 updateSteering 行为 vs. 目标行为

| 当前行为 | 目标行为 |
|---------|---------|
| 编辑后覆盖 steering.content | 编辑后仅创建 steering_version(draft)，不改 steering.content |
| 编辑后重置 steering.status=DRAFT | steering.status 仍反映当前 active 版本存在性，不因编辑改变 |
| steering.currentVersion++ | steering_version 的 version 号递增；steering.currentVersion 只在 activate 时更新 |

### 1.7 activate 操作缺失内容

当前 `reviewSteering(ACTIVATE)`：
- 仅将 `steering.status = ACTIVE`，无其他操作
- **缺失**：将旧 active 版本的 `steering_version.status` 改为 `superseded`
- **缺失**：将 `steering.content/title/tags` 更新为新版本内容（热缓存同步）
- **缺失**：重新生成 `embedding/content_embedding`
- **缺失**：乐观锁校验

### 1.8 steering_review 表的 CHECK 约束

```sql
CHECK (action IN ('submit','approve','reject','activate','deprecate','rollback'))
```
需要添加 `'withdraw'`。

---

## 2. 架构决策

### Decision 1：steering_version 拥有独立 status

- **Decision**: `steering_version` 表新增 `status VARCHAR(20)` 列，每条版本记录独立维护状态
- **Rationale**: spec 要求"规范版本历史 Tab 显示每个版本的状态"（FR-007/FR-008）；版本级状态独立于主表状态，互不干扰
- **Alternatives considered**: 仅通过 steering_review 表推算版本状态（复杂且无索引）

### Decision 2：编辑操作与主表内容解耦

- **Decision**: `updateSteering` 对 ACTIVE 规范时，**不更新** `steering.content/title/status`；仅创建新 `steering_version(status=draft)` 并递增版本号存入版本表
- **Rationale**: FR-001/FR-002 要求 embedding 和主表内容锁定到 active 版本，直到新版本 activate
- **Alternatives considered**: 引入 pending_content 字段（冗余且复杂）

### Decision 3：activate 同步更新热缓存

- **Decision**: `activate` 操作在同一事务内：① 更新 `steering.title/content/tags/currentVersion`；② 同步生成 `embedding + content_embedding`；③ 旧 active steering_version.status → superseded；④ 新版本 steering_version.status → active；⑤ steering.status → active；⑥ 乐观锁 lock_version++
- **Rationale**: FR-003/FR-004/FR-005 共同要求；同步嵌入确保事务原子性
- **Alternatives considered**: 异步生成 embedding（会导致短暂不一致，违反 FR-003 的回滚要求）

### Decision 4：乐观锁用 steering.lock_version

- **Decision**: `steering` 主表新增 `lock_version INT NOT NULL DEFAULT 0`；activate 时 `UPDATE steering SET ... lock_version = lock_version+1 WHERE id=? AND lock_version=?`；行数=0 时抛 409 BusinessException
- **Rationale**: spec 明确指定此方案；轻量无锁
- **Alternatives considered**: SELECT FOR UPDATE 悲观锁（可用但重量级，spec 明确选乐观锁）

### Decision 5：withdraw 重置版本 status

- **Decision**: `withdraw` 操作将最新 `steering_version(status=pending_review)` 改为 `draft`；steering 主表 status 也回退到对应状态（若有 active 版本则保留 active，否则回到 draft）
- **Rationale**: FR-013；允许再次编辑修订
- **Alternatives considered**: 物理删除该版本行（不可追溯，违反 FR-007）

### Decision 6：版本号与 steering.currentVersion 关系

- **Decision**: `steering_version.version_number` 在同一 steering 下单调递增，新建版本时 `MAX(version)+1`；`steering.currentVersion` 仅反映当前 active 版本号
- **Rationale**: 保持 `currentVersion` 作为"搜索返回版本号"的语义不变，同时 steering_version 可有比 currentVersion 更大的 draft 版本号

### Decision 7：steering_version 字段名

- **Decision**: 保留现有 `change_log` 字段（Java 实体的 `changeLog`），spec 中称为 `change_summary` —— 在 VO 层映射为 `changeSummary` 返回给前端，不重命名数据库列（避免影响现有数据）
- **Rationale**: 最小变更；现有数据有 changeLog 值

---

## 3. 迁移策略（FR-012）

```sql
-- Step 1: steering 加 lock_version
ALTER TABLE steering ADD COLUMN IF NOT EXISTS lock_version INT NOT NULL DEFAULT 0;

-- Step 2: steering_version 加 status 和 updated_at
ALTER TABLE steering_version ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE steering_version ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Step 3: 对现有 steering_version 记录，根据 steering 状态设置合理的初始 status
-- 最新版本 = steering 当前状态（draft/pending_review/approved/active/deprecated）
-- 历史版本（非最新）= superseded（如果规范有 active 版本）或保持 draft
UPDATE steering_version sv
SET status = (
    SELECT s.status FROM steering s WHERE s.id = sv.steering_id
)
WHERE sv.version = (
    SELECT MAX(version) FROM steering_version WHERE steering_id = sv.steering_id
);

UPDATE steering_version sv
SET status = 'superseded'
WHERE sv.version < (
    SELECT MAX(version) FROM steering_version WHERE steering_id = sv.steering_id
)
AND EXISTS (
    SELECT 1 FROM steering s WHERE s.id = sv.steering_id AND s.status = 'active'
);

-- Step 4: steering 表 status CHECK 约束加 superseded
ALTER TABLE steering DROP CONSTRAINT IF EXISTS steering_status_check;
ALTER TABLE steering ADD CONSTRAINT steering_status_check
    CHECK (status IN ('draft','pending_review','approved','rejected','active','superseded','deprecated'));

-- Step 5: steering_review action CHECK 加 withdraw
ALTER TABLE steering_review DROP CONSTRAINT IF EXISTS steering_review_action_check;
ALTER TABLE steering_review ADD CONSTRAINT steering_review_action_check
    CHECK (action IN ('submit','approve','reject','activate','deprecate','rollback','withdraw'));
```

---

## 4. 分页决策

版本历史列表：默认每页 20 条，超出时使用 `src/components/Pagination.tsx`（遵守 constitution V）。版本号倒序排列。

---

## 5. 前端状态显示扩展

新增 `superseded` 状态的 label/class：
- label: `'已被取代'`
- color: 灰色（类似 `deprecated`，但语义不同）

`SteeringStatus` TypeScript type 新增 `'superseded'`。
