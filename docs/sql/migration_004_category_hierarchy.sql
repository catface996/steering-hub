-- Feature 004: 分级 Category 导航 - DAG 关联表
-- ============================================================

-- 段 1：建表 + 索引
CREATE TABLE IF NOT EXISTS category_hierarchy (
    parent_category_id  BIGINT  NOT NULL REFERENCES steering_category(id),
    child_category_id   BIGINT  NOT NULL REFERENCES steering_category(id),
    sort_order          INT     NOT NULL DEFAULT 0,
    PRIMARY KEY (parent_category_id, child_category_id),
    CONSTRAINT chk_no_self_loop CHECK (parent_category_id != child_category_id)
);

CREATE INDEX IF NOT EXISTS idx_cat_hier_parent ON category_hierarchy(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_cat_hier_child  ON category_hierarchy(child_category_id);

-- 段 2：插入子分类（8 条，ON CONFLICT DO NOTHING 保证幂等）
INSERT INTO steering_category (name, code, description, sort_order, enabled, deleted)
VALUES
    ('Java 后端',  'java-backend', 'Java / SpringBoot / DDD / MyBatisPlus',        1, true, false),
    ('前端',       'frontend',     'React / Ant Design / 组件 / Hook',              2, true, false),
    ('TypeScript', 'typescript',   'TypeScript 类型系统',                           3, true, false),
    ('数据访问',   'data-access',  'MyBatisPlus / Repository / XML Mapper',         4, true, false),
    ('API 设计',   'api-design',   'REST / HTTP / 接口版本 / 限流',                 1, true, false),
    ('数据库 & 缓存', 'database',  'MySQL / Redis / 索引 / 分片',                   2, true, false),
    ('DevOps',     'devops',       'Docker / Git / CI/CD',                          3, true, false),
    ('分布式',     'distributed',  '分布式锁 / 消息队列',                           4, true, false)
ON CONFLICT (code) DO NOTHING;

-- 段 3：建立 category_hierarchy 关系（SELECT 子查询保证 ID 可移植）
-- coding → java-backend / frontend / typescript / data-access
INSERT INTO category_hierarchy (parent_category_id, child_category_id, sort_order)
SELECT p.id, c.id, c.sort_order
FROM steering_category p, steering_category c
WHERE p.code = 'coding'
  AND c.code IN ('java-backend', 'frontend', 'typescript', 'data-access')
ON CONFLICT DO NOTHING;

-- architecture → api-design / database / devops / distributed
INSERT INTO category_hierarchy (parent_category_id, child_category_id, sort_order)
SELECT p.id, c.id, c.sort_order
FROM steering_category p, steering_category c
WHERE p.code = 'architecture'
  AND c.code IN ('api-design', 'database', 'devops', 'distributed')
ON CONFLICT DO NOTHING;
