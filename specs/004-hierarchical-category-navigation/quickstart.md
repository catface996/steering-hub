# Quickstart: 分级 Category 导航（DAG 方案）

**Feature**: 004-hierarchical-category-navigation (rev 2: DAG)

---

## 1. 数据库迁移

```bash
PGPASSWORD=steering123 psql -h localhost -U steering -d steering_hub \
  -f docs/sql/migration_004_category_hierarchy.sql
```

**验证**:
```bash
# 应有 8 条记录（coding→4子分类 + architecture→4子分类）
PGPASSWORD=steering123 psql -h localhost -U steering -d steering_hub \
  -c "SELECT COUNT(*) FROM category_hierarchy;"

# 应有 14 个分类（6原有 + 8新增）
PGPASSWORD=steering123 psql -h localhost -U steering -d steering_hub \
  -c "SELECT id, name, code FROM steering_category WHERE deleted=false ORDER BY id;"
```

---

## 2. 后端编译与启动

```bash
cd steering-hub-backend
mvn clean package -DskipTests
java -jar app/target/steering-hub-app-*.jar
```

**验证 MCP 只读接口**:
```bash
# 顶层分类（应返回 6 个，coding 和 architecture 的 childCount=4）
curl -s "http://localhost:8080/api/v1/mcp/categories" | jq '.data[] | {id, name, code, childCount}'

# coding 子分类（应返回 java-backend/frontend/typescript/data-access）
curl -s "http://localhost:8080/api/v1/mcp/categories?parent_id=1" | jq '.data[] | {id, name, code}'

# 某分类下的规范摘要（替换 category_id 为实际值）
curl -s "http://localhost:8080/api/v1/mcp/steerings?category_id=1&limit=5" \
  | jq '.data[] | {id, title, tags}'

# 叶节点 → 空数组
curl -s "http://localhost:8080/api/v1/mcp/categories?parent_id=9999" | jq '.data'
```

**验证 Web 管理接口**:
```bash
# 添加关系（将 id 替换为实际值）
curl -s -X POST http://localhost:8080/api/v1/web/category-hierarchy \
  -H "Content-Type: application/json" \
  -d '{"parentCategoryId": 1, "childCategoryId": 10, "sortOrder": 5}' | jq .

# 触发环检测（A→B→C 存在时，尝试 C→A 应返回 400）
# 先建 A→B
curl -s -X POST http://localhost:8080/api/v1/web/category-hierarchy \
  -H "Content-Type: application/json" \
  -d '{"parentCategoryId": 10, "childCategoryId": 11, "sortOrder": 0}' | jq .
# 再尝试 B→coding（成环）
curl -s -X POST http://localhost:8080/api/v1/web/category-hierarchy \
  -H "Content-Type: application/json" \
  -d '{"parentCategoryId": 11, "childCategoryId": 1, "sortOrder": 0}' | jq .
# 预期：400，CYCLE_DETECTED

# 删除关系（幂等）
curl -s -X DELETE http://localhost:8080/api/v1/web/category-hierarchy \
  -H "Content-Type: application/json" \
  -d '{"parentCategoryId": 10, "childCategoryId": 11}' | jq .
# 重复删除同一关系 → 仍返回成功
curl -s -X DELETE http://localhost:8080/api/v1/web/category-hierarchy \
  -H "Content-Type: application/json" \
  -d '{"parentCategoryId": 10, "childCategoryId": 11}' | jq .
```

---

## 3. MCP Server 启动与验证

```bash
cd steering-hub-mcp
uv run steering-hub-mcp
```

在 Claude Code 中调用新工具：

```python
# Step 1: 顶层分类（含 childCount）
mcp__steering-hub__list_categories()
# 预期：coding(childCount=4), architecture(childCount=4), business, security, testing, documentation

# Step 2: 下钻到 coding 子分类
mcp__steering-hub__list_categories(parent_id=1)
# 预期：java-backend, frontend, typescript, data-access

# Step 3: 查看 java-backend 下的规范
mcp__steering-hub__list_steerings(category_id=<java-backend-id>, limit=10)
# 预期：active 规范列表，每条含 tags 字段（原始逗号分隔字符串）

# Step 4: 完整规范内容
mcp__steering-hub__get_steering(id=<id>)
```

---

## 4. 回归验证：tags 和 search_steering 不受影响

```bash
# 验证 search_steering 行为不变（结果应与改动前完全一致）
curl -s "http://localhost:8080/api/v1/mcp/search?query=Controller&limit=5" | jq '.data[] | {id, title, score}'
```

```python
# 在 Claude Code 中验证 MCP search 不受影响
mcp__steering-hub__search_steering(query="Controller REST 接口", tags=["Controller"])
# 预期：返回结果与 Feature 004 上线前完全一致
```

---

## 5. 关键文件索引

| 文件 | 说明 |
|------|------|
| `docs/sql/migration_004_category_hierarchy.sql` | DB 迁移：建表 + 子分类 + 关系初始化 |
| `steering-service/.../entity/CategoryHierarchy.java` | DAG 关系实体 |
| `steering-service/.../mapper/CategoryHierarchyMapper.xml` | insert/delete/selectChildIds SQL |
| `steering-service/.../mapper/SteeringCategoryMapper.xml` | listTopLevel / listChildren SQL |
| `steering-service/.../mapper/SteeringMapper.xml` | listActiveByCategory SQL |
| `steering-service/.../service/impl/CategoryNavServiceImpl.java` | 核心：BFS 环检测 + 导航逻辑 |
| `steering-service/.../controller/CategoryNavController.java` | 4 个端点 |
| `steering-hub-mcp/.../client.py` | list_categories / list_steerings HTTP 调用 |
| `steering-hub-mcp/.../server.py` | 2 个 MCP Tool 注册 |
