-- migration_004: 在检索日志中新增 agent_name / model_name 字段，用于 Agent 使用分析
-- 执行时间：2026-03-24

ALTER TABLE steering_query_log ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);
ALTER TABLE steering_query_log ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100);

COMMENT ON COLUMN steering_query_log.model_name IS 'Agent 使用的模型名称（如 claude-sonnet-4-6、gpt-4o）';
COMMENT ON COLUMN steering_query_log.agent_name IS 'Agent 类型/名称（如 claude-code、codex、cursor），与 agent_id 区分';

-- 2026-03-24 补充：合并 agent_id → agent_name，废弃 agent_id 列
UPDATE steering_query_log SET agent_name = agent_id WHERE agent_name IS NULL AND agent_id IS NOT NULL;
ALTER TABLE steering_query_log DROP COLUMN IF EXISTS agent_id;
