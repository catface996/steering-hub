# Research: 分级 Category 导航（DAG 方案）

**Feature**: 004-hierarchical-category-navigation
**Phase**: 0 — Research
**Date**: 2026-03-25 (rev 2: 加入数据审计结论 + DAG 决策)

---

## 1. 数据审计结论

**审计日期**: 2026-03-25

| 指标 | 数值 |
|------|------|
| 总分类数（active） | 6 |
| 一级分类（parent_id IS NULL） | 6 |
| 二级及以下 | 0 |
| 最大层级深度 | 1 |

**现有 6 个分类均为顶层平铺，没有任何父子关系。**

| 分类 | code | active 规范数 |
|------|------|-------------|
| 编码规范 | coding | 118 |
| 架构规范 | architecture | 85 |
| 安全规范 | security | 9 |
| 测试规范 | testing | 2 |
| 业务规范 | business | 1 |
| 文档规范 | documentation | 1 |

`coding` + `architecture` 合占 92%，内容极度混杂，急需建立子分类。

**`coding` 高频 tags 分析**:
- 前端(36)、React(20)、Java(18)、MyBatisPlus(18)、TypeScript(11)、SpringBoot(9)、DDD(9)

---

## 2. 数据模型选型：DAG vs 单亲树

**Decision**: 新建 `category_hierarchy` 关联表（DAG），不使用 `steering_category.parent_id`。

**Rationale**:
- 审计确认 `parent_id` 全为 NULL，无存量数据迁移成本。
- 某些技术子域（如 "MyBatisPlus"）语义上同时归属 "Java 后端" 和 "数据访问"，单亲树无法表达。
- DAG 表 `(parent, child, sort_order)` 设计简洁，扩展性好，后续还可支持更复杂的分类图谱。
- `steering_category.parent_id` 字段保留但不在本 Feature 中使用，零破坏性变更。

**Alternatives considered**:
- 直接使用 `steering_category.parent_id`（单亲树）：无法处理多父节点场景，且字段现已全部为 NULL，语义退化。
- Materialized Path（如 `/1/3/7`）：查询方便，但 PostgreSQL 无原生 ltree 支持（需扩展），且修改关系时路径重算复杂。
- Nested Set：读性能好，但写性能差，每次插入需重算区间，不适合运营场景。

---

## 3. 环检测：应用层 BFS vs DB 约束

**Decision**: 应用层 BFS 环检测 + DB 自环 CHECK 约束。

**Rationale**:
- PostgreSQL 无原生 DAG 环检测约束，只能通过触发器或应用层实现。
- 分类总数 < 100，BFS 遍历 O(V+E) 开销 < 1ms，应用层实现简单可控。
- DB 层保留 `CHECK(parent != child)` 作为自环兜底，防止应用层 bug 漏检。

**BFS 策略**: 从 `childId` 出发，向下遍历所有后代，若 `parentId` 出现在后代集合中则拒绝插入。

---

## 4. 顶层分类定义：无父节点

**Decision**: 顶层分类 = 在 `category_hierarchy` 中没有任何父节点的分类（`NOT EXISTS` 子查询）。

**Rationale**:
- 比依赖 `parent_id IS NULL` 更准确，与 DAG 模型一致。
- 允许管理员通过调整 `category_hierarchy` 关系将某分类"升级"为顶层，无需修改 `steering_category` 表。

---

## 5. tags 与 category 正交性

**Decision**: `steering.tags` 字段和所有 tags 相关查询逻辑完全不修改。

**Rationale**:
- tags = 技术栈维度（描述规范涉及哪些技术），category = 架构分层维度（规范属于哪个领域）。
- 两个维度正交，互不影响，且可以组合（先导航到分类，再在分类内按 tags 精搜）。
- 审计确认 `coding` 下 118 条规范都有丰富的 tags，保留 tags 能让 `search_steering` 继续正常工作。

---

## 6. 幂等 INSERT 策略

**Decision**: `POST /api/v1/web/category-hierarchy` 使用 `INSERT ... ON CONFLICT DO NOTHING`。

**Rationale**:
- `PRIMARY KEY(parent_category_id, child_category_id)` 天然保证唯一性。
- `ON CONFLICT DO NOTHING` 让重复请求返回成功，满足幂等要求，无需先查后写（避免竞态）。

---

## 7. Web 管理接口位置

**Decision**: 新建 `CategoryNavController` 同时承载 MCP 只读端点和 Web 管理端点。

**Rationale**:
- 所有接口都围绕 `category_hierarchy` 关联表，职责单一，集中在一个 Controller 更清晰。
- 路径前缀区分用途：`/api/v1/mcp/` 供 MCP Server 调用，`/api/v1/web/` 供 Web 管理端调用。

---

## 8. 建议的子分类结构（基于 tags 分析）

```
coding（保留）
├── java-backend     → Java, SpringBoot, DDD, Lombok, 事务          (约 45 条)
├── frontend         → React, Ant Design, 前端, 组件, Hook, 布局     (约 40 条)
├── typescript       → TypeScript, 类型, 泛型, 枚举                   (约 15 条)
└── data-access      → MyBatisPlus, Repository, XML Mapper           (约 18 条)

architecture（保留）
├── api-design       → REST, HTTP, 接口设计, API版本, 限流            (约 15 条)
├── database         → MySQL, Redis, 索引, 缓存, 分片                 (约 15 条)
└── devops           → Docker, Git, CI/CD, 容器                      (约 15 条)

security（暂不细分，9 条）
testing（暂不细分，2 条）
business（暂不细分，1 条）
documentation（暂不细分，1 条）
```

**注意**: 子分类的 INSERT 和 `category_hierarchy` 关系的 INSERT 属于数据操作，纳入迁移脚本，不是应用代码。
