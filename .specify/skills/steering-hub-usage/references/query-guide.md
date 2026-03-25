# Query Guide — How to Form Steering Hub Search Keywords

## Keyword Extraction Rules

Analyze the Task along three dimensions, combine into a search query string.

| Dimension | What to extract | Examples |
|-----------|----------------|---------|
| **Layer** | Coding layer being implemented | `Controller`, `Service`, `Repository`, `Job`, `MQ Consumer`, `前端组件` |
| **Tech stack** | Framework / library in use | `Spring`, `MyBatis`, `@Transactional`, `React`, `Ant Design` |
| **Scenario** | Specific concern or pattern | `分页`, `事务`, `缓存`, `分布式锁`, `幂等`, `弹窗`, `时间格式` |

**Composition rule**: Start with the most specific combination (all 3 dimensions), then broaden on retry.

```
1st attempt: {layer} + {tech stack} + {scenario}   ← most precise
2nd attempt: {layer} + {scenario}                   ← drop tech stack
3rd attempt: {scenario} or {layer} alone            ← broadest
```

---

## Per-Task 3-Round Keyword Strategy

### HTTP Controller (REST)
| Round | Query |
|-------|-------|
| 1 | `Controller Spring HTTP POST 接口规范` |
| 2 | `HTTP 接口 Controller 返回格式` |
| 3 | `接口规范` |

**Spec checklist after hit:** Return `Result<T>` · Params via `@Valid` + DTO · No business logic in Controller

---

### Application Service / @Transactional
| Round | Query |
|-------|-------|
| 1 | `Application Service Spring @Transactional 事务边界` |
| 2 | `Service 事务 领域事件` |
| 3 | `事务` |

**Spec checklist after hit:** `@Transactional` in Application layer only · Inject interface, not impl

---

### Repository / MyBatis Mapper
| Round | Query |
|-------|-------|
| 1 | `Repository MyBatis Mapper XML 禁止 QueryWrapper` |
| 2 | `Mapper 动态SQL XML` |
| 3 | `Repository 规范` |

**Spec checklist after hit:** No `QueryWrapper`/`LambdaQueryWrapper` · No `SELECT *` · No loop queries (N+1) · Conditions in XML `<if>`

---

### Job / Scheduled Task
| Round | Query |
|-------|-------|
| 1 | `Job 定时任务 分布式锁 @Scheduled` |
| 2 | `定时任务 RedissonLock setIfAbsent` |
| 3 | `分布式锁` |

**Spec checklist after hit (Architecture Red Line):** Every `@Scheduled` method MUST acquire distributed lock at the very start. No lock = must not merge.

---

### MQ Consumer
| Round | Query |
|-------|-------|
| 1 | `MQ Consumer 消息消费 幂等` |
| 2 | `消息队列 幂等性 重试` |
| 3 | `Consumer 消息处理` |

---

### MQ Producer
| Round | Query |
|-------|-------|
| 1 | `MQ 消息发送 RabbitMQ 可靠性` |
| 2 | `消息发布 事务 确认机制` |
| 3 | `消息发送 规范` |

---

### Feign / External HTTP Client
| Round | Query |
|-------|-------|
| 1 | `Feign 外部HTTP 超时 FallbackFactory` |
| 2 | `HTTP Client 熔断 降级` |
| 3 | `外部调用 规范` |

**Spec checklist after hit:** Must set timeout · Must have `FallbackFactory` · No bare HTTP call

---

### Domain Service / Aggregate Root
| Round | Query |
|-------|-------|
| 1 | `Domain 聚合根 值对象 领域服务` |
| 2 | `Domain Service 业务逻辑` |
| 3 | `领域层 规范` |

**Spec checklist after hit:** Domain layer must NOT import Spring annotations or JPA/MyBatis classes

---

### Redis Cache
| Round | Query |
|-------|-------|
| 1 | `Redis 缓存 Key 命名 TTL` |
| 2 | `缓存 Key 规范 序列化` |
| 3 | `缓存规范` |

---

### Frontend Component / Page
| Round | Query |
|-------|-------|
| 1 | `前端展示交互规范 时间格式 Tag颜色` |
| 2 | `formatDateTime 空值 Typography ellipsis` |
| 3 | `前端规范` |

**Spec checklist after hit (spec [229]):**
- Time: `formatDateTime()` from `formatTime.ts`
- Null/empty → `-` (not `--` or `N/A`)
- Long text: `Typography.Text ellipsis={{ tooltip: text }}`

---

### Frontend Modal / Confirm Dialog
| Round | Query |
|-------|-------|
| 1 | `前端二次确认弹窗 ConfirmModal 暗色主题` |
| 2 | `ConfirmModal ConfigProvider 受控组件` |
| 3 | `弹窗 确认 规范` |

**Spec checklist after hit (spec [230]):** Use `ConfirmModal` controlled component · Wrap with `ConfigProvider` dark theme · Never use `Modal.confirm()`

---

### Frontend Pagination
| Round | Query |
|-------|-------|
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
