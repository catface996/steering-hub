# Implementation Plan: 仓库管理与规范绑定

**Branch**: `003-repo-management` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-repo-management/spec.md`

## Summary

在已有 `repo` 表基础上，为 Steering Hub 实现完整的仓库管理 UI 与仓库-规范绑定功能，并将 MCP `search_steering` 的 `repo` 参数接入后端 boost 逻辑，使 AI Agent 在仓库上下文下能优先得到已绑定的规范。

主要新增：`repo_steering` 关联表、RepoSteering 实体与 Mapper、Repo CRUD API 扩展、`SearchRequest.repo` 字段 + `SearchService` boost 实现、前端仓库管理页面、MCP client 透传 `repo` 参数至后端。

## Technical Context

**Language/Version**: Java 17, Python 3.11+, TypeScript
**Primary Dependencies**: Spring Boot 3.2, MyBatis Plus 3.5, Ant Design 5, React 18, mcp SDK, pgvector
**Storage**: PostgreSQL 15+ (pgvector extension)
**Testing**: 无自动化测试框架（与现有一致）
**Target Platform**: Linux server
**Project Type**: fullstack web-service (Spring Boot backend + React frontend + Python MCP server)
**Performance Goals**: 列表接口 p95 < 2s（数据量 1000+）
**Constraints**: 无角色权限控制；`repo` 表已存在；`repo_steering` 表不加 deleted 字段，解绑时物理删除
**Scale/Scope**: 数百个仓库、数千条规范的中等规模

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| 编码前查询 Steering Hub MCP | ✅ 将执行 | 在实现阶段每个新 Controller/Service 前必须调用 search_steering |
| DDD 分层（Controller→Service→Mapper） | ✅ 符合 | 与项目现有层次保持一致 |
| 带条件查询使用 XML Mapper，禁止 QueryWrapper | ⚠️ 需注意 | 现有 RepoServiceImpl 和 SearchServiceImpl 有 QueryWrapper 用法（既有代码），新增代码必须遵守 XML Mapper 规范 |
| 接口参数用 @Valid + DTO | ✅ 将执行 | 所有新 Controller 方法使用 DTO + @Valid |
| 统一返回 Result\<T\> | ✅ 将执行 | 与现有规范一致 |
| 分页使用项目 Pagination.tsx | ✅ 将执行 | 复用现有 src/components/Pagination.tsx |

**Constitution Re-check (Post Phase 1 Design)**: ✅ 无违规。`repo_steering` 关联查询全部通过 XML Mapper 实现；boost 逻辑在 Java SearchService 层，不破坏现有无 repo 参数的路径。

## Project Structure

### Documentation (this feature)

```text
specs/003-repo-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── repo-api.md      # Repo CRUD endpoints
│   ├── repo-steering-api.md  # Binding endpoints
│   └── search-api-delta.md   # SearchRequest 变更
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
steering-hub-backend/
├── steering-service/src/main/java/com/steeringhub/steering/
│   ├── entity/
│   │   └── RepoSteering.java                  # NEW
│   ├── mapper/
│   │   ├── RepoSteeringMapper.java             # NEW
│   │   └── RepoMapper.java                     # MODIFIED (add XML methods)
│   ├── mapper/xml/
│   │   ├── RepoSteeringMapper.xml              # NEW
│   │   └── RepoMapper.xml                      # MODIFIED
│   ├── dto/
│   │   ├── request/RepoCreateRequest.java      # NEW
│   │   ├── request/RepoUpdateRequest.java      # NEW
│   │   ├── request/RepoQueryRequest.java       # NEW
│   │   ├── request/RepoSteeringBindRequest.java  # NEW
│   │   └── response/RepoSteeringItem.java      # NEW
│   ├── service/
│   │   └── RepoService.java                    # MODIFIED (add CRUD + binding methods)
│   └── service/impl/
│       └── RepoServiceImpl.java                # MODIFIED
├── steering-service/src/main/java/com/steeringhub/steering/controller/
│   └── RepoController.java                     # MODIFIED (full CRUD + binding endpoints)
├── search-service/src/main/java/com/steeringhub/search/
│   ├── dto/SearchRequest.java                  # MODIFIED (add `repo` field)
│   ├── service/SearchService.java              # MODIFIED (add repoSearch overload)
│   └── service/impl/SearchServiceImpl.java     # MODIFIED (add boost logic)

docs/sql/
└── migration_003_repo_management.sql           # NEW

steering-hub-frontend/src/
├── services/repoService.ts                     # NEW
├── types/index.ts                              # MODIFIED (add Repo/RepoSteering types)
├── pages/repo/
│   ├── RepoListPage.tsx                        # NEW
│   └── RepoDetailPage.tsx                      # NEW
├── components/Sidebar.tsx                      # MODIFIED (add 仓库管理 menu item)
└── App.tsx                                     # MODIFIED (add /repos routes)

steering-hub-mcp/src/steering_hub_mcp/
└── client.py                                   # MODIFIED (pass `repo` to search API)
```

**Structure Decision**: Fullstack web application (Option 2). Backend extends existing steering-service and search-service modules; frontend adds new repo pages; MCP client gets a minor parameter update.

## Complexity Tracking

> No constitution violations requiring justification.
