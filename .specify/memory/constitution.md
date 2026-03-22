# Steering Hub Constitution

## Core Principles

### I. Spec-First Coding（规范优先，非商量）
**在编写任何代码之前，必须先通过 Steering Hub MCP 查询相关编码规范。**

工作流程：
1. 分析当前编码任务，提取关键词（如：Controller、Repository、Transaction、MQ、Job 等）
2. 使用 `mcp__steering-hub__search_steering` 搜索相关规范
3. 判断搜索结果是否适用于当前任务：
   - ✅ 适用：以规范为准，结合具体业务需求编写代码
   - ❌ 不适用或未找到：使用 `mcp__steering-hub__report_search_failure` 上报原因，再按最佳实践编码
4. 代码实现必须符合规范中的强制要求（标注 `❌ 禁止` 的绝对不能出现）

**禁止跳过规范查询直接编写代码。**

### II. DDD 分层架构（严格单向依赖）
项目采用严格 DDD 分层，依赖方向：流量入口层 → Application 层 → Domain 层 → Infrastructure 层

- **流量入口层**（Controller / Consumer / Job）：只调用 Application 层接口，不含业务逻辑
- **Application 层**：事务边界所在层，协调 Domain + Infrastructure，发布领域事件
- **Domain 层**：纯业务逻辑，不感知框架，定义 Repository 接口
- **Infrastructure 层**：实现 Repository、Cache、MQ、Feign 等，不含业务逻辑

**每层只依赖下一层的接口，禁止依赖实现类，禁止跨层调用。**

### III. 查询方式规范（禁止 QueryWrapper）
- ✅ 单行 CRUD：BaseMapper 原生方法（selectById / updateById / deleteById）
- ✅ 带条件查询：XML Mapper + `<if>` 动态 SQL
- ❌ 禁止：`QueryWrapper` / `LambdaQueryWrapper` 任何带条件的查询
- ❌ 禁止：SELECT *
- ❌ 禁止：循环查询（N+1 问题）

### IV. 编码质量门禁
- 所有接口参数使用 `@Valid` + DTO 校验，禁止在 Controller 方法中直接处理原始参数
- 统一返回 `Result<T>` 格式，禁止直接返回业务对象
- 异常必须被捕获，日志必须包含业务标识（如 orderId、userId）
- 定时任务（Job）必须加分布式锁，外部 HTTP 调用必须配置超时和 FallbackFactory

### V. 技术栈约束
- 后端：Java 17+，Spring Boot，MyBatis Plus（查询仅用 XML Mapper）
- 前端：React + TypeScript + Ant Design
- 数据库：PostgreSQL（主库）+ Redis（缓存）
- 消息队列：RabbitMQ
- 分页：统一使用项目 `src/components/Pagination.tsx` 组件，禁止自行实现

## Steering Hub MCP 使用规范

### 搜索时机
在以下场景必须触发 MCP 搜索：
- 新建任何 Controller / Consumer / Job 类
- 新建任何 Repository 实现 / Redis 缓存操作 / MQ 消息发送
- 新建 Application Service / Domain Service
- 编写涉及事务、分布式锁、分页查询的代码
- 编写 Feign 客户端或外部 HTTP 调用

### 搜索关键词建议
| 编码场景 | 建议关键词 |
|---|---|
| HTTP Controller | Controller REST 接口规范 |
| MQ 消费者 | Consumer 消息消费 幂等 |
| 定时任务 | Job 定时任务 分布式锁 |
| Repository 实现 | Repository DO Converter |
| Redis 缓存 | Redis 缓存 Key 命名 |
| MQ 消息发送 | MQ 消息发送 可靠性 |
| Application 层 | Application 事务 领域事件 |
| Domain 层 | Domain 聚合根 值对象 |
| Feign 调用 | Feign 外部HTTP 超时降级 |

### 上报失败条件
当搜索结果满足以下任一条件时，使用 `report_search_failure` 上报：
- 搜索结果与当前编码场景完全无关（相关性 < 0.5）
- 搜索到的规范已废弃（status = deprecated）
- 规范内容不覆盖当前具体场景（如：搜到了 Controller 规范但在写 WebSocket 处理器）

## Governance

所有代码提交前必须确认：
1. 已执行 Steering Hub 规范查询
2. 代码符合规范中的强制要求（无 ❌ 违规）
3. 分层依赖正确，无跨层调用

**Version**: 1.0.0 | **Ratified**: 2026-03-22 | **Last Amended**: 2026-03-22
