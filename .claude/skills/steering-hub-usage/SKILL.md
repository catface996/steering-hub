---
name: steering-hub-usage
description: How to use Steering Hub MCP tools correctly during coding tasks. Use at the start of EVERY coding task involving Controller, Service, Repository, Job, MQ Consumer, or frontend components. Also triggered by "查规范", "搜索规范", "steering hub查询", "spec-first". Covers keyword extraction, query count rules (3 consecutive misses required before stopping), relevance judgment, and failure reporting. Do NOT skip this for "similar" tasks — each Task requires an independent query.
---

# How to Use Steering Hub

Execute this workflow at the start of every coding Task. Four steps, no skipping.

## Step 1 — Extract Keywords

Identify the Task's coding layer and context, then form a search query.
Dimensions: **layer** (Controller / Service / Repository / Job / MQ / Frontend) + **tech stack** (Spring / MyBatis / React / Ant Design) + **scenario** (pagination / transaction / cache / routing).

Template: `{layer} {tech stack} {scenario}`
Example: `"Controller Spring HTTP POST"`, `"Job 定时任务 分布式锁"`, `"前端 ConfirmModal 弹窗"`

See `references/query-guide.md` for per-Task keyword strategies (3-round fallback per type).

---

## Step 2 — Query

Call `mcp__steering-hub__search_steering`:
```
query:      <extracted keywords>
agent_name: "claude-code"
model_name: <current model, e.g. "claude-sonnet-4-6">
repo:       "catface996/steering-hub"
```

---

## Step 3 — Judge Relevance

Evaluate each result against the current Task. Two criteria (both must hold):
1. Spec title/content covers the main technical point of the Task
2. Spec `status` is `active` (not `deprecated` or `draft`)

Score ≥ 0.5 is a reference signal only — **content match decides**.

- **Hit** → call `mcp__steering-hub__record_usage` with the spec ID, output a hit block, apply spec.
- **Miss** → change keywords (never repeat), query again.
- **3 consecutive misses** → go to Step 4.

See `references/relevance-check.md` for judgment criteria and examples.

---

## Step 4 — Report Failure (only after 3 consecutive misses)

Call `mcp__steering-hub__report_search_failure`. Then code using project best practices.

See `references/failure-report.md` for call format and post-report behavior.

---

## Output Format

**Hit:**
```
✅ 规范查询（第N次）：query="..." → 命中 ID:X「规范名」
覆盖要点：<关键强制要求，1–3条>
```

**Miss (each attempt):**
```
⚠️ 规范查询（第N次）：query="..." → 未命中（原因：...），换词重试
```

**After 3 misses:**
```
❌ 连续3次未命中，已上报 report_search_failure
查询词：["...", "...", "..."]
按最佳实践编码。
```

---

## Hard Rules

- Every Task = one independent query sequence. "Same as last task" never skips this.
- Never reuse the same query string across attempts.
- Never call `report_search_failure` before attempt 3.
- After a hit, read ALL `❌ 禁止` lines before writing code.
