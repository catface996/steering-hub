---
name: steering-hub-contribute
description: During coding, discover reusable conventions/patterns, check if they exist in Steering Hub, and draft+submit missing steerings. Triggered by "提交规范", "贡献规范", "submit steering", "contribute steering", or when the agent identifies a repeatable coding pattern that lacks a steering (e.g. after report_search_failure). Do NOT trigger for one-off decisions — only for patterns that would benefit multiple future Tasks.
---

# How to Contribute Steerings to Steering Hub

This skill turns coding experience into reusable steerings. Execute when you identify a convention worth codifying — either proactively during coding or after a `report_search_failure` reveals a gap.

## Prerequisites

The `steering-hub` MCP server must be running. If any MCP tool call fails with a connection error:

1. Inform the user: `⚠️ Steering Hub MCP server 不可用，无法提交规范。`
2. Ask the user to start the server (`cd steering-hub-mcp && python -m steering_hub_mcp.server`).
3. **Do not skip** — wait for the server, then proceed.

---

## When to Trigger

This skill activates in these scenarios:

| Trigger | Example |
|---------|---------|
| **Post-failure gap** | After `report_search_failure`, the agent coded with best practices and the user confirms the pattern is worth codifying |
| **Repeated pattern** | Agent notices the same convention applied across 2+ Tasks in a session (e.g. every Service uses the same error-handling pattern) |
| **User request** | User explicitly says "提交规范", "把这个总结成规范", "submit this as a steering" |
| **Code review insight** | During review, agent spots a pattern that should be enforced project-wide |

**Do NOT trigger for:**
- One-off implementation decisions
- Patterns already covered by existing steerings (check first!)
- Trivial conventions that don't need enforcement

---

## Step 1 — Extract the Convention

Analyze the current coding context and distill the convention into:

1. **What** — the specific pattern, rule, or constraint
2. **Why** — the problem it prevents or the consistency it ensures
3. **Scope** — which layer/tech/scenario it applies to
4. **Enforcement** — what is mandatory (`✅ 强制`) vs recommended, and what is forbidden (`❌ 禁止`)

Template for thinking:
```
Convention: <one-sentence summary>
Layer: <Controller / Service / Repository / Job / Frontend / Cross-cutting>
Tech: <Spring / MyBatis / React / General>
Scenario: <specific concern>
Mandatory rules: <list>
Forbidden patterns: <list>
```

---

## Step 2 — Determine Granularity (Split or Merge)

Before dedup and drafting, evaluate whether the extracted convention should be **one steering or multiple**.

### The "One Decision" Test

Ask: "When an agent faces a specific coding question, does this steering give a complete answer without irrelevant noise?"

- If the convention covers **multiple independent decision points** (e.g. error code naming + exception hierarchy + HTTP status mapping), split into separate steerings — each answering one question.
- If the convention is **too narrow to guide any decision on its own**, merge it into a broader related steering.

### Size Target

**500–1500 tokens** per steering (roughly 300–800 Chinese characters). This ensures the steering fits in the agent's context alongside code and conversation without wasting tokens.

### Split Signals

| Signal | Action |
|--------|--------|
| Steering needs 3+ independent ✅/❌ sections for different scenarios | Split by scenario |
| Title needs "与" or "and" to describe it | Likely two steerings |
| Agent searching for one concern would find 90% irrelevant | Split that concern out |

### Keep-Together Signals

| Signal | Action |
|--------|--------|
| Two rules only make sense read together | Keep as one |
| One is the "what", the other is the "how" of the same thing | Keep as one |

If splitting, each resulting steering goes through Steps 3–7 independently.

See `references/steering-drafting-guide.md` § "Granularity Guidelines" for detailed criteria.

---

## Step 3 — Dedup Check (Search Before Submit)

**Never submit without checking first.** Search Steering Hub to verify no existing steering covers this convention.

### 3a. Search with keywords

Call `mcp__steering-hub__search_steering` with keywords derived from the convention:

```
query:      "<layer> <tech> <scenario keywords>"
agent_name: "claude-code"
model_name: <current model id>
repo:       "catface996/steering-hub"
```

### 3b. Evaluate results

| Search result | Action |
|---------------|--------|
| **Exact match** (active steering covers this convention) | Stop. No need to submit. Inform user: `ℹ️ 该规范已存在：ID:X「title」` |
| **Partial overlap** (existing steering covers part of it) | Consider whether to submit a new steering for the uncovered part, or suggest updating the existing steering. Inform user of the overlap. |
| **No match** (0 results or all irrelevant) | Proceed to Step 4. |

### 3c. Retry with different keywords (up to 2 retries)

If the first search misses but you suspect a steering might exist under different terms:
- Retry with synonyms or broader keywords (max 2 retries, 3 total attempts)
- If all 3 miss → confirmed gap, proceed to Step 4

See `references/dedup-check-guide.md` for keyword strategies.

---

## Step 4 — Choose Category and Tags

Select the most appropriate category and tags for the new steering.

### Category selection

| Category code | When to use |
|---------------|------------|
| `coding` | Code style, naming, patterns, layer-specific conventions |
| `architecture` | System design, module boundaries, dependency rules, DDD |
| `business` | Business logic rules, domain model constraints |
| `security` | Auth, encryption, vulnerability prevention |
| `testing` | Test patterns, coverage, mocking rules |
| `documentation` | API docs, comments, changelog conventions |

### Tag selection

Call `mcp__steering-hub__get_steering_tags(category_code="<chosen category>")` to see available tags.

- Pick 2-5 tags that match the convention's layer, tech, and scenario
- Prefer existing tags over inventing new ones
- Tags describe technology/concern dimensions, not the category itself

See `references/category-tag-guide.md` for detailed guidance.

---

## Step 5 — Draft the Steering Content

Write the steering in Markdown following the standard structure. The content must be **actionable and enforceable** — not vague advice.

### Required structure

```markdown
# <规范标题>

## 适用范围
<Which layer, tech stack, and scenario this applies to>

## 规范内容

### ✅ 强制要求
1. <Mandatory rule 1 — specific and verifiable>
2. <Mandatory rule 2>

### ❌ 禁止
1. <Forbidden pattern 1 — with brief reason>
2. <Forbidden pattern 2>

### 💡 推荐（可选）
1. <Best practice recommendation>

## 正例
<Code example showing correct implementation>

## 反例
<Code example showing what NOT to do, with explanation of why>

## 背景与动机
<Why this steering exists — what problem it prevents>
```

### Drafting rules

- Every `✅ 强制` and `❌ 禁止` item must be **machine-verifiable** — an AI agent should be able to check compliance by reading the code
- Include both positive (正例) and negative (反例) code examples
- Keep the steering focused on ONE convention — don't combine unrelated rules
- Write in the same language as existing steerings (Chinese for this project, with English technical terms)
- Title should be `<layer/scenario> + 规范`, e.g. `WebSocket 消息推送 Handler 规范`

See `references/steering-drafting-guide.md` for detailed writing guidelines.

---

## Step 6 — Review with User Before Submit

**Never auto-submit.** Present the draft to the user for review:

```
📋 规范草稿

标题：<title>
分类：<category>
标签：<tags>

---
<full markdown content>
---

是否提交到 Steering Hub？可以修改后再提交。
```

Wait for user confirmation or edits. Incorporate any feedback before proceeding.

---

## Step 7 — Submit

Call `mcp__steering-hub__submit_steering`:

```python
mcp__steering-hub__submit_steering(
    title    = "<规范标题>",
    content  = "<full markdown content>",
    category = "<category code>",
    tags     = ["<tag1>", "<tag2>", ...]
)
```

**Important:** The submitted steering will be in `draft` status and requires human approval before taking effect.

---

## Output Format

### Dedup found existing steering:
```
ℹ️ 规范已存在：ID:X「规范名」
覆盖范围：<brief description>
无需重复提交。
```

### Submitted successfully:
```
✅ 规范已提交（draft 状态，待审核）
标题：「规范名」
分类：<category>
标签：[tag1, tag2]
后续：人工审核通过后将变为 active 状态，可被 search_steering 查询到。
```

### Submission failed:
```
❌ 规范提交失败
原因：<error message>
建议：<next step>
```

---

## Hard Rules

- **Never auto-submit** — always show draft to user first and get explicit confirmation
- **Never skip dedup** — always search before submitting (at least 1 search, up to 3)
- **One steering per decision type** — if the convention covers multiple independent coding decisions, split into separate steerings (see Step 2)
- **500–1500 tokens per steering** — steerings are consumed by AI agents with limited context; exceed 2000 tokens = must split
- **Must have ✅/❌ items** — a steering without enforceable rules is not worth submitting
- **Must have code examples** — both 正例 and 反例
- **Draft status** — submitted steerings require human approval; inform user of this
