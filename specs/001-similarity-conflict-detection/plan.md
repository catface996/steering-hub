# Implementation Plan: 规范相似性检测

**Branch**: `001-similarity-conflict-detection` | **Date**: 2026-03-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-similarity-conflict-detection/spec.md`

> **范围调整（用户确认）**: 本次迭代仅实现相似性检测功能。冲突检测（FR-005/FR-006）、合并操作（FR-008/FR-009）推迟到后续迭代。

## Summary

为 Steering Hub 平台新增"规范健康度"模块：后端对规范全文 content 生成专用向量（`content_embedding`），异步用 pgvector Top-K 相似搜索找出 overall_score >= 0.7 的相似规范对并持久化；前端新增健康度页面，支持触发检测、SSE 实时反馈完成、展示相似规范对列表、左右分屏内容对比。

## Technical Context

**Language/Version**: Java 17 / TypeScript 5
**Primary Dependencies**: Spring Boot 3.2, MyBatis Plus 3.x, React 18, Ant Design 5, Vite
**Storage**: PostgreSQL 15 + pgvector（新增 2 张表）
**Testing**: 手动验证（无自动化测试框架）
**Target Platform**: Linux server（后端）+ 浏览器（前端）
**Project Type**: Web application（多模块 Spring Boot + React SPA）
**Performance Goals**: 100 条 active 规范的全量检测 < 3 分钟（~4950 对）
**Constraints**: 相似度阈值默认 0.7（配置文件可调），SSE 推送延迟 < 1s
**Scale/Scope**: 预期 active 规范 ≤ 500 条（~125000 对上限）

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| 编码前查询 Steering Hub 规范 | ✅ PASS | 实现阶段每个编码场景需先调用 MCP search |
| DDD 分层：Controller → Service（无跨层调用） | ✅ PASS | 本功能无 Application/Domain 层需求，直接 Controller → Service → Mapper |
| 禁止 QueryWrapper（带条件查询用 XML Mapper） | ✅ PASS | 分页查询统一写 XML；selectById/insert 用 BaseMapper |
| 禁止 SELECT * | ✅ PASS | XML 中显式列出字段 |
| 统一返回 Result\<T\> | ✅ PASS | 所有接口遵循现有 Result 格式 |
| 接口参数 @Valid + DTO | ✅ PASS | 无复杂请求参数（trigger 无 body）；分页参数用简单 DTO |
| 前端分页用 Pagination.tsx 组件 | ✅ PASS | 相似对列表使用 src/components/Pagination.tsx |

**SSE 特殊说明**：SSE 端点（`GET /api/v1/health-check/events`）返回 `SseEmitter` 而非 `Result<T>`，这是 SSE 协议的技术必要性，不是违规。

## Project Structure

### Documentation (this feature)

```text
specs/001-similarity-conflict-detection/
├── plan.md              ✅ This file
├── research.md          ✅ Phase 0 output
├── data-model.md        ✅ Phase 1 output
├── quickstart.md        ✅ Phase 1 output
├── contracts/           ✅ Phase 1 output
│   └── api.md
└── tasks.md             ⏳ Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Backend — 新增文件（均在 steering-service 模块）
steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/
├── entity/
│   ├── HealthCheckTask.java          # 新增
│   └── SimilarSpecPair.java          # 新增
├── mapper/
│   ├── HealthCheckTaskMapper.java    # 新增
│   └── SimilarSpecPairMapper.java    # 新增
├── service/
│   ├── HealthCheckService.java       # 新增（接口）
│   └── impl/
│       └── HealthCheckServiceImpl.java  # 新增
└── controller/
    └── HealthCheckController.java    # 新增（含 SSE 端点）

steering-hub-backend/steering-service/src/main/resources/mapper/
├── HealthCheckTaskMapper.xml         # 新增
└── SimilarSpecPairMapper.xml         # 新增

# Database
docs/sql/
└── migration_001_similarity.sql      # 新增：health_check_task + similar_spec_pair 建表；steering 表新增 content_embedding vector(512)

# Frontend — 新增文件
steering-hub-frontend/src/
├── pages/health/
│   └── HealthPage.tsx                # 新增：健康度主页
├── services/
│   └── healthService.ts             # 新增：API 调用
└── App.tsx                           # 修改：添加路由
steering-hub-frontend/src/components/
└── Sidebar.tsx                       # 修改：添加导航项
```

> **Content Embedding API**（新增）：`POST /api/v1/web/steerings/{id}/content-embedding`
> 对单条规范的 `content` 字段做向量化并写入 `content_embedding`。
> 健康检测任务触发前，服务端自动批量补跑所有 `content_embedding IS NULL` 的规范。

**Structure Decision**: 复用现有 `steering-service` 模块，不新建模块（相似检测是规范管理域内的功能）。前端新增 `pages/health/` 目录，遵循现有页面组织方式。

## Complexity Tracking

无 Constitution 违规，无需说明。

---

## 设计修正：相似度基于 content_embedding（非 embedding）

> **修正时间**: 2026-03-22（实现开始前）

### 原方案（错误）

复用现有 `embedding` 字段（`title + keywords + tags` 的混合向量）计算相似度，采用四维加权公式：

```
overall = 0.5 * vector(embedding) + 0.2 * jaccardTitle + 0.15 * tagsOverlap + 0.15 * keywordsOverlap
```

### 新方案（正确）

新增 `content_embedding vector(512)` 字段，专门对规范全文 `content` 做向量化，相似度完全基于内容语义：

```
overall_score = content_embedding 向量余弦相似度（pgvector <=> 算子）
```

### 修正原因

规范相似度的核心是**内容语义**，不是标题/标签。标题相似不代表内容重复；内容重复但标题不同，才是需要合并的场景。使用 `content_embedding` 才能准确识别真正需要合并的规范对。

### 数据库变更

```sql
-- steering 表新增字段（现有 embedding 字段保留，用于搜索功能）
ALTER TABLE steering ADD COLUMN content_embedding vector(512);
CREATE INDEX idx_steering_content_embedding ON steering USING hnsw (content_embedding vector_cosine_ops);
```

### Content Embedding 生成

- **新增接口**：`POST /api/v1/web/steerings/{id}/content-embedding`
  - Embedding 文本：规范 `content` 字段全文（去除 Markdown 标记后的纯文本）
  - 调用 Bedrock `amazon.titan-embed-text-v2:0`，写入 `content_embedding`
- **批量补跑**：健康检测任务触发时（`POST /api/v1/health-check/trigger`），服务端自动对所有 `content_embedding IS NULL` 的 active 规范补跑 Embedding，再开始相似度计算

### 相似度计算

- **阈值**：`overall_score >= 0.7`
- **算法**：对每条规范用 `content_embedding` 做 pgvector Top-10 相似搜索，去重后过滤 score >= 0.7 的对（不做 O(n²) 两两暴力计算）
- **查询模式**：
  ```sql
  -- 对规范 id=X，找最相近的 Top-10（排除自身）
  SELECT id, 1 - (content_embedding <=> :vec) AS score
  FROM steering
  WHERE status = 'active' AND id != :id AND content_embedding IS NOT NULL
  ORDER BY content_embedding <=> :vec
  LIMIT 10;
  ```

### similar_spec_pair 表字段调整

| 字段 | 调整 |
|------|------|
| `overall_score` | 含义变更：直接为 `content_embedding` 余弦相似度（0.000–1.000） |
| `vector_score` | 保留，与 `overall_score` 值相同（内容向量余弦） |
| `title_score` | **废弃**，写 NULL |
| `tags_score` | **废弃**，写 NULL |
| `keywords_score` | **废弃**，写 NULL |
| `reason_tags` | 固定为 `["内容语义相近"]` |

> 废弃字段列保留在表结构中，避免破坏性迁移，但不再参与计算。

---

## Phase 0 Research Summary

见 [research.md](./research.md)

## Phase 1 Design Artifacts

- 数据模型：[data-model.md](./data-model.md)
- API 契约：[contracts/api.md](./contracts/api.md)
- 快速开始：[quickstart.md](./quickstart.md)
