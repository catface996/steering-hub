# Quickstart: 002-version-history-search

**Branch**: `002-version-history-search` | **Date**: 2026-03-22

## 开发前准备

### 1. 数据库迁移

```bash
# 连接到 steering_hub 数据库并执行迁移脚本
psql -U steering_hub -d steering_hub -f docs/sql/migration_002_version_status.sql
```

迁移内容：
- `steering` 表新增 `lock_version INT DEFAULT 0`
- `steering` 表更新 status CHECK 约束（加 superseded）
- `steering_version` 表新增 `status VARCHAR(20)` 和 `updated_at TIMESTAMPTZ`
- `steering_review` 表更新 action CHECK 约束（加 withdraw）
- 为现有 steering_version 记录回填 status
- 新增 `idx_sv_steering_status` 复合索引

### 2. 启动后端

```bash
cd steering-hub-backend && mvn spring-boot:run -pl app
```

### 3. 启动前端

```bash
cd steering-hub-frontend && npm run dev
```

---

## 核心变更验证

### 验证 1：搜索只返回 active 版本（FR-001）

```bash
# 1. 创建并 activate 一条规范（v1 active）
# 2. 编辑该规范（触发 v2 draft）
# 3. submit v2（pending_review）
# 4. 搜索 → 应返回 v1 的 title/content，不返回 v2 内容
curl -X POST http://localhost:8080/api/v1/web/search/hybrid \
  -H "Content-Type: application/json" \
  -d '{"query":"你的关键词","limit":5}'
```

### 验证 2：Embedding 不在 pending_review 时更新（FR-002）

```bash
# 记录规范的 embedding 向量（通过 DB 查询）
SELECT encode(embedding::text::bytea, 'hex') FROM steering WHERE id = ?;
# 提交修订到 pending_review
# 再次查询 embedding → 应与之前完全一致
```

### 验证 3：Activate 触发 superseded + embedding 更新（FR-003/FR-004）

```bash
# approve 后执行 activate
curl -X POST http://localhost:8080/api/v1/web/steerings/{id}/review \
  -H "Content-Type: application/json" \
  -d '{"action":"activate"}'
# 验证：
# - steering_version 旧 active 行 status = 'superseded'
# - steering_version 新行 status = 'active'
# - steering.content 已更新为新版本内容
# - steering.embedding 已重新生成
```

### 验证 4：并发 activate 冲突返回 409（SC-007）

```bash
# 两个并发请求同时 activate，后到请求应收到 409
curl -X POST http://localhost:8080/api/v1/web/steerings/{id}/review \
  -d '{"action":"activate"}' & \
curl -X POST http://localhost:8080/api/v1/web/steerings/{id}/review \
  -d '{"action":"activate"}'
# 预期：一个 200，一个 409
```

### 验证 5：版本历史 Tab

```
浏览器打开 http://localhost:5173/steerings/{id}
→ 点击"版本历史"Tab
→ 显示版本列表，按版本号倒序
→ 点击任意版本 → 弹出只读内容预览
```

---

## 关键文件速查

| 需求 | 文件 |
|------|------|
| DB 迁移 | `docs/sql/migration_002_version_status.sql` |
| 枚举扩展 | `common/enums/SteeringStatus.java`, `ReviewAction.java` |
| activate 事务逻辑 | `SteeringServiceImpl.java` - `reviewSteering(ACTIVATE)` |
| 版本历史 API | `SteeringController.java` - `GET /{id}/versions` |
| XML Mapper | `SteeringMapper.xml`, `SteeringVersionMapper.xml` |
| 前端版本历史 Tab | `SteeringDetailPage.tsx` |
| 前端类型 | `types/index.ts` |
