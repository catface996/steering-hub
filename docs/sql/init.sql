-- ============================================================
-- Steering Hub Database Initialization Script
-- PostgreSQL 15+ with pgvector extension
-- ============================================================

-- Create database (run as superuser)
-- CREATE DATABASE steering_hub ENCODING 'UTF8' LC_COLLATE 'zh_CN.UTF-8' LC_CTYPE 'zh_CN.UTF-8' TEMPLATE template0;
-- CREATE USER steering_hub WITH PASSWORD 'steering_hub_pass';
-- GRANT ALL PRIVILEGES ON DATABASE steering_hub TO steering_hub;
-- \c steering_hub

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;
-- Optional: Chinese full-text search (requires zhparser compiled)
-- CREATE EXTENSION IF NOT EXISTS zhparser;
-- CREATE TEXT SEARCH CONFIGURATION chinese (PARSER = zhparser);
-- ALTER TEXT SEARCH CONFIGURATION chinese ADD MAPPING FOR n,v,a,i,e,l WITH simple;

-- ============================================================
-- Table: spec_category (规范分类)
-- ============================================================
CREATE TABLE IF NOT EXISTS spec_category (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL,
    code        VARCHAR(50)     NOT NULL UNIQUE,
    description TEXT,
    parent_id   BIGINT          REFERENCES spec_category(id),
    sort_order  INT             NOT NULL DEFAULT 0,
    enabled     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted     BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_spec_category_parent ON spec_category(parent_id);
CREATE INDEX IF NOT EXISTS idx_spec_category_code ON spec_category(code) WHERE deleted = FALSE;

COMMENT ON TABLE spec_category IS '规范分类表';
COMMENT ON COLUMN spec_category.code IS '分类唯一编码，如: coding/business/architecture';

-- ============================================================
-- Table: spec (规范主表)
-- ============================================================
CREATE TABLE IF NOT EXISTS spec (
    id              BIGSERIAL       PRIMARY KEY,
    title           VARCHAR(500)    NOT NULL,
    content         TEXT            NOT NULL,
    category_id     BIGINT          NOT NULL REFERENCES spec_category(id),
    status          VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft','pending_review','approved','rejected','active','deprecated')),
    current_version INT             NOT NULL DEFAULT 1,
    tags            VARCHAR(500),
    keywords        VARCHAR(1000),
    author          VARCHAR(100),
    agent_queries   TEXT,
    -- pgvector: 512-dimensional embedding (Titan Embeddings v2)
    embedding       vector(512),
    created_by      BIGINT,
    updated_by      BIGINT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted         BOOLEAN         NOT NULL DEFAULT FALSE
);

-- Index for status filtering (most common query)
CREATE INDEX IF NOT EXISTS idx_spec_status ON spec(status) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_spec_category ON spec(category_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_spec_created_at ON spec(created_at DESC) WHERE deleted = FALSE;

-- pgvector HNSW index for fast approximate nearest neighbor search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_spec_embedding_hnsw
    ON spec USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Full-text search index (simple config; switch to 'chinese' if zhparser is available)
CREATE INDEX IF NOT EXISTS idx_spec_fts
    ON spec USING gin(
        to_tsvector('simple',
            coalesce(title,'') || ' ' ||
            coalesce(content,'') || ' ' ||
            coalesce(keywords,'')
        )
    ) WHERE deleted = FALSE;

COMMENT ON TABLE spec IS '规范主表';
COMMENT ON COLUMN spec.embedding IS 'Amazon Bedrock Titan Embeddings v2 生成的 512 维向量';
COMMENT ON COLUMN spec.status IS 'draft=草稿, pending_review=待审核, approved=已通过, rejected=已驳回, active=已生效, deprecated=已废弃';

-- ============================================================
-- Table: spec_version (规范版本历史)
-- ============================================================
CREATE TABLE IF NOT EXISTS spec_version (
    id              BIGSERIAL   PRIMARY KEY,
    spec_id         BIGINT      NOT NULL REFERENCES spec(id),
    version         INT         NOT NULL,
    title           VARCHAR(500) NOT NULL,
    content         TEXT        NOT NULL,
    tags            VARCHAR(500),
    keywords        VARCHAR(1000),
    change_log      TEXT,
    created_by      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (spec_id, version)
);

CREATE INDEX IF NOT EXISTS idx_spec_version_spec ON spec_version(spec_id);

COMMENT ON TABLE spec_version IS '规范版本历史表，每次修改生成新版本';

-- ============================================================
-- Table: spec_review (审核记录)
-- ============================================================
CREATE TABLE IF NOT EXISTS spec_review (
    id              BIGSERIAL   PRIMARY KEY,
    spec_id         BIGINT      NOT NULL REFERENCES spec(id),
    spec_version    INT         NOT NULL,
    action          VARCHAR(20) NOT NULL
                                CHECK (action IN ('submit','approve','reject','activate','deprecate','rollback')),
    comment         TEXT,
    reviewer_id     BIGINT,
    reviewer_name   VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spec_review_spec ON spec_review(spec_id);
CREATE INDEX IF NOT EXISTS idx_spec_review_created ON spec_review(created_at DESC);

COMMENT ON TABLE spec_review IS '审核记录表';

-- ============================================================
-- Table: repo (代码仓库注册)
-- ============================================================
CREATE TABLE IF NOT EXISTS repo (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(200)    NOT NULL,
    full_name   VARCHAR(300)    NOT NULL UNIQUE,
    description TEXT,
    url         VARCHAR(500),
    language    VARCHAR(50),
    team        VARCHAR(100),
    enabled     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted     BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_repo_full_name ON repo(full_name) WHERE deleted = FALSE;

COMMENT ON TABLE repo IS '代码仓库注册表';

-- ============================================================
-- Table: spec_usage (规范使用记录)
-- ============================================================
CREATE TABLE IF NOT EXISTS spec_usage (
    id              BIGSERIAL   PRIMARY KEY,
    spec_id         BIGINT      NOT NULL REFERENCES spec(id),
    spec_version    INT,
    repo_id         BIGINT      REFERENCES repo(id),
    repo_name       VARCHAR(300),
    task_description TEXT,
    agent_id        VARCHAR(100),
    context_type    VARCHAR(50),
    used_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spec_usage_spec ON spec_usage(spec_id);
CREATE INDEX IF NOT EXISTS idx_spec_usage_repo ON spec_usage(repo_id);
CREATE INDEX IF NOT EXISTS idx_spec_usage_used_at ON spec_usage(used_at DESC);

COMMENT ON TABLE spec_usage IS '规范使用追踪表';

-- ============================================================
-- Table: compliance_report (合规报告)
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_report (
    id              BIGSERIAL       PRIMARY KEY,
    repo_id         BIGINT          REFERENCES repo(id),
    repo_name       VARCHAR(300),
    code_snippet    TEXT            NOT NULL,
    task_description TEXT,
    score           NUMERIC(5,2)    NOT NULL DEFAULT 100,
    violations      JSONB,
    related_specs   JSONB,
    summary         TEXT,
    checked_by      VARCHAR(100),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_repo ON compliance_report(repo_id);
CREATE INDEX IF NOT EXISTS idx_compliance_score ON compliance_report(score);
CREATE INDEX IF NOT EXISTS idx_compliance_created ON compliance_report(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_violations ON compliance_report USING gin(violations);

COMMENT ON TABLE compliance_report IS '合规审查报告表';

-- ============================================================
-- Seed Data: 预置规范分类
-- ============================================================
INSERT INTO spec_category (name, code, description, sort_order) VALUES
    ('编码规范', 'coding',       '代码风格、命名约定、注释规范等', 1),
    ('架构规范', 'architecture', '系统架构、模块划分、依赖管理等', 2),
    ('业务规范', 'business',     '业务逻辑、领域模型、接口契约等', 3),
    ('安全规范', 'security',     '认证授权、数据加密、漏洞防范等', 4),
    ('测试规范', 'testing',      '单元测试、集成测试、测试覆盖率等', 5),
    ('文档规范', 'documentation','API文档、注释、变更记录等', 6)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Functions & Triggers: auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_spec_category_updated_at
    BEFORE UPDATE ON spec_category
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_spec_updated_at
    BEFORE UPDATE ON spec
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_repo_updated_at
    BEFORE UPDATE ON repo
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: sys_user (系统用户)
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_user (
    id          BIGSERIAL       PRIMARY KEY,
    username    VARCHAR(50)     NOT NULL UNIQUE,
    password    VARCHAR(100)    NOT NULL,
    nickname    VARCHAR(50),
    role        VARCHAR(20)     NOT NULL DEFAULT 'user'
                                CHECK (role IN ('admin', 'user')),
    enabled     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sys_user_username ON sys_user(username) WHERE enabled = TRUE;

COMMENT ON TABLE sys_user IS '系统用户表';
COMMENT ON COLUMN sys_user.password IS 'BCrypt 加密的密码';
COMMENT ON COLUMN sys_user.role IS 'admin=管理员, user=普通用户';

CREATE TRIGGER trg_sys_user_updated_at
    BEFORE UPDATE ON sys_user
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Seed Data: 默认管理员账号
-- ============================================================
-- 默认管理员账号 (用户名: admin, 密码: admin123)
INSERT INTO sys_user (username, password, nickname, role)
VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKXpPSY7p9P1NQnmMJA4IqZHHxOW', '管理员', 'admin')
ON CONFLICT (username) DO NOTHING;
