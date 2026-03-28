# Dedup Check Guide — How to Search Before Submitting a Spec

## Purpose

Before submitting any new spec, you must verify it doesn't already exist. This prevents duplicate or conflicting specs in the system.

## Search Strategy

### Round 1 — Exact match

Use the convention's primary keywords:
```
query: "<layer> <tech> <scenario>"
```

Example: Convention is about WebSocket handler error handling
→ `query: "WebSocket 错误处理 Handler"`

### Round 2 — Broader synonyms

If Round 1 returns no relevant results, broaden:
- Replace specific tech with general term: `WebSocket` → `实时通信`
- Replace specific layer with broader: `Handler` → `流量入口`
- Use Chinese synonyms: `错误处理` → `异常处理`

Example: → `query: "实时通信 异常处理"`

### Round 3 — Broadest

Drop to the most general terms:
- Just the scenario: `异常处理 规范`
- Just the layer: `Handler 规范`

Example: → `query: "异常处理 规范"`

---

## Evaluating Search Results for Dedup

The goal is different from the usage skill — here you're checking for **overlap**, not applicability.

| Result | Overlap level | Action |
|--------|--------------|--------|
| Spec covers the **exact same** convention | Full overlap | **Stop.** Do not submit. |
| Spec covers **part** of the convention | Partial overlap | Consider: submit only the uncovered part as a new spec, OR suggest extending the existing spec. Ask user. |
| Spec covers the **same layer** but different scenario | No overlap | Safe to submit. |
| No results at all | No overlap | Safe to submit. |

### Key differences from usage-skill search:

| Aspect | Usage skill (steering-hub-usage) | Contribute skill (this) |
|--------|--------------------------------|------------------------|
| Goal | Find a spec to **apply** to current Task | Check if a spec **already exists** for this convention |
| Relevance | Must match Task's coding needs | Must match convention's content |
| After miss | Change keywords, code by best practice | Confirmed gap, proceed to draft |
| After hit | Apply spec to code | Stop, do not submit duplicate |

---

## Common Dedup Pitfalls

### 1. Different title, same rules
A spec titled "Controller HTTP 接口规范" might already cover your "REST API 返回格式规范". Read the content, not just the title.

### 2. Broader spec covers narrow convention
"编码质量门禁" might already include your "Service 层异常处理规范" as a subsection. Check if the existing spec's `✅ 强制` items already cover yours.

### 3. Deprecated spec
If you find a `deprecated` spec that covers your convention, it means the rule was intentionally retired. Do NOT submit a replacement without discussing with the user why the old one was deprecated.

---

## Search Parameter Reference

```python
mcp__steering-hub__search_steering(
    query      = "<keywords>",
    agent_name = "claude-code",
    model_name = "<current model id>",
    repo       = "catface996/steering-hub"
)
```

Also consider browsing by category:
```python
mcp__steering-hub__list_steerings(category_id=<id>, limit=20)
```

This can reveal specs that semantic search might miss due to keyword mismatch.
