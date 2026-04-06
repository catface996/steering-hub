# Steering Hub Constitution

## Core Principles

### I. Spec-First Coding（规范优先，非商量）

**每一个独立 Task 开始编码前，必须单独执行一次 Steering Hub MCP 查询。**

"在会话开始时查过了"不构成跳过后续 Task 查询的理由。批量执行 N 个 Task，就必须有 N 次查询记录。每次查询都必须阅读结果并对照编码——返回结果后直接跳过视为违规。

标准执行节奏：

```
Task T012 开始 → search("Controller REST 接口") → 命中规范 ID:7 → 按规范编码
Task T013 开始 → search("Job 定时任务 分布式锁") → 命中规范 ID:218 → 按规范编码
Task T014 开始 → search("Redis 缓存 Key 命名") → 未命中 → report_search_failure → 按最佳实践编码
```

工作流程：
1. 分析当前 Task，提取关键词（如：Controller、Repository、Transaction、MQ、Job 等）
2. 使用 `mcp__steering-hub__search_steering` 搜索相关规范
3. 判断搜索结果是否适用于当前 Task：
   - 适用：以规范为准，结合具体业务需求编写代码
   - 不适用或未找到：使用 `mcp__steering-hub__report_search_failure` 上报原因，再按最佳实践编码
4. 代码实现必须符合规范中的强制要求（标注 `❌ 禁止` 的绝对不能出现）

#### 明确禁止的行为（红线）

- 禁止批量执行多个 Task 而不在每个 Task 前查询规范
- 禁止以"和上一个 Task 类似"为由跳过查询
- 禁止规范查询返回结果后不阅读直接跳过
- 禁止只在会话开始时查一次，后续 Task 不再查

#### 违规后的补救流程

如果发现某个 Task 编码时遗漏了规范查询，必须立即：
1. 暂停当前 Task，补查相关规范
2. 对照规范检查已写代码，发现偏差必须修复后再继续
3. 用 `mcp__steering-hub__record_usage` 记录规范使用，完成闭环

---

### II. DDD 分层架构（严格单向依赖）

项目采用严格 DDD 分层，依赖方向：流量入口层 → Application 层 → Domain 层 → Infrastructure 层

- **流量入口层**（Controller / Consumer / Job）：只调用 Application 层接口，不含业务逻辑
- **Application 层**：事务边界所在层，协调 Domain + Infrastructure，发布领域事件
- **Domain 层**：纯业务逻辑，不感知框架，定义 Repository 接口
- **Infrastructure 层**：实现 Repository、Cache、MQ、Feign 等，不含业务逻辑

**每层只依赖下一层的接口，禁止依赖实现类，禁止跨层调用。**

每次实现 Service 时，必须自问以下问题并确保全部通过，再提交代码：

- `@Transactional` 是否标注在 Application 层，而非 Domain 层或 Controller 层？
- Domain 层代码是否引用了 Spring 注解、JPA/MyBatis 框架类，或其他基础设施 API？
- 注入的依赖是否都是接口而非实现类（如注入 `UserRepository` 而非 `UserRepositoryImpl`）？

---

### III. 查询方式规范（禁止 QueryWrapper）

- 单行 CRUD：BaseMapper 原生方法（selectById / updateById / deleteById）
- 带条件查询：XML Mapper + `<if>` 动态 SQL
- 禁止：`QueryWrapper` / `LambdaQueryWrapper` 任何带条件的查询
- 禁止：SELECT *
- 禁止：循环查询（N+1 问题）

---

### IV. 编码质量门禁

**接口参数**：所有接口参数使用 `@Valid` + DTO 校验，禁止在 Controller 方法中直接处理原始参数；统一返回 `Result<T>` 格式，禁止直接返回业务对象。

**异常与日志**：异常必须被捕获，日志必须包含业务标识（如 orderId、userId）。

**定时任务（Job）——架构红线**：所有 `@Scheduled` 或定时任务类，必须在方法开头加分布式锁（RedissonLock 或 RedisTemplate `setIfAbsent`）。没有分布式锁的 Job 视为架构违规，不得合并。这条是强制项，无例外。

**外部调用**：外部 HTTP 调用必须配置超时和 `FallbackFactory`，不允许裸调。

---

### V. 技术栈约束

- 后端：Java 17+，Spring Boot，MyBatis Plus（查询仅用 XML Mapper）
- 前端：React + TypeScript + Ant Design
- 数据库：PostgreSQL（主库）+ Redis（缓存）
- 消息队列：RabbitMQ
- 分页：统一使用项目 `src/components/Pagination.tsx` 组件，禁止自行实现

---

## Steering Hub MCP 使用规范

### 搜索时机

在以下场景必须触发 MCP 搜索（每个场景对应一次独立查询，不得合并）：

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

### 持续查询规则（连续 3 次未命中才可停止）

**一次查询未命中或不适用，不能停止查询，必须更换关键词再查，连续三次均未命中才可停止并上报。**

1. 每个 Task 开始前，至少执行 1 次 MCP 查询
2. 若查询结果不适用（内容不匹配当前场景，score 仅作参考信号），**必须更换关键词再查**，不得直接放弃
3. **连续 3 次查询均未命中**，才允许停止查询，并调用 `report_search_failure` 上报（附带 3 次查询关键词）
4. 每次查询必须使用不同的关键词（禁止重复相同 query 的无效重试）
5. 3 次查询内任意一次命中适用规范，则立即停止查询，按规范编码

示例：
```
Task T012 开始
→ 查询 1: search("Controller HTTP 接口") → 命中 ID:7 → 按规范编码（停止查询）

Task T013 开始
→ 查询 1: search("WebSocket 规范") → 未命中/不适用
→ 查询 2: search("实时通信 SSE 流式接口") → 未命中/不适用
→ 查询 3: search("HTTP 长连接 服务端推送") → 未命中/不适用
→ 连续 3 次未命中 → report_search_failure(queries=["WebSocket规范","实时通信SSE","HTTP长连接"]) → 按最佳实践编码
```

#### 明确禁止的行为（红线）

- 禁止第 1 次查询未命中就直接放弃查询
- 禁止用相同关键词重复查询（无效重试）
- 禁止未达 3 次就调用 report_search_failure

### 上报失败条件

当连续 3 次查询均满足以下任一条件时，使用 `report_search_failure` 上报：

- 搜索结果与当前编码场景完全无关（以内容匹配为准，score 仅作参考信号）
- 搜索到的规范已废弃（status = deprecated）
- 规范内容不覆盖当前具体场景（如：搜到了 Controller 规范但在写 WebSocket 处理器）

---

## Governance

所有代码提交前必须确认：
1. 每个 Task 都已执行独立的 Steering Hub 规范查询，有查询记录
2. 代码符合规范中的强制要求（无 ❌ 违规）
3. 分层依赖正确，无跨层调用，DDD 三问全部通过
4. 所有 Job 已加分布式锁

### 实现后合规自查（Mandatory Post-Implementation Check）

**每个 Feature 实现完成后，必须执行以下自查，发现违规立即修复：**

#### 后端自查清单
```bash
# 1. QueryWrapper 违规检测（不应有任何结果）
grep -rn "QueryWrapper\|LambdaQueryWrapper" \
  steering-hub-backend/*/src/main/java/ | grep -v "//.*QueryWrapper"

# 2. @Transactional 位置检测（不应出现在 Controller/Mapper 层）
grep -rn "@Transactional" \
  steering-hub-backend/*/src/main/java/*/controller/ \
  steering-hub-backend/*/src/main/java/*/mapper/ 2>/dev/null

# 3. Controller 注入实现类检测（应注入接口而非 Impl）
grep -rn "private.*ServiceImpl\|private.*RepositoryImpl" \
  steering-hub-backend/*/src/main/java/*/controller/ 2>/dev/null
```

#### 前端自查清单
```bash
# 1. 分页组件违规检测（不应自行实现分页，必须用 Pagination.tsx）
grep -rn "Pagination\b" steering-hub-frontend/src/pages/ | grep -v "import.*Pagination"

# 2. API 路径规范检测（Web 接口必须含 /web/，MCP 接口含 /mcp/）
grep -rn "api/v1/[^w]" steering-hub-frontend/src/services/ | grep -v "/web/\|/mcp/"

# 3. 直接 fetch/axios 调用检测（应统一使用 request.ts 封装）
grep -rn "axios\.\|fetch(" steering-hub-frontend/src/pages/ \
  steering-hub-frontend/src/services/ 2>/dev/null
```

### VI. Claude Code Session 管理（持续任务必须复用 Session）

**对于持续性任务（同一项目的多轮 review、修复、迭代），必须使用命名 Session，禁止每次新建无状态调用。**

#### 规则
1. **首次启动**：使用 `--name <task-name>` 创建命名 Session，记录 Session ID
2. **后续调用**：使用 `-r <session-name>` resume 同一 Session，CC 自行维护上下文
3. **禁止行为**：对同一任务反复用 `--print` 无状态调用，导致 CC 遗失规范查询结果和历史决策
4. **Session 命名规范**：`steering-hub-<task>-<date>`，如 `steering-hub-review-20260323`

#### 原因
- CC 每次无状态调用都是全新进程，不记得上次查了哪些规范、做了哪些判断
- Review 结果无法被下一次调用继承，导致重复工作或规范遗漏
- Session 模式让 CC 自己维护上下文，无需水滴每次手动摘要

#### 调用模板
```bash
# 创建（首次）
claude --name steering-hub-review-$(date +%Y%m%d) \
  --permission-mode bypassPermissions --print "任务描述..."

# 续接（后续）
claude -r steering-hub-review-$(date +%Y%m%d) \
  --permission-mode bypassPermissions --print "继续..."
```

**Version**: 1.3.0 | **Ratified**: 2026-03-22 | **Last Amended**: 2026-03-25
