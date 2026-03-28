# Spec Drafting Guide — How to Write a Good Steering

## Core Principle

A good spec is **actionable and enforceable by an AI agent**. If an agent can't read the code and mechanically verify compliance, the rule is too vague.

---

## Structure Reference

```markdown
# <规范标题>

## 适用范围
<明确指出适用的层、技术栈、场景>
- 层：Controller / Service / Repository / Job / Frontend / 全局
- 技术栈：Spring Boot / MyBatis / React / 通用
- 场景：<具体什么情况下触发此规范>

## 规范内容

### ✅ 强制要求
1. <具体、可验证的强制规则>
2. <每条规则应能通过 grep/AST 分析验证>

### ❌ 禁止
1. <禁止的具体模式 — 附简要原因>
2. <尽量给出可 grep 的关键词，便于自动检测>

### 💡 推荐（可选）
1. <最佳实践建议，非强制>

## 正例

<正确实现的代码示例，带简要说明>

## 反例

<错误实现的代码示例，标注为什么错>

## 背景与动机
<为什么需要这个规范 — 它解决什么问题、防止什么风险>
```

---

## Writing Rules

### Title

- Format: `<scope/layer> + <concern> + 规范`
- Examples: `WebSocket 消息推送 Handler 规范`, `前端表格空值显示规范`, `Redis 缓存 Key 命名规范`
- Keep under 30 characters if possible
- Use Chinese with English technical terms (matching existing spec style)

### ✅ 强制要求 (Mandatory Rules)

Each rule must be:
1. **Specific** — "必须使用 `@Valid` + DTO 校验参数" not "参数要校验"
2. **Verifiable** — An agent can check compliance by reading the code
3. **Scoped** — Clearly states when/where it applies
4. **Actionable** — Tells the coder exactly what to do

Bad: "代码要有良好的异常处理"
Good: "所有 Service 层方法必须捕获并包装外部调用异常为 BusinessException，日志必须包含业务标识（如 orderId）"

### ❌ 禁止 (Forbidden Patterns)

Each prohibition must:
1. **Name the specific anti-pattern** — "禁止使用 `QueryWrapper`" not "禁止不好的查询方式"
2. **Be detectable** — Ideally grepable: `grep -rn "QueryWrapper" src/`
3. **Explain why (briefly)** — "（易导致 SQL 注入且不利于 SQL 审查）"

### Code Examples (正例 / 反例)

- **Both required** — specs without examples are significantly less useful
- **Realistic** — use actual class/method names from the project when possible
- **Minimal** — show only the relevant part, not a full class
- **Annotated** — add comments pointing out the key patterns

Example format:
```java
// ✅ 正例：使用 XML Mapper + <if> 动态条件
public List<OrderDO> selectByCondition(OrderQuery query);

// ❌ 反例：使用 QueryWrapper（禁止）
public List<OrderDO> selectByCondition(OrderQuery query) {
    return baseMapper.selectList(
        new QueryWrapper<OrderDO>()  // ❌ 禁止 QueryWrapper
            .eq("status", query.getStatus())
    );
}
```

### 适用范围 (Scope)

Be explicit about boundaries:
- Which layers does this apply to? (Controller only? All backend layers?)
- Which tech stack? (Spring Boot specific? Any Java framework?)
- What scenario triggers this rule? (Only for pagination? All queries?)

### 背景与动机 (Background)

Answer: "If someone asks 'why do we need this rule?', what's the answer?"
- Reference real incidents if applicable: "曾因缺少分布式锁导致定时任务重复执行"
- Reference architectural decisions: "DDD 分层架构要求 Domain 层不依赖基础设施"
- Keep it concise — 2-3 sentences max

---

## Quality Checklist

Before presenting the draft to the user, verify:

- [ ] Title follows `<scope> + <concern> + 规范` format
- [ ] 适用范围 clearly states layer, tech, and scenario
- [ ] At least 1 `✅ 强制` rule exists
- [ ] At least 1 `❌ 禁止` rule exists
- [ ] Every rule is specific and verifiable (not vague)
- [ ] 正例 code example included
- [ ] 反例 code example included with explanation
- [ ] 背景与动机 explains WHY, not just WHAT
- [ ] Content is in Chinese (with English technical terms)
- [ ] No overlap with existing specs (dedup check passed)
- [ ] Focused on ONE convention (not a grab-bag of rules)

---

## Anti-Patterns in Spec Writing

| Anti-pattern | Why it's bad | Fix |
|-------------|-------------|-----|
| "代码要规范" | Unverifiable, vague | Specify exactly what "规范" means |
| Listing 20 rules in one spec | Too broad, hard to search | Split into focused specs |
| No code examples | Hard to understand intent | Always include 正例 + 反例 |
| Only 正例, no 反例 | Doesn't show what to avoid | Add explicit anti-patterns |
| English-only content | Inconsistent with existing specs | Use Chinese + English tech terms |
| Rules that duplicate Constitution | Redundant, may conflict | Reference Constitution instead |
