# Data Model: 仓库管理与规范绑定

**Feature**: 003-repo-management
**Phase**: 1 — Design
**Date**: 2026-03-23

---

## 现有表（不修改）

### `repo` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL PK | 自增主键 |
| name | VARCHAR(200) NOT NULL | 仓库显示名称 |
| full_name | VARCHAR(300) NOT NULL UNIQUE | 唯一全名，格式 `org/repo` |
| description | TEXT | 描述 |
| url | VARCHAR(500) | Git URL |
| language | VARCHAR(100) | 主要编程语言 |
| team | VARCHAR(200) | 所属团队 |
| enabled | BOOLEAN NOT NULL DEFAULT TRUE | 启用/停用状态 |
| created_at | TIMESTAMPTZ NOT NULL | 创建时间 |
| updated_at | TIMESTAMPTZ NOT NULL | 最后更新时间 |
| deleted | BOOLEAN NOT NULL DEFAULT FALSE | 软删除标记（@TableLogic） |

---

## 新增表

### `repo_steering` 表（仓库-规范绑定）

```sql
CREATE TABLE IF NOT EXISTS repo_steering (
    id          BIGSERIAL       PRIMARY KEY,
    repo_id     BIGINT          NOT NULL REFERENCES repo(id),
    steering_id BIGINT          NOT NULL REFERENCES steering(id),
    mandatory   BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_repo_steering UNIQUE (repo_id, steering_id)
);

CREATE INDEX IF NOT EXISTS idx_repo_steering_repo_id ON repo_steering(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_steering_steering_id ON repo_steering(steering_id);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL PK | 自增主键 |
| repo_id | BIGINT NOT NULL FK→repo.id | 仓库 ID |
| steering_id | BIGINT NOT NULL FK→steering.id | 规范 ID |
| mandatory | BOOLEAN NOT NULL DEFAULT FALSE | 是否强制遵守 |
| created_at | TIMESTAMPTZ | 绑定创建时间 |
| updated_at | TIMESTAMPTZ | 最后更新时间 |

**约束**:
- `UNIQUE(repo_id, steering_id)` — 幂等保证，重复绑定时 UPDATE mandatory
- 无 `deleted` 字段，解绑时物理删除（hard delete）
- 仓库软删除时，同步物理删除对应的所有 repo_steering 行（事务内）

**索引**:
- `idx_repo_steering_repo_id ON repo_steering(repo_id)` — 按仓库查绑定规范列表
- `idx_repo_steering_steering_id ON repo_steering(steering_id)` — 按规范反向查引用仓库列表

---

## 修改的 DTO

### `SearchRequest`（新增字段）

```java
// 新增字段
private String repo;  // 仓库 full_name，可选，如 "org/my-service"
```

---

## Java 实体

### `RepoSteering` 实体

```java
@Data
@TableName("repo_steering")
public class RepoSteering implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long repoId;
    private Long steeringId;
    private Boolean mandatory;
    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private OffsetDateTime updatedAt;
}
```

---

## 状态转换

### Repo enabled 状态

```
active (enabled=true)  ←→  inactive (enabled=false)
       ↓ deleteRepo()
   deleted=true (软删除)，同步物理删除 repo_steering
```

### 绑定关系

```
unbind → bind (INSERT or UPDATE mandatory)
bind   → unbind (DELETE, hard delete)
```

---

## 验证规则

| 字段 | 规则 |
|------|------|
| repo.name | 非空，max 200 |
| repo.full_name | 非空，max 300，全局唯一（含软删除记录），格式建议 `org/repo` |
| repo.url | 可选，max 500 |
| repo.team | 可选，max 200 |
| repo_steering.repo_id | 必须指向 deleted=false 的仓库 |
| repo_steering.steering_id | 必须指向 deleted=false 的规范 |
| repo_steering.mandatory | 默认 false |

---

## 业务规则

1. **full_name 唯一性**: 包含已软删除的仓库，防止同名复活。
2. **绑定幂等**: `UPSERT` 语义——对同一 `(repo_id, steering_id)` 重复提交时更新 `mandatory`，不产生重复行。
3. **规范状态警告**: 绑定 deprecated/draft 状态的规范，接口仍允许，但响应中加 `warning` 字段提示。
4. **MCP boost 生效条件**: 仅当 repo.enabled=true 且 repo.deleted=false 时，绑定规范才参与搜索 boost；否则忽略 repo 参数。
5. **级联删除**: 仓库软删除时，同一事务内物理删除其所有 repo_steering 行。
