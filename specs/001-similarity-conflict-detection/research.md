# Research: 规范相似性检测

**Feature**: 001-similarity-conflict-detection（仅相似性检测部分）
**Date**: 2026-03-22

---

## Decision 1: 相似度计算策略

**Decision**: 四维加权综合相似度，在 Java 层内存计算，不通过 Bedrock 重新生成 embedding

**Rationale**:
- `steering` 表已有 `embedding vector(512)` 列（Titan Embeddings v2）；向量余弦相似度直接用已存 embedding 计算，避免 O(n²) 次 Bedrock API 调用
- 四维权重：向量余弦 0.5、标题 Jaccard 0.2、tags 重叠率 0.15、关键词重叠率 0.15
- 若 embedding 为 NULL（规范尚未生成向量），向量维度权重平摊给其他三维

**Alternatives considered**:
- 纯 PostgreSQL pgvector 计算：可以用 `1 - (a.embedding <=> b.embedding)` 算向量相似度，但 title/tags/keywords 还是要在应用层算，且两层结合复杂；对 500 条规范约 125000 对，全部走 SQL JOIN 性能不可控
- 实时 Bedrock 调用：O(n²) 次 API 调用成本高，且 100 条规范就需要调用 4950 次，超出 3 分钟目标

---

## Decision 2: 异步任务 + SSE 推送

**Decision**: `@Async` + Spring Boot `SseEmitter`

**Rationale**:
- `@Async` 配合 `ThreadPoolTaskExecutor` 已是 Spring Boot 标准做法，无需引入 RabbitMQ（任务是一次性的，不需要持久化队列）
- `SseEmitter` 是 Spring MVC 内置支持，无需额外依赖；前端用原生 `EventSource` API 监听
- 同一时间只允许一个检测任务运行（trigger 接口检查 `running` 状态任务存在时返回 409）

**Alternatives considered**:
- RabbitMQ：现有项目有 RabbitMQ 配置，但健康检测是前端主动触发的一次性任务，不需要 MQ 的可靠投递语义
- WebSocket：SSE 单向推送即满足需求（服务端 → 前端），不需要全双工

---

## Decision 3: 相似度计算模块放置位置

**Decision**: 放在 `steering-service` 模块中，新增 `HealthCheckService`

**Rationale**:
- 相似检测是规范管理域的功能，逻辑上属于 `steering-service`
- 需要直接访问 `SteeringMapper`（读取所有 active 规范 + embedding）；放在 `steering-service` 避免跨模块依赖
- 不新建模块——现有模块已是合理粒度，本功能不带来新的独立部署需求

**Alternatives considered**:
- 新建 `similarity-service` 模块：过度设计，本功能代码量不大（~5 个文件）
- 放在 `compliance-service`：合规服务与相似检测职责不同，放一起违反单一职责

---

## Decision 4: 文本相似度算法

**Decision**: 标题用 Jaccard（分词后 token 集合交集/并集）；tags/keywords 用集合重叠率（intersection / min(|A|,|B|)）

**Rationale**:
- Jaccard 对中文标题效果合理（按空格或标点分词后比较词集合），实现简单无额外依赖
- tags/keywords 本身是离散标签，集合重叠率比编辑距离更直观
- 两者计算 O(1)（最多几十个 token），对 125000 对规范总耗时可忽略不计

**Alternatives considered**:
- Levenshtein 编辑距离：适合短字符串比较，但对语义相似但词序不同的标题（"MySQL 分页优化" vs "分页查询 MySQL 性能"）效果差

---

## Decision 5: 结果持久化策略

**Decision**: 每次触发创建新的 `health_check_task` 记录；本次任务的 `similar_spec_pair` 关联到该 task_id；前端查"最新 completed 任务"的结果

**Rationale**:
- 保留历史检测记录（FR-011 要求持久化，24 小时有效期提示）
- 每次触发覆盖逻辑放到前端（展示"最新 completed"），而不是后端删除旧数据，避免并发问题
- 24 小时过期仅为前端 UI 提示（`completed_at` < now - 24h 时显示"结果已过期"），不自动删除数据

**Alternatives considered**:
- 每次覆盖（DELETE + INSERT）：并发触发时可能出现数据不一致
- Redis 缓存 + 定时过期：引入额外存储，当前规模不必要

---

## Decision 6: 前端 SSE 连接管理

**Decision**: 触发检测后立即建立 SSE 连接；收到 `task-completed` 或 `task-failed` 事件后关闭连接并刷新列表

**Rationale**:
- SSE 连接仅在检测运行期间保持，不做全局持久连接（防止空闲连接积压）
- 前端用 React `useEffect` 管理 `EventSource` 生命周期，cleanup 时调用 `.close()`
- 后端 `SseEmitter` 设置 timeout（5 分钟）——超时自动断开，防止服务端资源泄漏

---

## Key Constraints Confirmed

- 相似度阈值 0.7（配置文件 `health-check.similarity-threshold`，不提供 UI 入口）
- 同一时刻只能运行一个检测任务（前端按钮在 running 状态时禁用）
- 规范数量 ≤ 1 时，任务直接完成并返回空结果，不报错
- embedding 为 NULL 的规范对，向量维度得分为 0，其他三维权重重新归一化
