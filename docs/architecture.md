# Steering Hub 架构文档

## 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                   AI Coding Agent                        │
│          (Claude Code / Cursor / Copilot etc.)           │
└──────────────────────┬──────────────────────────────────┘
                       │ MCP Protocol (stdio)
┌──────────────────────▼──────────────────────────────────┐
│               steering-hub-mcp (Python)                  │
│  Tools: search_spec / get_spec / submit_spec /           │
│         record_usage                                     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP REST API
┌──────────────────────▼──────────────────────────────────┐
│           steering-hub-backend (Spring Boot)             │
│  ┌─────────────┐ ┌───────────────┐ ┌────────────────┐  │
│  │ spec-service│ │ search-service│ │compliance-svc  │  │
│  │  - CRUD     │ │  - Semantic   │ │  - Score       │  │
│  │  - Review   │ │  - FullText   │ │  - Violations  │  │
│  │  - Version  │ │  - Hybrid     │ │  - Reports     │  │
│  └─────────────┘ └───────┬───────┘ └────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                    common                           │ │
│  │  Result / Exception / Enums / MybatisPlus Config   │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
            ┌──────────┴──────────┐
┌───────────▼──────┐   ┌──────────▼──────────────────────┐
│  PostgreSQL 15+  │   │   Amazon Bedrock                 │
│  + pgvector      │   │   Titan Embeddings v2 (512-dim)  │
│  (vector search) │   │   (text → embedding)             │
└──────────────────┘   └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         steering-hub-frontend (React + Ant Design)       │
│  Dashboard / Spec管理 / 智能检索 / 合规审查 / 分类管理   │
└─────────────────────────────────────────────────────────┘
```

## 规范状态机

```
           submit
DRAFT ──────────────► PENDING_REVIEW
  ▲                        │
  │ rollback         approve│ reject
  │                         ▼        ▼
  │               APPROVED      REJECTED
  │                   │              │
  │             activate│        (edit to DRAFT)
  │                     ▼
  │ (edit)           ACTIVE
  │                     │
  └─────────────── DEPRECATED
                  (deprecate)
```

## 检索流程

```
User Query
    │
    ├─► Embedding Service (Bedrock Titan v2)
    │       └─► Query Vector (512-dim)
    │               └─► pgvector cosine search → [Semantic Results]
    │
    ├─► PostgreSQL tsvector (plainto_tsquery)
    │       └─► [FullText Results]
    │
    └─► Merge & Re-rank
            └─► [Hybrid Results] (score-sorted, active only)
```

## 数据流：规范创建 + Embedding 生成

```
POST /api/v1/specs
    │
    ├─► Save to PostgreSQL (status=draft, embedding=NULL)
    │
    └─► @Async triggerEmbeddingUpdate(specId)
            │
            ├─► Bedrock InvokeModel (titan-embed-text-v2:0)
            │       input: title + keywords + content[:2000]
            │       output: float[512]
            │
            └─► UPDATE spec SET embedding = '[...]'::vector
```
