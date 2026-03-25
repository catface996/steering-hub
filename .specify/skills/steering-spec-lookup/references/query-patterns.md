# Query Patterns Reference

Detailed keyword patterns for each Task type, including retry alternatives.

---

## Backend Patterns

### HTTP Controller
| Attempt | Query |
|---------|-------|
| 1st | `Controller HTTP 接口规范 POST` |
| 2nd | `REST API Controller 返回 Result<T>` |
| 3rd | `Controller @Valid DTO 统一返回` |

**Key things to check in spec:**
- Return type must be `Result<T>`, never raw business object
- Parameters via `@Valid` + DTO, no raw `@RequestParam` for complex input
- No business logic in Controller layer

---

### Application Service / @Transactional
| Attempt | Query |
|---------|-------|
| 1st | `Application 层 Service 事务 @Transactional` |
| 2nd | `Service 事务边界 领域事件` |
| 3rd | `Application Service 协调 Domain Infrastructure` |

**Key things to check:**
- `@Transactional` only in Application layer (not Controller, not Domain, not Mapper)
- Inject Repository interface, not impl class

---

### Repository / Mapper (MyBatis)
| Attempt | Query |
|---------|-------|
| 1st | `Repository Mapper XML QueryWrapper 禁止` |
| 2nd | `MyBatis XML Mapper 动态SQL` |
| 3rd | `Mapper 禁止 SELECT * N+1` |

**Key things to check:**
- No `QueryWrapper` / `LambdaQueryWrapper` for conditional queries
- No `SELECT *`
- No loop queries (N+1)
- Conditional queries must use XML Mapper + `<if>`

---

### Job / Scheduled Task
| Attempt | Query |
|---------|-------|
| 1st | `Job 定时任务 分布式锁` |
| 2nd | `@Scheduled 分布式锁 RedissonLock` |
| 3rd | `定时任务 setIfAbsent 幂等` |

**Key things to check (Architecture Red Line):**
- Every `@Scheduled` method MUST start with distributed lock acquisition
- No lock = architecture violation, must not merge

---

### MQ Consumer
| Attempt | Query |
|---------|-------|
| 1st | `MQ 消息队列 Consumer 幂等` |
| 2nd | `消息消费 幂等性 重试` |
| 3rd | `Consumer 消息处理 异常处理` |

---

### MQ Producer
| Attempt | Query |
|---------|-------|
| 1st | `MQ 消息发送 可靠性` |
| 2nd | `RabbitMQ 消息发布 事务` |
| 3rd | `消息队列 发送 确认机制` |

---

### Feign / External HTTP
| Attempt | Query |
|---------|-------|
| 1st | `Feign 外部HTTP 超时降级` |
| 2nd | `FallbackFactory 外部调用 超时配置` |
| 3rd | `HTTP Client 熔断 降级` |

**Key things to check:**
- Must configure timeout
- Must have `FallbackFactory`
- No bare HTTP calls

---

### Domain Service / Aggregate
| Attempt | Query |
|---------|-------|
| 1st | `Domain 聚合根 值对象` |
| 2nd | `Domain Service 业务逻辑 纯函数` |
| 3rd | `领域层 不依赖 Spring 框架` |

**Key things to check:**
- Domain layer must not import Spring annotations or JPA/MyBatis framework classes
- No infrastructure references in Domain layer

---

### Redis Cache
| Attempt | Query |
|---------|-------|
| 1st | `Redis 缓存 Key 命名` |
| 2nd | `缓存 Key 规范 TTL` |
| 3rd | `Redis 缓存操作 序列化` |

---

## Frontend Patterns

### General Component / Page
| Attempt | Query |
|---------|-------|
| 1st | `前端展示与交互规范 时间格式 Tag颜色` |
| 2nd | `formatDateTime 时间展示 空值 '-'` |
| 3rd | `Typography ellipsis tooltip 前端组件` |

**Key things to check (spec [229]):**
- Time display: must use `formatDateTime()` from `formatTime.ts`
- Null/empty values: show `-`, not `--` or `N/A`
- Long text: `Typography.Text ellipsis={{ tooltip: text }}`

---

### Modal / Confirm Dialog
| Attempt | Query |
|---------|-------|
| 1st | `前端二次确认弹窗 ConfirmModal 暗色主题` |
| 2nd | `ConfirmModal ConfigProvider 禁止 Modal.confirm` |
| 3rd | `弹窗确认 暗色主题 受控组件` |

**Key things to check (spec [230]):**
- Must use `ConfirmModal` controlled component, NOT `Modal.confirm()`
- Must wrap with `ConfigProvider` dark theme

---

### Pagination
| Attempt | Query |
|---------|-------|
| 1st | `分页 Pagination 组件` |
| 2nd | `Pagination.tsx 统一分页` |
| 3rd | `前端分页 禁止自行实现` |

**Key things to check:**
- Must use `src/components/Pagination.tsx`
- Never implement pagination inline

---

## Constitution Core Rules (Quick Reference)

From `.specify/memory/constitution.md` v1.3.0:

1. **Spec-First**: Every independent Task = one independent MCP query, no exceptions
2. **QueryWrapper Ban**: Conditional queries must use XML Mapper
3. **@Transactional**: Application layer only
4. **Job Lock**: All scheduled jobs need distributed lock — architecture red line
5. **Persistent Query**: 1 miss ≠ stop; need 3 consecutive misses before report_search_failure
6. **No SELECT \***: Always specify columns
7. **Result\<T\>**: All controller responses must be wrapped
