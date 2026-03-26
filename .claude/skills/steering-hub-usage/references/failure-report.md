# Failure Report — When and How to Call report_search_failure

## Trigger Condition

Call `report_search_failure` **only** when all of these are true:

1. You have made **exactly 3 queries** for the current Task
2. All 3 queries returned results that do **not** apply to this Task (misses)
3. Each query used a **different keyword string** (no repeats)

"Miss" includes:
- Search returned no results
- Search returned results but none are relevant (wrong layer, wrong scenario, deprecated status)
- Search returned a partial hit too narrow to cover the Task (and you have already attempted 3 queries)

**Not a trigger:**
- 1 miss → not enough, must retry with different keywords
- 2 misses → still not enough, must try one more time
- 3 queries but some were duplicate keywords → invalid, recount from last unique query

---

## Call Format

```python
mcp__steering-hub__report_search_failure(
    query  = "<3rd query keyword string>",
    reason = "连续3次查询均未命中：[<query1>] / [<query2>] / [<query3>]，Task场景：<brief Task description>"
)
```

**Field rules:**
- `query`: the keyword string used in the 3rd (final) attempt
- `reason`: must list all 3 query strings and briefly describe the Task scenario
- Do not call this more than once per Task

**Example:**
```python
mcp__steering-hub__report_search_failure(
    query  = "WebSocket 长连接 服务端推送",
    reason = "连续3次查询均未命中：[WebSocket 规范] / [实时通信 SSE 流式接口] / [WebSocket 长连接 服务端推送]，Task场景：实现 WebSocket 消息推送 Handler"
)
```

---

## Post-Report Behavior

After calling `report_search_failure`:

1. **Continue coding** — the absence of a spec does not block implementation
2. Apply project-wide defaults from Constitution:
   - Backend: `Result<T>` return · `@Valid` DTO · XML Mapper (no `QueryWrapper`) · `@Transactional` in Application layer
   - Frontend: `formatDateTime()` · null → `-` · `Pagination.tsx` for pagination
3. Add a comment at the top of the affected file or method:
   ```java
   // 无对应 Steering Hub 规范（已上报），按最佳实践处理
   ```
   or for TypeScript:
   ```typescript
   // No applicable Steering Hub spec found (reported). Following project best practices.
   ```

---

## Hard Rules

| Rule | Detail |
|------|--------|
| ❌ 1次未命中就上报 | Must attempt at least 3 different queries first |
| ❌ 重复关键词算1次 | Each attempt must use a distinct keyword string |
| ❌ 上报后停止编码 | Always continue implementation after reporting |
| ❌ 上报后不加注释 | Must add the "无对应规范" comment in code |
| ❌ 未到3次就认为无规范 | Even if confident there's no spec, still complete 3 attempts |

---

## Full Sequence Example

```
Task T013: 实现 WebSocket 消息推送 Handler

→ 查询 1: search("WebSocket 规范") → 无结果
  ⚠️ 未命中，换词重试

→ 查询 2: search("实时通信 SSE 流式接口") → 结果与 Task 不相关
  ⚠️ 未命中，换词重试

→ 查询 3: search("WebSocket 长连接 服务端推送") → 无结果
  ⚠️ 连续3次未命中

→ report_search_failure(
    query="WebSocket 长连接 服务端推送",
    reason="连续3次查询均未命中：[WebSocket 规范] / [实时通信 SSE 流式接口] / [WebSocket 长连接 服务端推送]，Task场景：实现 WebSocket 消息推送 Handler"
  )

❌ 连续3次未命中，已上报 report_search_failure
查询词：["WebSocket 规范", "实时通信 SSE 流式接口", "WebSocket 长连接 服务端推送"]
按最佳实践编码，代码中标注"无对应规范"。
```
