# Quickstart: 仓库管理与规范绑定

**Feature**: 003-repo-management

---

## 1. 数据库迁移

```bash
psql -U steering_hub -d steering_hub \
  -f docs/sql/migration_003_repo_management.sql
```

迁移内容：
- 创建 `repo_steering` 表及索引
- 为 `repo.full_name` 添加 UNIQUE 约束（若不存在）

---

## 2. 后端编译与启动

```bash
cd steering-hub-backend
mvn clean package -DskipTests
java -jar app/target/steering-hub-app-*.jar
```

**验证 Repo API**:
```bash
# 注册仓库
curl -s -X POST http://localhost:8080/api/v1/web/repos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"my-service","fullName":"org/my-service","team":"order-team"}' | jq .

# 查询仓库列表
curl -s "http://localhost:8080/api/v1/web/repos?page=1&size=10" \
  -H "Authorization: Bearer <token>" | jq .

# 绑定规范（mandatory=true）
curl -s -X PUT http://localhost:8080/api/v1/web/repos/1/steerings/5 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"mandatory":true}' | jq .
```

**验证 MCP Search boost**:
```bash
# 带 repo 参数搜索
curl -s "http://localhost:8080/api/v1/mcp/search?query=Controller&repo=org/my-service&limit=5" \
  -H "X-API-Key: <api-key>" | jq '.data[] | {steeringId, title, score}'
```

---

## 3. 前端开发

```bash
cd steering-hub-frontend
npm install
npm run dev
```

前端变更入口：
- 侧边栏菜单：`仓库管理`（图标：`DatabaseOutlined`）
- 路由：`/repos`（列表页）、`/repos/:id`（详情+绑定页）

---

## 4. MCP Server 启动

```bash
cd steering-hub-mcp
uv run steering-hub-mcp
```

验证 search_steering tool 的 repo boost:
```python
# 在 Claude Code 中调用
mcp__steering-hub__search_steering(
    query="Controller REST API",
    repo="org/my-service",
    limit=5
)
# 预期：org/my-service 绑定的规范排名靠前
```

---

## 5. 关键文件索引

| 文件 | 说明 |
|------|------|
| `docs/sql/migration_003_repo_management.sql` | DB 迁移脚本 |
| `steering-service/.../entity/RepoSteering.java` | 新实体 |
| `steering-service/.../mapper/RepoSteeringMapper.xml` | 绑定关系查询 SQL |
| `steering-service/.../controller/RepoController.java` | 仓库 CRUD 接口 |
| `search-service/.../service/impl/SearchServiceImpl.java` | boost 逻辑 |
| `steering-hub-frontend/src/pages/repo/RepoListPage.tsx` | 仓库列表页 |
| `steering-hub-frontend/src/pages/repo/RepoDetailPage.tsx` | 仓库详情+绑定页 |
| `steering-hub-mcp/src/steering_hub_mcp/client.py` | MCP client repo 参数透传 |
