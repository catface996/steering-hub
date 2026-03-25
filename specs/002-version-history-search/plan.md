# Implementation Plan: 规范版本管理与搜索行为优化

**Branch**: `002-version-history-search` | **Date**: 2026-03-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-version-history-search/spec.md`

## Summary

将现有"编辑即覆盖"的规范管理模式改造为显式版本化管理：`steering_version` 表独立追踪每个版本的状态；`steering` 主表仅持有当前 active 版本的热缓存（title/content/embedding）；搜索结果已过滤为 active，核心修复点是 activate 时同步 superseded + embedding 更新、withdraw 撤回支持、以及前端版本历史 Tab。

## Technical Context

**Language/Version**: Java 17 / TypeScript 5
**Primary Dependencies**: Spring Boot 3.2, MyBatis Plus 3.x, React 18, Ant Design 5, Vite, Amazon Bedrock (Titan Embeddings v2)
**Storage**: PostgreSQL 15 with pgvector, `steering` + `steering_version` tables
**Testing**: Maven Surefire (unit), manual integration
**Target Platform**: Linux server (EC2), browser (Vite dev/prod)
**Project Type**: Web service (backend REST API) + Web application (frontend SPA)
**Performance Goals**: 版本历史列表 <2s 加载（SC-004）
**Constraints**: activate 必须在单次事务内完成 embedding 更新 + superseded 状态切换；embedding 失败事务回滚（FR-003）
**Scale/Scope**: 单体 steering 表，规范数量级 ~1k 条

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| I. Spec-First Coding（每 Task 独立查询） | ✅ PASS（计划阶段，实现阶段强制执行） | tasks.md 中每 Task 须独立查询 |
| II. DDD 分层（@Transactional 在 Service 层） | ✅ PASS | activate 事务标注在 SteeringServiceImpl（Service 层） |
| III. 禁止 QueryWrapper（条件查询用 XML） | ⚠️ WATCH | SteeringServiceImpl 当前有 LambdaQueryWrapper（已有技术债），本次新增代码全部用 XML Mapper |
| IV. 编码质量门禁（@Valid+DTO, Result<T>）| ✅ PASS | 新增 WithdrawRequest、VersionHistoryVO 均用 DTO |
| V. 技术栈约束（MyBatis XML、Pagination.tsx）| ✅ PASS | 版本历史列表超 20 条用 Pagination.tsx |

**Violations noted**: III 中 SteeringServiceImpl 已存在 LambdaQueryWrapper（技术债，不在本 feature 范围内修复）。本 feature 新增代码严格遵守。

## Project Structure

### Documentation (this feature)

```text
specs/002-version-history-search/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api.md           ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
steering-hub-backend/
  common/
    enums/
      SteeringStatus.java         ← 新增 SUPERSEDED 枚举值
      ReviewAction.java           ← 新增 WITHDRAW 枚举值

  steering-service/
    entity/
      Steering.java               ← 新增 lockVersion 字段
      SteeringVersion.java        ← 新增 status、changeSummary 字段（保留 changeLog 兼容）
    dto/
      request/
        SubmitRevisionRequest.java  ← 新增：提交修订（编辑+submit 拆分）
      response/
        SteeringVersionVO.java      ← 新增：版本历史列表项
        SteeringVersionDetailVO.java ← 新增：版本详情（只读）
    mapper/
      SteeringMapper.java           ← 新增 activateUpdate（乐观锁更新主表）
      SteeringVersionMapper.java    ← 新增 findBySteeringId、findBySteeringIdAndVersion、updateStatus
    service/
      SteeringService.java          ← 新增 listVersions、getVersionDetail、withdraw 接口
      impl/
        SteeringServiceImpl.java    ← 修改 reviewSteering(ACTIVATE) + updateSteering 行为
    controller/
      SteeringController.java       ← 新增 GET /{id}/versions、GET /{id}/versions/{ver}
    resources/
      mapper/
        SteeringMapper.xml          ← 新增 activateUpdate SQL
        SteeringVersionMapper.xml   ← 新增 findBySteeringId、updateStatus SQL

steering-hub-frontend/
  src/
    types/index.ts                  ← 新增 SteeringVersion 类型、superseded 状态
    services/
      steeringService.ts            ← 新增 listVersions、getVersionDetail、withdraw 方法
    pages/
      steering/
        SteeringDetailPage.tsx      ← 新增"版本历史"Tab、withdraw 按钮、superseded 状态显示

docs/sql/
  migration_002_version_status.sql  ← 新增：steering 加 lock_version、steering_version 加 status 列
```

**Structure Decision**: Web application (Option 2). 后端在现有 steering-service 扩展，不新建模块；前端在现有 SteeringDetailPage 扩展 Tab，不新建页面。

## Complexity Tracking

> No unresolved violations requiring justification.
