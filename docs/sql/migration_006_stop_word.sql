-- migration_006_stop_word.sql
-- 创建停用词表，用于 keywords 字段过滤

CREATE TABLE IF NOT EXISTS stop_word (
    id          BIGSERIAL PRIMARY KEY,
    word        VARCHAR(100) NOT NULL,
    language    VARCHAR(10)  NOT NULL DEFAULT 'zh',
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(100)
);

COMMENT ON TABLE  stop_word              IS '停用词表';
COMMENT ON COLUMN stop_word.word         IS '停用词';
COMMENT ON COLUMN stop_word.language     IS '语言: zh-中文, en-英文';
COMMENT ON COLUMN stop_word.enabled      IS '是否启用';
COMMENT ON COLUMN stop_word.created_at   IS '创建时间';
COMMENT ON COLUMN stop_word.created_by   IS '创建人';

CREATE UNIQUE INDEX IF NOT EXISTS uk_stop_word_word ON stop_word(word);
