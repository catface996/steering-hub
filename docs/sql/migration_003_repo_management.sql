-- Migration 003: 仓库管理与规范绑定
-- 新增 repo_steering 关联表，repo 表已存在无需修改

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

-- Ensure full_name has UNIQUE constraint (should already exist per schema)
-- ALTER TABLE repo ADD CONSTRAINT uq_repo_full_name UNIQUE (full_name);
