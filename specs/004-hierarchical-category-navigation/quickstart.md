# Quickstart: 分级 Category 导航

**Feature**: 004-hierarchical-category-navigation

---

## 1. 无需数据库迁移

`steering_category.parent_id` 和 `sort_order` 已存在，直接跳过此步骤。

---

## 2. 后端编译与启动

```bash
cd steering-hub-backend
mvn clean package -DskipTests
java -jar app/target/steering-hub-app-*.jar
```

**验证 MCP 分类导航接口**:

```bash
# 查询顶层分类（不传 parent_id）
curl -s "http://localhost:8080/api/v1/mcp/categories" | jq '.data[] | {id, name, code, childCount}'

# 查询某顶层分类的子分类（替换 1 为实际 ID）
curl -s "http://localhost:8080/api/v1/mcp/categories?parent_id=1" | jq '.data'

# 查询某分类下的规范摘要（替换 1 为实际分类 ID）
curl -s "http://localhost:8080/api/v1/mcp/steerings?category_id=1&limit=5" | jq '.data[] | {id, title, tags}'

# 验证不存在的 parent_id 返回空数组而非报错
curl -s "http://localhost:8080/api/v1/mcp/categories?parent_id=9999" | jq '.data'
```

---

## 3. MCP Server 启动与验证

```bash
cd steering-hub-mcp
uv run steering-hub-mcp
```

在 Claude Code 中调用新工具：

```python
# Step 1: 浏览顶层分类
mcp__steering-hub__list_categories()
# 预期：返回 coding, architecture, business 等顶层分类，含 childCount

# Step 2: 下钻到子分类（使用上一步返回的 id）
mcp__steering-hub__list_categories(parent_id=1)
# 预期：返回该顶层分类的子分类列表

# Step 3: 查看某分类下的规范（使用上一步返回的 id）
mcp__steering-hub__list_steerings(category_id=5, limit=10)
# 预期：返回 ≤10 条 active 规范的 id、title、tags

# Step 4: 获取具体规范完整内容（使用上一步返回的 id）
mcp__steering-hub__get_steering(id=42)
# 预期：返回完整规范内容
```

---

## 4. 回归验证：确认现有工具未受影响

```python
# 验证 search_steering 行为不变
mcp__steering-hub__search_steering(
    query="Controller REST 接口规范",
    limit=5
)
# 预期：与改动前返回结果完全一致
```

---

## 5. 关键文件索引

| 文件 | 说明 |
|------|------|
| `steering-service/.../controller/CategoryNavController.java` | 2 个 MCP 端点 |
| `steering-service/.../service/CategoryNavService.java` | 服务接口 |
| `steering-service/.../service/impl/CategoryNavServiceImpl.java` | 服务实现 |
| `steering-service/.../mapper/SteeringCategoryMapper.xml` | 子分类查询 SQL |
| `steering-service/.../mapper/SteeringMapper.xml` | 分类下规范查询 SQL |
| `steering-service/.../dto/response/CategoryNavItem.java` | 分类摘要 DTO |
| `steering-service/.../dto/response/SteeringNavItem.java` | 规范摘要 DTO |
| `steering-hub-mcp/src/steering_hub_mcp/client.py` | MCP HTTP 调用层 |
| `steering-hub-mcp/src/steering_hub_mcp/server.py` | MCP Tool 注册 |
