# API Contract Delta: Search API 变更

**Endpoint**: `GET /api/v1/mcp/search`
**Change type**: 新增可选请求参数 `repo`

---

## 变更说明

在现有 `SearchRequest` DTO 中新增可选字段 `repo`（字符串），接受仓库 full_name（如 `org/my-service`）。

### SearchRequest 变更

```java
// 新增字段（可选）
private String repo;  // 仓库 full_name，如 "org/my-service"
```

### 请求示例（带 repo 参数）

```
GET /api/v1/mcp/search?query=Controller+REST&repo=org/my-service&limit=5&mode=hybrid
```

### boost 行为（后端 SearchService 层）

1. **有效 repo**: `repo` 非空 AND 对应仓库 `enabled=true` AND `deleted=false`
   - 搜索结果先按 `score` 降序排列（主排序，不变）
   - score 相同时：绑定（mandatory）> 绑定（非 mandatory）> 未绑定（次排序）
   - 高 score 未绑定规范仍排在低 score 绑定规范之前

2. **无效 repo / 不传 repo**: 行为与现有完全一致，忽略 repo 参数

### 响应字段变更

`SearchResult` 无字段变更（不需要暴露绑定关系信息给 MCP 客户端）。

---

## MCP client.py 变更

`search_steerings()` 函数新增 `repo` 参数：

```python
async def search_steerings(
    query: str,
    category_id: Optional[int] = None,
    limit: int = 10,
    mode: str = "hybrid",
    repo: Optional[str] = None   # NEW
) -> list[dict]:
    params = { ... }
    if repo:
        params["repo"] = repo    # 透传至后端，不在 MCP 层做 boost 计算
```

`server.py` 的 `handle_search_steering` 中已有 `repo = args.get("repo", "")` 取值，只需在调用 `client.search_steerings()` 时传入 `repo=repo`。

---

## 向后兼容

- 不传 `repo` 参数：等价于 `repo=null`，搜索行为与改动前完全一致。
- 传入不存在或 inactive 仓库的 full_name：忽略 repo，正常搜索，不报错。
