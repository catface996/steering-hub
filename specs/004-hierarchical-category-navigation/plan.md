# Implementation Plan: 分级 Category 导航

**Branch**: `004-hierarchical-category-navigation` | **Date**: 2026-03-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-hierarchical-category-navigation/spec.md`

## Summary

在不修改任何现有接口的前提下，为 Steering Hub 新增两个 MCP 工具 `list_categories` 和 `list_steerings`，让 AI Agent 可以通过树形分级目录浏览规范，作为关键词搜索的补充导航路径。

主要新增：`CategoryNavController`（2个MCP端点）、`CategoryNavService` 接口 + `CategoryNavServiceImpl`、`SteeringCategoryMapper` XML 扩展（新增 2 个查询方法）、`SteeringMapper` XML 扩展（新增 1 个查询方法）、2 个 Response DTO（`CategoryNavItem` / `SteeringNavItem`）、MCP Server 新增 2 个 Tool（`list_categories` / `list_steerings`）、MCP Python client 新增 2 个 HTTP 函数。

## Technical Context

**Language/Version**: Java 17, Python 3.11+
**Primary Dependencies**: Spring Boot 3.2, MyBatis Plus 3.5, mcp SDK
**Storage**: PostgreSQL 15+（现有索引已满足，无需 migration）
**Testing**: 无自动化测试框架（与现有一致）
**Target Platform**: Linux server
**Performance Goals**: p95 < 500ms（分类/规范总量 10,000+ 条）
**Constraints**: 禁止修改任何现有接口或方法；新查询必须使用 XML Mapper（Constitution III）
**Scale/Scope**: 小规模新增（分类通常 < 100 个，每类规范通常 < 50 条）

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| 编码前查询 Steering Hub MCP | ⚠️ MCP 连接失败 | search 调用返回连接错误；已上报；按最佳实践起草 |
| DDD 分层（Controller→Service→Mapper） | ✅ 符合 | 新增 Controller → Service 接口 → ServiceImpl → Mapper |
| 带条件查询使用 XML Mapper，禁止 QueryWrapper | ✅ 强制执行 | 所有新查询方法均通过 XML Mapper 实现 |
| 接口参数用 @Valid + DTO | ✅ 将执行 | query params 用 @Valid @RequestParam + @Min @Max |
| 统一返回 Result\<T\> | ✅ 将执行 | 与现有规范一致 |
| 禁止修改现有接口 | ✅ 强制执行 | 只增不改（FR-007） |

## Project Structure

### Documentation (this feature)

```text
specs/004-hierarchical-category-navigation/
├── spec.md           # 核心需求（本 Feature）
├── research.md       # Phase 0 研究决策记录
├── data-model.md     # DB 表确认 + DTO 设计
├── contracts/api.md  # REST 接口 + MCP 工具定义
├── plan.md           # 本文件
├── quickstart.md     # 快速验证指南
└── tasks.md          # 任务分解
```

### Source Code

```text
steering-hub-backend/
└── steering-service/src/main/java/com/steeringhub/steering/
    ├── controller/
    │   └── CategoryNavController.java               # NEW — /api/v1/mcp/categories, /mcp/steerings
    ├── service/
    │   └── CategoryNavService.java                  # NEW — 接口定义
    ├── service/impl/
    │   └── CategoryNavServiceImpl.java              # NEW — 实现
    ├── mapper/
    │   ├── SteeringCategoryMapper.java              # MODIFIED — 新增 listChildrenWithCount 方法签名
    │   └── SteeringMapper.java                      # MODIFIED — 新增 listActiveByCategory 方法签名
    ├── mapper/xml/
    │   ├── SteeringCategoryMapper.xml               # MODIFIED — 新增 SQL
    │   └── SteeringMapper.xml                       # MODIFIED — 新增 SQL
    └── dto/response/
        ├── CategoryNavItem.java                     # NEW
        └── SteeringNavItem.java                     # NEW

steering-hub-mcp/src/steering_hub_mcp/
├── client.py                                        # MODIFIED — 新增 list_categories / list_steerings 函数
└── server.py                                        # MODIFIED — 新增 2 个 Tool 定义及处理器
```

## Phases

### Phase 1: 后端 DTO + Mapper 扩展

**目标**: 准备数据访问层，为 Service 层奠基

- T001: 新建 `CategoryNavItem.java` DTO
- T002: 新建 `SteeringNavItem.java` DTO
- T003: 扩展 `SteeringCategoryMapper.java`（新增 `listChildrenWithCount` 方法签名）
- T004: 扩展 `SteeringCategoryMapper.xml`（实现 listChildrenWithCount SQL）
- T005: 扩展 `SteeringMapper.java`（新增 `listActiveByCategory` 方法签名）
- T006: 扩展 `SteeringMapper.xml`（实现 listActiveByCategory SQL）

### Phase 2: 后端 Service + Controller

**目标**: 实现业务逻辑和 HTTP 端点

- T007: 新建 `CategoryNavService.java` 接口
- T008: 新建 `CategoryNavServiceImpl.java` 实现
- T009: 新建 `CategoryNavController.java`（2 个 MCP 端点）

### Phase 3: MCP Server 扩展

**目标**: 将后端能力暴露为 MCP 工具

- T010: 扩展 `client.py`（新增 `list_categories` / `list_steerings` HTTP 函数）
- T011: 扩展 `server.py`（注册 2 个新 Tool + 处理器）

### Phase 4: 验证

- T012: 端到端验证（按 quickstart.md 流程）

## Complexity Tracking

- 无新表，无 migration，复杂度低。
- 核心难点：XML Mapper 中 `parent_id IS NULL vs = ?` 的条件分支处理（已在 data-model.md SQL 示例中给出）。
- MCP Server 只是 HTTP 调用包装，无业务逻辑。
