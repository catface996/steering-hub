# API Contract: 仓库管理 (Repo CRUD)

**Base path**: `/api/v1/web/repos`
**Auth**: JWT Bearer（与现有接口一致）

---

## POST /api/v1/web/repos
注册新仓库

**Request Body** (`application/json`):
```json
{
  "name": "my-service",
  "fullName": "org/my-service",
  "description": "Order management service",
  "url": "https://github.com/org/my-service",
  "language": "Java",
  "team": "order-team"
}
```

**Validation**:
- `name`: required, maxLength=200
- `fullName`: required, maxLength=300; 全局唯一（含软删除）

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "name": "my-service",
    "fullName": "org/my-service",
    "description": "Order management service",
    "url": "https://github.com/org/my-service",
    "language": "Java",
    "team": "order-team",
    "enabled": true,
    "createdAt": "2026-03-23T10:00:00Z",
    "updatedAt": "2026-03-23T10:00:00Z"
  },
  "message": "success"
}
```

**Response 409** (`full_name` 重复):
```json
{
  "code": 409,
  "message": "仓库 full_name 已存在: org/my-service"
}
```

---

## GET /api/v1/web/repos
分页查询仓库列表

**Query Parameters**:
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | 页码 |
| size | int | 20 | 每页大小 |
| name | string | - | 模糊搜索仓库名称 |
| team | string | - | 精确匹配团队 |
| enabled | boolean | - | 筛选启用/停用状态（不传则返回全部） |

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": 1,
        "name": "my-service",
        "fullName": "org/my-service",
        "description": "...",
        "url": "...",
        "language": "Java",
        "team": "order-team",
        "enabled": true,
        "createdAt": "2026-03-23T10:00:00Z",
        "updatedAt": "2026-03-23T10:00:00Z"
      }
    ],
    "total": 42,
    "size": 20,
    "current": 1,
    "pages": 3
  },
  "message": "success"
}
```

---

## GET /api/v1/web/repos/{id}
获取仓库详情

**Path**: `id` — 仓库 ID

**Response 200**: 同 POST 响应的 `data` 字段（单个对象）

**Response 404**: 仓库不存在或已软删除

---

## PUT /api/v1/web/repos/{id}
更新仓库信息

**Request Body** (`application/json`):
```json
{
  "name": "my-service-v2",
  "description": "Updated description",
  "url": "https://github.com/org/my-service",
  "language": "Java",
  "team": "order-team-new"
}
```

注：`fullName` 不可修改（唯一标识）。

**Response 200**: 返回更新后的仓库对象

---

## PATCH /api/v1/web/repos/{id}/toggle
切换仓库启用/停用状态

**Request Body**: 无（toggle 当前状态）

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "enabled": false
  },
  "message": "success"
}
```

---

## DELETE /api/v1/web/repos/{id}
软删除仓库（同步物理删除 repo_steering 绑定）

**Response 200**:
```json
{
  "code": 200,
  "data": null,
  "message": "success"
}
```

**Response 404**: 仓库不存在
