-- Migration 001: Similarity Detection
-- Adds health_check_task, similar_spec_pair tables and content_embedding column to steering

-- 1. health_check_task table
CREATE TABLE health_check_task (
    id                  BIGSERIAL       PRIMARY KEY,
    status              VARCHAR(20)     NOT NULL DEFAULT 'running'
                                        CHECK (status IN ('running', 'completed', 'failed')),
    similar_pair_count  INT             NOT NULL DEFAULT 0,
    active_spec_count   INT             NOT NULL DEFAULT 0,
    started_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    error_message       TEXT
);

CREATE INDEX idx_health_check_task_status ON health_check_task(status);
CREATE INDEX idx_health_check_task_started ON health_check_task(started_at DESC);

COMMENT ON TABLE health_check_task IS '规范健康度检测任务';
COMMENT ON COLUMN health_check_task.status IS 'running=进行中, completed=已完成, failed=失败';
COMMENT ON COLUMN health_check_task.similar_pair_count IS '本次检测发现的相似规范对数量（综合分数 >= 阈值）';
COMMENT ON COLUMN health_check_task.active_spec_count IS '本次参与检测的 active 规范总数';

-- 2. similar_spec_pair table
CREATE TABLE similar_spec_pair (
    id              BIGSERIAL       PRIMARY KEY,
    task_id         BIGINT          NOT NULL REFERENCES health_check_task(id),
    spec_a_id       BIGINT          NOT NULL REFERENCES steering(id),
    spec_b_id       BIGINT          NOT NULL REFERENCES steering(id),
    overall_score   NUMERIC(4,3)    NOT NULL,
    vector_score    NUMERIC(4,3),
    title_score     NUMERIC(4,3),
    tags_score      NUMERIC(4,3),
    keywords_score  NUMERIC(4,3),
    reason_tags     VARCHAR(500),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (task_id, spec_a_id, spec_b_id),
    CONSTRAINT chk_pair_order CHECK (spec_a_id < spec_b_id)
);

CREATE INDEX idx_similar_pair_task ON similar_spec_pair(task_id);
CREATE INDEX idx_similar_pair_score ON similar_spec_pair(task_id, overall_score DESC);

COMMENT ON TABLE similar_spec_pair IS '相似规范对检测结果';
COMMENT ON COLUMN similar_spec_pair.reason_tags IS 'JSON 数组，包含触发相似的维度标签';
COMMENT ON COLUMN similar_spec_pair.overall_score IS '内容向量余弦相似度 0.000-1.000';

-- 3. Add content_embedding column to steering
ALTER TABLE steering ADD COLUMN content_embedding vector(512);
CREATE INDEX idx_steering_content_embedding ON steering USING hnsw (content_embedding vector_cosine_ops);
