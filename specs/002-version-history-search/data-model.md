# Data Model: 规范版本管理与搜索行为优化

**Branch**: `002-version-history-search` | **Date**: 2026-03-22

---

## 1. 数据库变更

### 1.1 steering 表（修改）

新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `lock_version` | `INT NOT NULL DEFAULT 0` | 乐观锁版本号，activate 时原子递增 |

CHECK 约束更新：
```sql
-- status 增加 superseded
CHECK (status IN ('draft','pending_review','approved','rejected','active','superseded','deprecated'))
```

> `steering.status` 语义：反映主表（active 热缓存）的存在性。当有 active 版本时 = 'active'，当 active 版本被 deprecated 时 = 'deprecated'，当没有任何 active 版本时 = 当前最新版本的状态。

### 1.2 steering_version 表（修改）

新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | `VARCHAR(20) NOT NULL DEFAULT 'active'` | 版本状态，见状态流转 |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | 状态更新时间（用于前端显示） |

完整表结构（after migration）：

```sql
CREATE TABLE steering_version (
    id              BIGSERIAL    PRIMARY KEY,
    steering_id     BIGINT       NOT NULL REFERENCES steering(id),
    version         INT          NOT NULL,                  -- 版本号（1,2,3...）
    title           VARCHAR(500) NOT NULL,
    content         TEXT         NOT NULL,
    tags            VARCHAR(500),
    keywords        VARCHAR(1000),
    change_log      TEXT,                                   -- 修订摘要
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft',  -- NEW
    created_by      BIGINT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),    -- NEW
    UNIQUE (steering_id, version)
);
```

### 1.3 steering_review 表（修改）

CHECK 约束更新（新增 `withdraw`）：
```sql
CHECK (action IN ('submit','approve','reject','activate','deprecate','rollback','withdraw'))
```

---

## 2. 枚举扩展

### 2.1 SteeringStatus（Java）

```java
// 新增
SUPERSEDED("superseded", "已被取代"),
```

### 2.2 ReviewAction（Java）

```java
// 新增
WITHDRAW("withdraw", "撤回"),
```

### 2.3 SteeringStatus（TypeScript）

```typescript
// types/index.ts
export type SteeringStatus =
  | 'draft' | 'pending_review' | 'approved' | 'rejected'
  | 'active' | 'superseded' | 'deprecated';  // 新增 superseded
```

---

## 3. 版本状态流转

```
draft ──→ pending_review ──→ approved ──→ active ──→ superseded (系统自动)
  ↑           │                              └──→ deprecated (人工)
  └───────────┘ (withdraw 撤回)
              └──→ rejected (回到 draft 或终结)
```

合法流转表：

| from | to | 触发动作 | 操作者 |
|------|----|---------|-------|
| draft | pending_review | SUBMIT | 作者 |
| pending_review | draft | WITHDRAW | 作者 |
| pending_review | approved | APPROVE | 审核员 |
| pending_review | rejected | REJECT | 审核员 |
| approved | active | ACTIVATE | 管理员 |
| active | superseded | — | 系统自动（新版本 ACTIVATE 触发） |
| active | deprecated | DEPRECATE | 管理员 |

---

## 4. Java Entity 变更

### 4.1 Steering.java

```java
// 新增字段
private Integer lockVersion;  // 对应 DB lock_version
```

### 4.2 SteeringVersion.java

```java
// 新增字段
private String status;         // 版本状态（使用 String 或 SteeringStatus 枚举）
private OffsetDateTime updatedAt;  // 需配合 FieldFill.INSERT_UPDATE

// version 字段：保持为 version（数据库列名 version）
// changeLog 字段：保持，VO 层映射为 changeSummary
```

---

## 5. 关键操作的数据变化

### 5.1 创建规范（createSteering）

| 操作 | 数据变化 |
|------|---------|
| 插入 `steering` | status=draft, currentVersion=1, lockVersion=0 |
| 插入 `steering_version` | version=1, status=draft |

### 5.2 编辑规范（updateSteering）

**当 steering.status = ACTIVE 时（核心修改）**：

| 操作 | 数据变化 |
|------|---------|
| **不**更新 `steering.content/title` | 主表热缓存保持 active 内容不变 |
| **不**更新 `steering.status` | 保持 active |
| 插入 `steering_version` | version=MAX+1, status=draft, content=新内容 |

**当 steering.status = DRAFT/REJECTED 时（原有行为）**：

| 操作 | 数据变化 |
|------|---------|
| 更新 `steering.title/content/tags/keywords` | 正常更新 |
| 插入新 `steering_version` | version=MAX+1, status=draft |

### 5.3 SUBMIT

| 操作 | 数据变化 |
|------|---------|
| 更新最新 draft `steering_version.status` → pending_review | |
| 若 steering.status != ACTIVE：更新 `steering.status` → pending_review | |
| 插入 `steering_review` | action=submit |

### 5.4 WITHDRAW（新增）

| 操作 | 数据变化 |
|------|---------|
| 更新最新 pending_review `steering_version.status` → draft | |
| 若 steering.status = PENDING_REVIEW：更新 `steering.status` → draft | |
| 插入 `steering_review` | action=withdraw |

### 5.5 APPROVE

| 操作 | 数据变化 |
|------|---------|
| 更新最新 pending_review `steering_version.status` → approved | |
| 若 steering.status = PENDING_REVIEW：更新 `steering.status` → approved | |
| 插入 `steering_review` | action=approve |

### 5.6 ACTIVATE（核心操作）

事务内按序执行：

| 步骤 | 操作 | 数据变化 |
|------|------|---------|
| 1 | `claimActivateLock(id, lockVersion)` — 仅乐观锁 CAS | `UPDATE steering SET lock_version=lock_version+1 WHERE id=? AND lock_version=?` → 返回 0 行则抛 409；不更新任何热缓存字段 |
| 2 | 找到 approved 版本行 | `SELECT * FROM steering_version WHERE steering_id=? AND status='approved' LIMIT 1` |
| 3 | 生成 embedding | 调用 Bedrock，失败则整体回滚（lock_version 已递增，调用方需刷新后重试） |
| 4 | 将旧 active 版本标为 superseded | `UPDATE steering_version SET status='superseded' WHERE steering_id=? AND status='active'` |
| 5 | 将新版本标为 active | `UPDATE steering_version SET status='active' WHERE steering_id=? AND status='approved'` |
| 6 | `commitActivate(steering)` — 更新主表热缓存 | `UPDATE steering SET title=?, content=?, tags=?, current_version=?, status='active', embedding=?, content_embedding=?, updated_at=NOW() WHERE id=?`（WHERE 仅用 id，lock_version 已在步骤 1 递增完毕） |
| 7 | 插入 steering_review | action=activate |

### 5.7 DEPRECATE

| 操作 | 数据变化 |
|------|---------|
| 更新 `steering_version WHERE status='active'` → deprecated | |
| 更新 `steering.status` → deprecated | |
| 插入 `steering_review` | action=deprecate |

---

## 6. VO 定义

### 6.1 SteeringVersionVO（版本历史列表项）

```java
public class SteeringVersionVO {
    private Long id;
    private Integer versionNumber;   // steering_version.version
    private String status;
    private String changeSummary;    // steering_version.change_log
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
```

### 6.2 SteeringVersionDetailVO（版本详情，只读）

```java
public class SteeringVersionDetailVO {
    private Long id;
    private Long steeringId;
    private Integer versionNumber;
    private String title;
    private String content;
    private String tags;            // 原始逗号分隔字符串，前端解析
    private String keywords;
    private String status;
    private String changeSummary;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
```

---

## 7. 索引更新

```sql
-- 版本状态查询加速（通过 steering_id + status 快速定位 active/pending_review 版本）
CREATE INDEX IF NOT EXISTS idx_sv_steering_status
    ON steering_version(steering_id, status);
```
