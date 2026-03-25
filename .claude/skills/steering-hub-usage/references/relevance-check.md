# Relevance Check — How to Judge If a Spec Applies to the Current Task

## Judgment Criteria (apply in order)

### 1. Status Check (hard filter)
Reject immediately if `status` is not `active`:
- `deprecated` → skip, do not use
- `draft` → skip, do not use
- `pending_review` / `rejected` → skip

### 2. Title Relevance
Does the spec title contain keywords that match the Task's primary technical concern?

- Match: "HTTP Controller 接口规范" ↔ Task: write a Spring REST Controller → **relevant**
- No match: "前端展示规范" ↔ Task: write a Spring REST Controller → **not relevant**

### 3. Content Coverage
Does the spec body contain `❌ 禁止` or `✅ 强制` rules that directly constrain what you are about to write?

- At least one `❌ 禁止` or mandatory requirement directly applies → **relevant**
- All rules talk about a different layer or scenario → **not relevant**

### 4. Score Signal (reference only)
`score ≥ 0.5` suggests relevance, but **content match is the deciding factor**.
A score of 0.7 with irrelevant content = not relevant.
A score of 0.45 with directly applicable rules = relevant.

---

## Decision Matrix

| Title match | Content coverage | Decision |
|-------------|-----------------|----------|
| Yes | Yes | ✅ Hit — apply spec |
| Yes | No (different scenario) | ⚠️ Partial — only apply rules that directly fit; if coverage is too narrow, treat as miss |
| No | Yes (coincidental) | ⚠️ Partial — apply the applicable rules, note the mismatch |
| No | No | ❌ Miss — change keywords, retry |
| Deprecated/Draft | — | ❌ Miss regardless of content |

---

## Canonical Examples

### Direct Hits

**✅ Task:** Write a Spring MVC Controller with POST endpoint
**Spec:** "HTTP 流量入口层规范"
**Reason:** Title matches (HTTP Controller), content has `❌ 禁止 QueryWrapper`, `✅ 返回 Result<T>`, `✅ @Valid DTO`
→ **Hit. Apply all `❌ 禁止` and mandatory items.**

---

**✅ Task:** Write a MyBatis Mapper XML with conditional query
**Spec:** "Repository 层规范"
**Reason:** Title matches (Repository/Mapper), content has `❌ 禁止 SELECT *`, `❌ 禁止 QueryWrapper`, `✅ XML Mapper + <if>`
→ **Hit.**

---

**✅ Task:** Write a `@Scheduled` cleanup job
**Spec:** "定时任务规范"
**Reason:** Title matches (定时任务), content has `❌ 无分布式锁不得合并`
→ **Hit. This is an architecture red line — must add distributed lock.**

---

### Misses

**❌ Task:** Write a Spring MVC Controller
**Spec:** "前端展示与交互规范"
**Reason:** Different layer entirely (frontend vs backend). Content rules about `formatDateTime` and `Typography.Text` are irrelevant.
→ **Miss. Change keywords.**

---

**❌ Task:** Write a Spring MVC Controller
**Spec:** "Redis 缓存规范" (status: active)
**Reason:** Title and content cover Redis key naming and TTL — no overlap with HTTP controller concerns.
→ **Miss.**

---

### Partial / Judgment Calls

**⚠️ Task:** Write a paginated list query (Mapper + Controller)
**Spec:** "HTTP Controller 分页参数规范"
**Reason:** Covers Controller layer pagination param format (`page`, `size`), but does not cover Mapper XML `LIMIT/OFFSET` pattern.
→ **Partial hit.** Apply the Controller pagination rules. For the Mapper XML part, still needs a separate query with `"Repository MyBatis 分页"` keywords.

---

**⚠️ Task:** Write Application Service with transaction
**Spec:** "DDD Application 层规范" (score: 0.48)
**Reason:** Score is below 0.5 but content explicitly states `@Transactional` must be in Application layer and must inject Repository interface — directly applicable.
→ **Hit.** Score is a signal, content is the judge.

---

## Output Format

**Hit:**
```
✅ 命中 ID:X「规范名」
覆盖要点：
- <强制要求1>
- <禁止行为1>
- <禁止行为2>
```

**Miss:**
```
⚠️ 未命中
原因：标题「{spec title}」与 Task（{Task简述}）不相关 / 规范 status={status}
换词重试。
```

**Partial hit (apply with note):**
```
⚠️ 部分命中 ID:X「规范名」
适用部分：<具体说明>
不覆盖：<具体说明，继续用其他关键词补查>
```
