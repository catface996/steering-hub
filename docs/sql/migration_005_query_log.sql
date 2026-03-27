-- Migration 005: 创建 steering_query_log 表（检索日志）
-- 该表被 migration_004 引用但从未创建

CREATE TABLE IF NOT EXISTS steering_query_log (
    id                  BIGSERIAL       PRIMARY KEY,
    query_text          TEXT            NOT NULL,
    search_mode         VARCHAR(50),
    result_count        INT,
    result_steering_ids TEXT,
    source              VARCHAR(50),
    repo                VARCHAR(300),
    task_description    TEXT,
    response_time_ms    INT,
    is_effective        BOOLEAN,
    failure_reason      TEXT,
    expected_topic      VARCHAR(500),
    model_name          VARCHAR(100),
    agent_name          VARCHAR(100),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_log_created_at ON steering_query_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_log_is_effective ON steering_query_log(is_effective);
CREATE INDEX IF NOT EXISTS idx_query_log_query_text ON steering_query_log USING gin(to_tsvector('simple', query_text));

COMMENT ON TABLE steering_query_log IS '规范检索日志表';
COMMENT ON COLUMN steering_query_log.search_mode IS '检索模式: semantic/fulltext/hybrid';
COMMENT ON COLUMN steering_query_log.result_steering_ids IS '命中规范 ID 列表，JSON 数组';
COMMENT ON COLUMN steering_query_log.source IS '来源: mcp/web';
COMMENT ON COLUMN steering_query_log.is_effective IS '是否有效查询: true=有效, false=无效, null=待评估';
COMMENT ON COLUMN steering_query_log.model_name IS 'Agent 使用的模型名称';
COMMENT ON COLUMN steering_query_log.agent_name IS 'Agent 类型/名称';
