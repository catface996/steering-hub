# Implementation Plan: 分级 Category 导航（DAG 方案）

**Branch**: `004-hierarchical-category-navigation` | **Date**: 2026-03-25 (rev 2) | **Spec**: [spec.md](./spec.md)

## Summary

新建 `category_hierarchy` 关联表（DAG），为 Steering Hub 提供分级分类导航能力。新增两个 MCP 工具（`list_categories` / `list_steerings`）和两个 Web 管理端点（POST/DELETE category-hierarchy）。`steering.tags` 字段和 `search_steering` 逻辑**完全不动**。

主要新增：DB migration（`category_hierarchy` 表 + 子分类数据 + 初始关系数据）、`CategoryHierarchy` 实体、`CategoryHierarchyMapper`（含环检测 BFS 辅助查询）、`SteeringCategoryMapper` / `SteeringMapper` XML 扩展、`CategoryNavService` 接口 + `CategoryNavServiceImpl`（含 BFS 环检测逻辑）、`CategoryNavController`（4个端点）、2个 Response DTO、MCP Server 新增 2 个 Tool。

## Technical Context

**Language/Version**: Java 17, Python 3.11+
**Primary Dependencies**: Spring Boot 3.2, MyBatis Plus 3.5, mcp SDK
**Storage**: PostgreSQL 15+（需 migration：新建 `category_hierarchy` 表）
**Testing**: 无自动化测试框架（与现有一致）
**Performance Goals**: p95 < 500ms（分类/规范总量 10,000+ 条）
**Constraints**: 禁止修改任何现有接口；禁止修改 `steering.tags` 字段和 tags 相关逻辑；新查询必须使用 XML Mapper（Constitution III）；`steering_category.parent_id` 字段不读写

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| 编码前查询 Steering Hub MCP | ⚠️ MCP 连接失败（两次） | 已上报；按最佳实践起草 |
| DDD 分层 | ✅ | Controller → Service 接口 → ServiceImpl → Mapper |
| XML Mapper（禁止 QueryWrapper） | ✅ 强制 | 所有新查询通过 XML Mapper，BFS 环检测也通过 Mapper |
| @Valid + DTO | ✅ | Request Body 使用 DTO + @Valid |
| 统一返回 Result\<T\> | ✅ | 与现有规范一致 |
| @Transactional 在 Service 层 | ✅ | addHierarchy/removeHierarchy 的事务标注在 ServiceImpl |
| tags 字段完全不动 | ✅ 强制 | 所有改动均不涉及 `steering.tags` 和 search 逻辑 |

## Project Structure

### Documentation

```text
specs/004-hierarchical-category-navigation/
├── spec.md           # 需求（rev 2: DAG + tags 正交）
├── research.md       # 研究决策（rev 2: 数据审计 + DAG 选型）
├── data-model.md     # DB 设计 + DTO + SQL（rev 2: category_hierarchy 表）
├── contracts/api.md  # REST + MCP 工具（rev 2: 4个端点）
├── plan.md           # 本文件
├── quickstart.md     # 验证指南
└── tasks.md          # 14 个任务
```

### Source Code

```text
steering-hub-backend/
└── steering-service/src/main/java/com/steeringhub/steering/
    ├── controller/
    │   └── CategoryNavController.java                    # NEW — 4个端点
    ├── service/
    │   └── CategoryNavService.java                       # NEW — 接口
    ├── service/impl/
    │   └── CategoryNavServiceImpl.java                   # NEW — 实现（含环检测 BFS）
    ├── entity/
    │   └── CategoryHierarchy.java                        # NEW
    ├── mapper/
    │   ├── CategoryHierarchyMapper.java                  # NEW
    │   ├── SteeringCategoryMapper.java                   # MODIFIED — 新增 listTopLevel/listChildren
    │   └── SteeringMapper.java                           # MODIFIED — 新增 listActiveByCategory
    ├── mapper/xml/
    │   ├── CategoryHierarchyMapper.xml                   # NEW
    │   ├── SteeringCategoryMapper.xml                    # MODIFIED
    │   └── SteeringMapper.xml                            # MODIFIED
    └── dto/
        ├── request/CategoryHierarchyRequest.java         # NEW
        ├── request/CategoryHierarchyDeleteRequest.java   # NEW
        ├── response/CategoryNavItem.java                 # NEW
        └── response/SteeringNavItem.java                 # NEW

docs/sql/
└── migration_004_category_hierarchy.sql                  # NEW

steering-hub-mcp/src/steering_hub_mcp/
├── client.py                                             # MODIFIED
└── server.py                                             # MODIFIED
```

## Phases

### Phase 1: DB Migration

**Purpose**: 建表 + 初始化子分类数据 + 建立关系

- T001: 创建 `docs/sql/migration_004_category_hierarchy.sql`（建表 + 子分类 INSERT + category_hierarchy 初始关系 INSERT）

### Phase 2: 实体 + Mapper（可大量并行）

- T002 [P]: `CategoryHierarchy.java` 实体
- T003 [P]: `CategoryHierarchyMapper.java` + `CategoryHierarchyMapper.xml`（insertRelation、deleteRelation、selectChildIds 用于 BFS）
- T004 [P]: DTOs（CategoryNavItem / SteeringNavItem / CategoryHierarchyRequest / CategoryHierarchyDeleteRequest）
- T005 [P]: `SteeringCategoryMapper.java` + `SteeringCategoryMapper.xml` 扩展（listTopLevel / listChildren）
- T006 [P]: `SteeringMapper.java` + `SteeringMapper.xml` 扩展（listActiveByCategory）

### Phase 3: Service 层

- T007 [P]: `CategoryNavService.java` 接口定义
- T008: `CategoryNavServiceImpl.java`（listChildren 调用 Mapper；addHierarchy 含环检测 BFS；removeHierarchy 幂等删除）

### Phase 4: Controller

- T009: `CategoryNavController.java`（4个端点）

### Phase 5: MCP Server

- T010: `client.py` 扩展（list_categories / list_steerings HTTP 函数）
- T011: `server.py` 扩展（2个 Tool 注册 + 处理器）

### Phase 6: 验证

- T012: 端到端验证（quickstart.md 全流程）

## Complexity Tracking

- 核心难点：BFS 环检测（需通过 XML Mapper 批量查子节点，不能循环单条查询，避免 N+1 违规）
- 性能关注点：`listTopLevel` 中的相关子查询 childCount（分类 < 100 时可接受；若需优化可改为 JOIN + GROUP BY）
- tags 隔离：所有改动对 `search_steering` 的 tags 逻辑零影响，需在 T012 验证中明确回归
