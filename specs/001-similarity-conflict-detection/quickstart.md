# Quickstart: 规范相似性检测

**Feature**: 001-similarity-conflict-detection（相似性检测）
**Date**: 2026-03-22

---

## 1. 数据库迁移

执行新增表的 DDL（在 PostgreSQL 中运行）：

```bash
psql -U steering -d steering_hub -f docs/sql/migration_001_similarity.sql
```

迁移文件内容见 `docs/sql/migration_001_similarity.sql`（由 `/speckit.tasks` 阶段生成）。

---

## 2. 后端配置

在 `steering-hub-backend/app/src/main/resources/application.yml` 新增：

```yaml
health-check:
  similarity-threshold: 0.7      # 综合相似度阈值，低于此值的规范对不持久化
  sse-timeout-ms: 300000          # SSE 连接超时（5 分钟）
  async-thread-pool-size: 2       # 检测任务线程池大小
```

---

## 3. 本次实现范围

### 后端新增文件

| 文件 | 说明 |
|------|------|
| `steering-service/.../entity/HealthCheckTask.java` | 检测任务实体 |
| `steering-service/.../entity/SimilarSpecPair.java` | 相似规范对实体 |
| `steering-service/.../mapper/HealthCheckTaskMapper.java` | Mapper 接口 |
| `steering-service/.../mapper/SimilarSpecPairMapper.java` | Mapper 接口 |
| `steering-service/.../resources/mapper/HealthCheckTaskMapper.xml` | XML SQL |
| `steering-service/.../resources/mapper/SimilarSpecPairMapper.xml` | XML SQL（含分页查询） |
| `steering-service/.../service/HealthCheckService.java` | 服务接口 |
| `steering-service/.../service/impl/HealthCheckServiceImpl.java` | 服务实现（核心计算逻辑） |
| `steering-service/.../controller/HealthCheckController.java` | REST + SSE 接口 |

### 后端修改文件

| 文件 | 修改内容 |
|------|---------|
| `common/.../response/ResultCode.java` | 新增 `TASK_ALREADY_RUNNING`, `SPEC_COUNT_INSUFFICIENT`, `TASK_NOT_FOUND` |
| `steering-service/.../controller/SteeringController.java` | 新增 `GET /steerings/compare` 端点 |
| `app/src/main/resources/application.yml` | 新增 `health-check` 配置块 |

### 前端新增文件

| 文件 | 说明 |
|------|------|
| `src/pages/health/HealthPage.tsx` | 健康度主页（触发按钮 + 任务状态 + 相似对列表） |
| `src/services/healthService.ts` | API 调用（trigger/latest/pairs/compare） |

### 前端修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/App.tsx` | 新增 `/health` 路由 |
| `src/components/Sidebar.tsx` | 在主导航新增"规范健康度"菜单项 |

---

## 4. 前端页面结构

```
HealthPage
├── 页头：标题"规范健康度" + [运行检测] 按钮
│       └── 运行中：按钮 disabled + Spin 图标 + "检测进行中..."
│           完成：按钮恢复可用
├── 任务状态栏（有历史任务时显示）
│   ├── 最近检测时间、耗时、检测规范数
│   ├── 发现相似对数量（Badge）
│   └── "结果已过期，建议重新检测"（isExpired = true 时）
└── 相似规范对列表（Table）
    ├── 列：规范 A 标题、规范 B 标题、综合相似度（进度条）、相似原因（Tag 组）、操作
    ├── 操作：[查看对比] → 打开 Drawer（左右分屏）
    └── 底部：Pagination 组件（src/components/Pagination.tsx）

SpecCompareDrawer（Ant Design Drawer，width="80%"）
├── 左侧（50%）：规范 A 完整内容（标题 + tags + markdown 正文）
└── 右侧（50%）：规范 B 完整内容（独立滚动）
```

---

## 5. SSE 连接生命周期

```
用户点击"运行检测"
  ↓
POST /api/v1/health-check/trigger  →  taskId: 42
  ↓
建立 EventSource: GET /api/v1/health-check/events
  ↓
等待事件...
  ├── event: task-completed  →  EventSource.close() + 刷新列表
  ├── event: task-failed     →  EventSource.close() + 显示错误
  └── event: heartbeat       →  忽略（保活）
```

---

## 6. 关键实现注意事项

1. **spec_a_id < spec_b_id 约束**：持久化时确保小 ID 为 a，大 ID 为 b，避免重复存储 (a,b) 和 (b,a)
2. **embedding 为 NULL 处理**：向量维度权重降为 0，其余三维权重重新归一化（0.2+0.15+0.15 → 归一化为 0.4+0.3+0.3）
3. **性能预期**：
   - 100 条规范：~4950 对，Java 内存计算 < 5s
   - 500 条规范：~125000 对，Java 内存计算 < 2min（在 3min 目标内）
   - 内存峰值：500 条规范 × 512维float = ~1MB，完全可接受
4. **SecurityConfig 放行**：SSE 端点 `/api/v1/health-check/events` 需在 `SecurityConfig` 中确认已被 JWT 过滤器正确处理（SSE 请求携带 Bearer Token 即可）
