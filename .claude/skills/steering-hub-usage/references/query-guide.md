# Query Guide — How to Form Steering Hub Search Keywords

## Keyword Extraction Rules

Analyze the Task along three dimensions, combine into a search query string.

| Dimension | How to determine | Examples |
|-----------|----------------|---------|
| **Layer** | Coding layer being implemented | `Controller`, `Service`, `Repository`, `Job`, `MQ Consumer`, `前端组件` |
| **Tech stack** | **Infer from current codebase context** — check imports, pom.xml, package.json, existing files | If codebase uses Spring → `Spring`; uses Quarkus → `Quarkus`; uses Vue → `Vue` |
| **Scenario** | Specific concern or pattern | `分页`, `事务`, `缓存`, `分布式锁`, `幂等`, `弹窗`, `时间格式` |

**Composition rule**: Start with the most specific combination (all 3 dimensions), then broaden on retry.

```
1st attempt: {layer} + {inferred tech stack} + {scenario}   ← most precise
2nd attempt: {layer} + {scenario}                            ← drop tech stack
3rd attempt: {scenario} or {layer} alone                     ← broadest
```

> **Key principle**: Tech stack keywords come from reading the project's actual code/config, NOT from hardcoded templates. If the project switches from MyBatis to JPA, queries should reflect that automatically.

---

## How to Infer Tech Stack

Before forming the first query, scan the relevant context clues:

| What to check | What it tells you |
|---------------|------------------|
| `pom.xml` / `build.gradle` dependencies | Backend framework (Spring Boot / Quarkus / Micronaut), ORM (MyBatis / JPA / JOOQ), MQ (RabbitMQ / Kafka / RocketMQ) |
| `package.json` dependencies | Frontend framework (React / Vue / Angular), UI library (Ant Design / MUI / Element Plus) |
| Existing files in same module | Coding patterns already in use (e.g., if `XxxController` uses `@RestController`, use Spring) |
| Import statements in adjacent files | Confirms library versions and patterns |

**Do not assume.** If context is unclear, skip the tech stack dimension and use a broader 2-dimension query.

---

## Per-Task 3-Round Strategy (tech stack is inferred, not fixed)

The examples below show the pattern. Replace the tech stack part with what you actually infer from the project.

### HTTP Controller
| Round | Pattern | Example (if Spring inferred) |
|-------|---------|------|
| 1 | `Controller {tech} HTTP {method} 接口规范` | `Controller Spring HTTP POST 接口规范` |
| 2 | `HTTP 接口 Controller 返回格式` | ← same, no tech stack |
| 3 | `接口规范` | ← broadest |

**Spec checklist after hit:** Return `Result<T>` · Params via `@Valid` + DTO · No business logic in Controller

---

### Application Service / Transaction
| Round | Pattern | Example (if Spring inferred) |
|-------|---------|------|
| 1 | `Service {tech} 事务边界` | `Application Service Spring @Transactional 事务边界` |
| 2 | `Service 事务 领域事件` | ← same |
| 3 | `事务` | ← same |

**Spec checklist after hit:** Transaction annotation in Application layer only · Inject interface, not impl

---

### Repository / Data Access
| Round | Pattern | Example (if MyBatis inferred) |
|-------|---------|------|
| 1 | `Repository {tech} 动态查询` | `Repository MyBatis Mapper XML 禁止 QueryWrapper` |
| 2 | `Repository 动态SQL` | ← same |
| 3 | `Repository 规范` | ← same |

**Spec checklist after hit:** No `QueryWrapper` · No `SELECT *` · No N+1 loop queries

---

### Job / Scheduled Task
| Round | Pattern |
|-------|---------|
| 1 | `Job 定时任务 分布式锁` |
| 2 | `定时任务 分布式锁 幂等` |
| 3 | `分布式锁` |

**Architecture Red Line:** Every scheduled method MUST acquire distributed lock. No lock = must not merge.

---

### MQ Consumer
| Round | Pattern |
|-------|---------|
| 1 | `MQ Consumer 消息消费 幂等` |
| 2 | `消息队列 幂等性 重试` |
| 3 | `Consumer 消息处理` |

---

### Feign / External HTTP Client
| Round | Pattern |
|-------|---------|
| 1 | `外部HTTP 调用 超时 熔断` |
| 2 | `HTTP Client 降级 FallbackFactory` |
| 3 | `外部调用 规范` |

---

### Domain Service / Aggregate Root
| Round | Pattern |
|-------|---------|
| 1 | `Domain 聚合根 值对象 领域服务` |
| 2 | `Domain Service 业务逻辑` |
| 3 | `领域层 规范` |

**Spec checklist after hit:** Domain layer must NOT import framework-specific annotations or ORM classes

---

### Redis Cache
| Round | Pattern |
|-------|---------|
| 1 | `Redis 缓存 Key 命名 TTL` |
| 2 | `缓存 Key 规范 序列化` |
| 3 | `缓存规范` |

---

### Frontend Component / Page
| Round | Pattern |
|-------|---------|
| 1 | `前端展示交互规范 时间格式 Tag颜色` |
| 2 | `formatDateTime 空值 Typography` |
| 3 | `前端规范` |

**Spec checklist after hit (前端展示与交互规范):**
- Time: `formatDateTime()` from `formatTime.ts`
- Null/empty → `-` (not `--` or `N/A`)
- Long text: `Typography.Text ellipsis={{ tooltip: text }}`

---

### Frontend Modal / Confirm Dialog
| Round | Pattern |
|-------|---------|
| 1 | `前端二次确认弹窗 ConfirmModal 暗色主题` |
| 2 | `ConfirmModal ConfigProvider 受控组件` |
| 3 | `弹窗 确认 规范` |

**Spec checklist after hit (前端二次确认弹窗规范):** Use `ConfirmModal` controlled component · Wrap with `ConfigProvider` dark theme · Never use `Modal.confirm()`

---

### Frontend Pagination
| Round | Pattern |
|-------|---------|
| 1 | `分页 Pagination 组件 统一` |
| 2 | `Pagination.tsx 前端分页` |
| 3 | `分页规范` |

**Spec checklist after hit:** Must use `src/components/Pagination.tsx` · Never implement pagination inline

---

## Query Parameter Reference

```python
mcp__steering-hub__search_steering(
    query      = "<keywords>",          # required, non-empty
    agent_name = "claude-code",         # always this value
    model_name = "<current model id>",  # e.g. "claude-sonnet-4-6"
    repo       = "catface996/steering-hub"  # current project full_name
)
```

The `agent_name`, `model_name`, `repo` fields are required for usage tracking. Never omit them.
