# Category & Tag Selection Guide

## Category Decision Tree

Ask yourself these questions in order:

```
Is the convention about HOW to write code (style, patterns, naming)?
  → coding

Is it about WHERE code should live (layers, dependencies, boundaries)?
  → architecture

Is it about WHAT the code must enforce (business rules, domain constraints)?
  → business

Is it about PROTECTING the system (auth, encryption, input validation)?
  → security

Is it about VERIFYING the code works (test patterns, coverage)?
  → testing

Is it about DOCUMENTING the code (API docs, comments)?
  → documentation
```

### Ambiguous cases

| Convention | Seems like... | Actually... | Reason |
|-----------|--------------|-------------|--------|
| "Controller must return Result\<T\>" | coding | coding | It's a code pattern rule |
| "@Transactional must be in Application layer" | coding | architecture | It's about layer boundaries |
| "Order status can only transition PENDING→PAID→SHIPPED" | coding | business | It's a domain rule |
| "All user input must be sanitized" | coding | security | It's about protection |
| "Service tests must mock external calls" | testing | testing | It's about test patterns |

**When in doubt, choose `coding`** — it's the broadest and most commonly used category.

---

## Tag Selection

### Step 1: Get available tags

```python
mcp__steering-hub__get_steering_tags(category_code="<chosen category>")
```

### Step 2: Pick 2-5 tags

Select tags that match these dimensions:

| Dimension | Examples |
|-----------|---------|
| **Layer** | Controller, Service, Repository, Job, Frontend, Consumer |
| **Tech** | Spring, MyBatis, React, Redis, RabbitMQ, PostgreSQL |
| **Concern** | 事务, 缓存, 分页, 幂等, 异常处理, 命名规范 |

### Tag rules

- **Prefer existing tags** — don't create new tags if an existing one fits
- **2-5 tags per steering** — too few = hard to find, too many = noisy
- **Be specific** — `Spring Boot` is better than `Java` if the rule is Spring-specific
- **Layer + Concern minimum** — every steering should have at least a layer tag and a concern tag
- Tags are orthogonal to categories. A `coding` category steering can have `Controller` + `REST` + `Spring` tags

### Examples

| Convention | Category | Tags |
|-----------|----------|------|
| WebSocket Handler 错误处理 | coding | `[WebSocket, Handler, 异常处理]` |
| 前端表格空值显示 | coding | `[前端, React, 表格, 空值处理]` |
| DDD 聚合根设计 | architecture | `[DDD, 聚合根, Domain]` |
| 订单状态机规范 | business | `[订单, 状态机, 领域模型]` |
| API 接口鉴权 | security | `[API, 鉴权, JWT]` |
