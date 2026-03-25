# Data Model: 规范相似性检测

**Feature**: 001-similarity-conflict-detection（相似性检测部分）
**Date**: 2026-03-22

---

## 新增表

### 1. `health_check_task`（健康度检测任务）

```sql
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
```

**状态转换**:
```
running → completed（检测成功完成）
running → failed（异常中断）
```

---

### 2. `similar_spec_pair`（相似规范对）

```sql
CREATE TABLE similar_spec_pair (
    id              BIGSERIAL       PRIMARY KEY,
    task_id         BIGINT          NOT NULL REFERENCES health_check_task(id),
    spec_a_id       BIGINT          NOT NULL REFERENCES steering(id),
    spec_b_id       BIGINT          NOT NULL REFERENCES steering(id),
    overall_score   NUMERIC(4,3)    NOT NULL,   -- 综合相似度 0.000-1.000
    vector_score    NUMERIC(4,3),               -- 向量余弦相似度（可为 NULL，若任一方 embedding 为 NULL）
    title_score     NUMERIC(4,3),               -- 标题 Jaccard 相似度
    tags_score      NUMERIC(4,3),               -- tags 集合重叠率
    keywords_score  NUMERIC(4,3),               -- keywords 集合重叠率
    reason_tags     VARCHAR(500),               -- JSON 数组：["标题相似","tags重叠","关键词重叠","内容语义相近"]
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (task_id, spec_a_id, spec_b_id),
    CONSTRAINT chk_pair_order CHECK (spec_a_id < spec_b_id)  -- 确保 (a,b) 和 (b,a) 只存一条
);

CREATE INDEX idx_similar_pair_task ON similar_spec_pair(task_id);
CREATE INDEX idx_similar_pair_score ON similar_spec_pair(task_id, overall_score DESC);

COMMENT ON TABLE similar_spec_pair IS '相似规范对检测结果';
COMMENT ON COLUMN similar_spec_pair.reason_tags IS 'JSON 数组，包含触发相似的维度标签';
COMMENT ON COLUMN similar_spec_pair.overall_score IS '加权综合分数：向量0.5+标题0.2+tags0.15+关键词0.15';
```

**reason_tags 枚举值**:
| 值 | 触发条件 |
|---|---|
| `内容语义相近` | vector_score >= 0.75 |
| `标题相似` | title_score >= 0.6 |
| `tags重叠` | tags_score >= 0.5 |
| `关键词重叠` | keywords_score >= 0.5 |

---

## 已有表（只读，不修改）

### `steering`（规范主表）— 相关字段

| 字段 | 类型 | 用途 |
|------|------|------|
| `id` | BIGINT | 规范 ID |
| `title` | VARCHAR(500) | 标题相似度计算 |
| `content` | TEXT | 内容对比展示（左右分屏） |
| `category_id` | BIGINT | 参考信息（冲突检测用，本次不用） |
| `status` | VARCHAR(20) | 过滤 `active` 规范 |
| `tags` | VARCHAR(500) | tags 重叠率计算（逗号分隔字符串） |
| `keywords` | VARCHAR(1000) | 关键词重叠率计算（逗号分隔字符串） |
| `embedding` | vector(512) | 向量余弦相似度计算 |

---

## Java Entity 设计

### `HealthCheckTask.java`

```java
@Data
@TableName("health_check_task")
public class HealthCheckTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String status;             // "running" | "completed" | "failed"
    private Integer similarPairCount;
    private Integer activeSpecCount;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String errorMessage;
}
```

### `SimilarSpecPair.java`

```java
@Data
@TableName("similar_spec_pair")
public class SimilarSpecPair {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long taskId;
    private Long specAId;
    private Long specBId;
    private BigDecimal overallScore;
    private BigDecimal vectorScore;
    private BigDecimal titleScore;
    private BigDecimal tagsScore;
    private BigDecimal keywordsScore;
    private String reasonTags;         // JSON 数组字符串
    private LocalDateTime createdAt;
}
```

---

## 相似度计算逻辑

### 加权公式

```
W_vector   = 0.5  (若 embedding 为 NULL 则降为 0，其余三维重新归一化)
W_title    = 0.2
W_tags     = 0.15
W_keywords = 0.15

overall = W_vector * cosineSim + W_title * jaccardTitle + W_tags * tagsOverlap + W_keywords * keywordsOverlap
```

### 向量余弦相似度（Java 实现）

```java
// 已存在于 steering 表的 embedding float[]
float cosineSimilarity(float[] a, float[] b) {
    double dot = 0, normA = 0, normB = 0;
    for (int i = 0; i < a.length; i++) {
        dot   += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return (normA == 0 || normB == 0) ? 0f : (float)(dot / (Math.sqrt(normA) * Math.sqrt(normB)));
}
```

> **注意**：不调用 Bedrock，直接使用已持久化的 `embedding` 字段计算。

### 标题 Jaccard（tokenize by 非字母数字边界）

```java
double jaccardTitle(String titleA, String titleB) {
    Set<String> a = tokenize(titleA);
    Set<String> b = tokenize(titleB);
    Set<String> intersection = new HashSet<>(a);
    intersection.retainAll(b);
    Set<String> union = new HashSet<>(a);
    union.addAll(b);
    return union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();
}
```

### Tags/Keywords 重叠率（intersection / min(|A|, |B|)）

```java
double overlapRate(String csvA, String csvB) {
    if (csvA == null || csvB == null) return 0.0;
    Set<String> a = parseCsv(csvA);
    Set<String> b = parseCsv(csvB);
    if (a.isEmpty() || b.isEmpty()) return 0.0;
    Set<String> intersection = new HashSet<>(a);
    intersection.retainAll(b);
    return (double) intersection.size() / Math.min(a.size(), b.size());
}
```

---

## 数据库迁移文件

见 `docs/sql/migration_001_similarity.sql`（在 quickstart.md 中说明执行方式）
