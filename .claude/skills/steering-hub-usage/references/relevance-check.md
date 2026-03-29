# Relevance Check — How to Judge If a Steering Applies to the Current Task

## Judgment Criteria (apply in order)

### 1. Status Check (hard filter)
Reject immediately if `status` is not `active`:
- `deprecated` → skip, do not use
- `draft` → skip, do not use
- `pending_review` / `rejected` → skip

### 2. Title Relevance
Does the steering title contain keywords that match the Task's primary technical concern?

- Match: "HTTP Controller 接口规范" ↔ Task: write a Spring REST Controller → **relevant**
- No match: "前端展示规范" ↔ Task: write a Spring REST Controller → **not relevant**

### 3. Content Coverage
Does the steering body contain `❌ 禁止` or `✅ 强制` rules that directly constrain what you are about to write?

- At least one `❌ 禁止` or mandatory requirement directly applies → **relevant**
- All rules talk about a different layer or scenario → **not relevant**

### 4. Score Signal (reference only)
`score ≥ 0.5` suggests relevance, but **content match is the deciding factor**.
A score of 0.7 with irrelevant content = not relevant.
A score of 0.45 with directly applicable rules = relevant.

---

## Decision Matrix

| Title match | Content coverage | Decision | Required Action |
|-------------|-----------------|----------|----------------|
| Yes | Yes | ✅ Hit — apply steering | `record_usage(steering_id)` |
| Yes | No (different scenario) | ⚠️ Partial — apply rules that directly fit | apply partial + continue querying |
| No | Yes (coincidental) | ⚠️ Partial — apply the applicable rules | apply partial + note the mismatch |
| No | No | ❌ Irrelevant — change keywords, retry | **`report_search_failure(log_id, reason="irrelevant")`** |
| Deprecated/Draft | — | ❌ Miss regardless of content | **`report_search_failure(log_id, reason="irrelevant")`** |

> **关键变更**: 当搜索返回结果但判定为不适用时，**必须**调用 `report_search_failure(log_id=<footer中的log ID>, reason="irrelevant", expected_topic="<当前Task需要的规范>")`。
> 这条记录帮助规范管理者发现搜索质量问题（如：某关键词总是返回不相关结果），是数据闭环的关键一环。

---

## Canonical Examples

### Direct Hits

**✅ Task:** Write a Spring MVC Controller with POST endpoint
**Steering:** "HTTP 流量入口层规范"
**Reason:** Title matches (HTTP Controller), content has `❌ 禁止 QueryWrapper`, `✅ 返回 Result<T>`, `✅ @Valid DTO`
→ **Hit. Apply all `❌ 禁止` and mandatory items.**

---

**✅ Task:** Write a MyBatis Mapper XML with conditional query
**Steering:** "Repository 层规范"
**Reason:** Title matches (Repository/Mapper), content has `❌ 禁止 SELECT *`, `❌ 禁止 QueryWrapper`, `✅ XML Mapper + <if>`
→ **Hit.**

---

**✅ Task:** Write a `@Scheduled` cleanup job
**Steering:** "定时任务规范"
**Reason:** Title matches (定时任务), content has `❌ 无分布式锁不得合并`
→ **Hit. This is an architecture red line — must add distributed lock.**

---

### Misses

**❌ Task:** Write a Spring MVC Controller
**Steering:** "前端展示与交互规范"
**Reason:** Different layer entirely (frontend vs backend). Content rules about `formatDateTime` and `Typography.Text` are irrelevant.
→ **Miss. Change keywords.**

---

**❌ Task:** Write a Spring MVC Controller
**Steering:** "Redis 缓存规范" (status: active)
**Reason:** Title and content cover Redis key naming and TTL — no overlap with HTTP controller concerns.
→ **Miss.**

---

### Irrelevant — Must Submit Report

**❌ Task:** Write a Spring MVC Controller for review-queue endpoint
**Steering:** "MyBatis Plus CRUD最佳实践" (score: 0.30)
**Reason:** Title and content cover MyBatis QueryWrapper and BaseMapper — entirely unrelated to HTTP Controller endpoint design.
→ **Irrelevant.** Must output evaluation block and call:
```
report_search_failure(log_id=164, reason="irrelevant", expected_topic="Controller REST 接口设计规范")
```
This counts as 1 miss toward the 3-miss threshold.

---

**❌ Task:** Implement Python MCP Server tool
**Steering:** "线程池使用规范" (score: 0.37)
**Reason:** Content covers Java ThreadPoolExecutor — wrong language and wrong scenario entirely.
→ **Irrelevant.** Must call `report_search_failure(reason="irrelevant")`.

---

### Partial / Judgment Calls

**⚠️ Task:** Write a paginated list query (Mapper + Controller)
**Steering:** "HTTP Controller 分页参数规范"
**Reason:** Covers Controller layer pagination param format (`page`, `size`), but does not cover Mapper XML `LIMIT/OFFSET` pattern.
→ **Partial hit.** Apply the Controller pagination rules. For the Mapper XML part, still needs a separate query with `"Repository MyBatis 分页"` keywords.

---

**⚠️ Task:** Write Application Service with transaction
**Steering:** "DDD Application 层规范" (score: 0.48)
**Reason:** Score is below 0.5 but content explicitly states `@Transactional` must be in Application layer and must inject Repository interface — directly applicable.
→ **Hit.** Score is a signal, content is the judge.

---

## Output Format

Every query that returns results **must** start with the evaluation block:

```
📋 适用性评估（第N次查询）
  规范: ID:X「规范名」
  当前 Task: <一句话描述当前编码任务>
  标题匹配: ✅/❌ <简要说明>
  内容覆盖: ✅/❌ <是否包含直接约束当前 Task 的 ❌禁止 或 ✅强制 规则>
  判定: 命中 / 部分命中 / 不适用
```

**Hit:**
```
📋 适用性评估（第N次查询）
  规范: ID:7「HTTP 流量入口层规范」
  当前 Task: 新增 SteeringController review-queue GET 接口
  标题匹配: ✅ HTTP Controller 接口规范
  内容覆盖: ✅ 包含 URL 格式、统一返回 Result<T>、禁止业务逻辑
  判定: 命中

✅ 命中 ID:7「HTTP 流量入口层规范」
覆盖要点：
- URL 格式 /api/{version}/{resource}/{action}
- 统一返回 Result<T>
- 禁止 Controller 中写业务逻辑
→ 已调用 record_usage
```

**Irrelevant (搜索有结果但不适用 — 必须提交记录):**
```
📋 适用性评估（第N次查询）
  规范: ID:134「MyBatis Plus CRUD最佳实践」
  当前 Task: 新增 McpSteeringController revision 接口
  标题匹配: ❌ MyBatis CRUD 与 Controller 接口无关
  内容覆盖: ❌ 规范内容是 QueryWrapper/BaseMapper，与 HTTP 接口设计完全不重叠
  判定: 不适用

⚠️ 规范查询（第N次）：query="..." → 不适用（与当前 Controller 编码场景无关）
→ 已调用 report_search_failure(log_id=164, reason="irrelevant")，换词重试
```

**No results:**
```
⚠️ 规范查询（第N次）：query="..." → 无结果，换词重试
```

**Partial hit (apply with note):**
```
📋 适用性评估（第N次查询）
  规范: ID:229「前端展示与交互规范」
  当前 Task: 新增 ReviewQueuePage 审批队列页面
  标题匹配: ✅ 前端展示交互相关
  内容覆盖: ⚠️ 覆盖 Tag 颜色/时间格式，但不覆盖表格布局和分页
  判定: 部分命中

⚠️ 部分命中 ID:229「前端展示与交互规范」
适用部分：pending_review → 蓝色(processing)，时间用 formatDateTime
不覆盖：表格列表页面结构、分页组件用法，继续补查
```
