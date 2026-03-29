---
name: steering-hub-usage
description: How to use Steering Hub MCP tools correctly during coding tasks. Use at the start of EVERY coding task in this project — not limited to specific layers. Also triggered by "查规范", "搜索规范", "steering hub查询", "steering-first". Covers keyword extraction, query count rules (3 consecutive misses required before stopping), relevance judgment, and failure reporting. Do NOT skip this for "similar" tasks — each Task requires an independent query.
---

# How to Use Steering Hub

Execute this workflow at the start of every coding Task. Four steps, no skipping.

## Prerequisites

The `steering-hub` MCP server must be running. If any MCP tool call fails with a connection error:

1. Inform the user: `⚠️ Steering Hub MCP server 不可用，无法执行规范查询。`
2. Ask the user to start the server (`cd steering-hub-mcp && python -m steering_hub_mcp.server`).
3. **Do not skip the query** — wait for the server to become available, then proceed with Step 1.
4. If the user explicitly confirms to proceed without the server, code using Constitution defaults and add a comment: `// Steering Hub MCP 不可用，按 Constitution 默认规范编码`

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
model_name: <auto-detect from current session, e.g. "claude-opus-4-6" or "claude-sonnet-4-6">
repo:       "catface996/steering-hub"
```

> **model_name**: Use the model powering the current session. Check the system environment info for the exact model ID (e.g. `claude-opus-4-6`). Do not hardcode a specific model.

---

## Step 3 — Judge Relevance (mandatory, no skipping)

**Every search that returns results MUST trigger an explicit relevance evaluation.** Do not silently skip or assume relevance.

For each result, evaluate two criteria (both must hold):
1. Steering title/content covers the main technical point of the Task
2. Steering `status` is `active` (not `deprecated` or `draft`)

Score ≥ 0.5 is a reference signal only — **content match decides**.

### 3a. Evaluation Output (required for every query that returns results)

Output a structured evaluation block for the top result(s):

```
📋 适用性评估（第N次查询）
  规范: ID:X「规范名」
  当前 Task: <一句话描述当前编码任务>
  标题匹配: ✅/❌ <简要说明>
  内容覆盖: ✅/❌ <是否包含直接约束当前 Task 的 ❌禁止 或 ✅强制 规则>
  判定: 命中 / 部分命中 / 不适用
```

### 3b. Actions Based on Judgment

- **命中** → call `mcp__steering-hub__record_usage`, output hit block, apply steering.
- **不适用（搜索有结果但与 Task 无关）** → **必须** call `mcp__steering-hub__report_search_failure(log_id=<search log ID>, reason="irrelevant", expected_topic="<当前 Task 需要的规范主题>")`，提交无效记录。此次计为 1 次 miss，换词重试。
- **部分命中** → apply applicable parts, note uncovered areas, continue querying for missing coverage.
- **搜索无结果** → 计为 1 次 miss，换词重试。
- **3 consecutive misses** → go to Step 4.

### 3c. Hard Rules for Step 3

- ❌ 禁止搜索返回结果后不做评估直接跳到下一步
- ❌ 禁止仅凭 score 判定适用性（score 是信号，内容匹配是判据）
- ❌ 禁止搜索返回不相关结果却不提交 irrelevant 记录
- ✅ 每次搜索返回结果都必须输出「适用性评估」block
- ✅ 判定不适用时必须带 `log_id` 调用 `report_search_failure(reason="irrelevant")`

See `references/relevance-check.md` for judgment criteria and examples.

---

## Step 4 — Report Failure (only after 3 consecutive misses)

Call `mcp__steering-hub__report_search_failure`. Then code using project best practices.

See `references/failure-report.md` for call format and post-report behavior.

---

## Output Format

**Hit (搜索有结果且适用):**
```
📋 适用性评估（第N次查询）
  规范: ID:X「规范名」
  当前 Task: <一句话描述>
  标题匹配: ✅ <说明>
  内容覆盖: ✅ <说明>
  判定: 命中

✅ 规范查询（第N次）：query="..." → 命中 ID:X「规范名」
覆盖要点：<关键强制要求，1–3条>
→ 已调用 record_usage
```

**Partial hit:**
```
📋 适用性评估（第N次查询）
  规范: ID:X「规范名」
  当前 Task: <一句话描述>
  标题匹配: ✅ <说明>
  内容覆盖: ⚠️ <部分覆盖说明>
  判定: 部分命中

⚠️ 规范查询（第N次）：query="..." → 部分命中 ID:X「规范名」
适用部分：<具体说明>
不覆盖：<具体说明，继续用其他关键词补查>
```

**Irrelevant (搜索有结果但不适用 — 必须提交无效记录):**
```
📋 适用性评估（第N次查询）
  规范: ID:X「规范名」
  当前 Task: <一句话描述>
  标题匹配: ❌ <说明>
  内容覆盖: ❌ <说明>
  判定: 不适用

⚠️ 规范查询（第N次）：query="..." → 不适用（原因：...）
→ 已调用 report_search_failure(log_id=Y, reason="irrelevant")，换词重试
```

**No results (搜索无结果):**
```
⚠️ 规范查询（第N次）：query="..." → 无结果，换词重试
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
- Never call `report_search_failure(reason="no_results"/"missing_spec")` before attempt 3. But `report_search_failure(reason="irrelevant")` must be called immediately when results are returned but judged inapplicable.
- Every query that returns results MUST output a `📋 适用性评估` block — no exceptions.
- After a hit, read ALL `❌ 禁止` lines before writing code.
- Judging results as "irrelevant" without calling `report_search_failure(reason="irrelevant", log_id=...)` is a violation.
