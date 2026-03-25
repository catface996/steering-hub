---
name: steering-spec-lookup
description: Query Steering Hub MCP for coding specs before any Task. Use this skill at the start of EVERY coding Task — before writing a Controller, Service, Repository/Mapper, Job, MQ Consumer, or any frontend component. Also use when the user says "查规范", "lookup spec", "spec-first", or starts a new implementation task. Implements the mandatory Spec-First workflow from the project Constitution v1.3.0: extract keywords → search → stop on hit → retry with different keywords on miss → report failure after 3 consecutive misses. Do NOT skip this skill for "similar" tasks — every Task needs its own independent query.
---

# Steering Hub Spec Lookup

Execute Spec-First mandatory workflow before writing any code in this project.

## Workflow (execute exactly in order)

### Step 1 — Extract Keywords

Analyze the current Task and pick 1–3 search terms from the keyword mapping table below.
Prefer the most specific match. If no row matches, derive keywords from the component type being built.

### Step 2 — Search (up to 3 attempts, stop on first hit)

Call `mcp__steering-hub__search_steering` with:
- `query`: keyword string
- `agent_name`: `"claude-code"`
- `model_name`: current model ID (e.g. `"claude-sonnet-4-6"`)
- `repo`: `"catface996/steering-hub"`

**Hit condition**: result has relevance ≥ 0.5 AND covers the current coding scenario.

- **Hit** → read the spec, note the ID and all `❌ 禁止` items, proceed to Step 3.
- **Miss** → pick a different keyword (never repeat the same query), try again. After 3 consecutive misses, go to Step 4.

### Step 3 — Record Usage (on hit)

Call `mcp__steering-hub__record_usage` with the spec ID.
Output a summary block (see Output Format), then code according to the spec.

### Step 4 — Report Failure (only after 3 consecutive misses)

Call `mcp__steering-hub__report_search_failure` with all 3 queries used.
Output a miss summary block, then code using project best practices.

---

## Keyword Mapping Table

For detailed keyword patterns, see `references/query-patterns.md`.

| Task Type | Primary Keywords |
|-----------|-----------------|
| HTTP Controller (REST) | `Controller HTTP 接口规范 POST` |
| Application Service | `Application 层 Service 事务 @Transactional` |
| Repository / Mapper | `Repository Mapper XML QueryWrapper 禁止` |
| Job / Scheduled Task | `Job 定时任务 分布式锁` |
| MQ Consumer | `MQ 消息队列 Consumer 幂等` |
| MQ Producer | `MQ 消息发送 可靠性` |
| Feign / HTTP Client | `Feign 外部HTTP 超时降级` |
| Frontend Component | `前端展示与交互规范 时间格式 Tag颜色` |
| Frontend Modal/Dialog | `前端二次确认弹窗 ConfirmModal 暗色主题` |
| Frontend Pagination | `分页 Pagination 组件` |
| Domain Service | `Domain 聚合根 值对象` |
| Redis Cache | `Redis 缓存 Key 命名` |

---

## Output Format

**On hit (print before coding):**

```
✅ 规范查询（第N次）：query="..." → 命中 ID:X「规范名」
强制要求：<1–3条关键禁止项 / 必须项>
```

**On miss (each attempt):**

```
⚠️ 规范查询（第N次）：query="..." → 未命中，换词重试
```

**After 3 misses:**

```
❌ 连续3次未命中，已上报 report_search_failure
查询词：["...", "...", "..."]
按最佳实践编码。
```

---

## Hard Rules (from Constitution v1.3.0)

- Every Task gets its own independent query — "same as last task" is not an excuse to skip
- Never repeat the same query string across attempts
- Never call `report_search_failure` before completing 3 attempts
- Never skip after 1 miss — must try at least 3 different keywords
- After a hit, check ALL `❌ 禁止` lines in the spec before writing code
