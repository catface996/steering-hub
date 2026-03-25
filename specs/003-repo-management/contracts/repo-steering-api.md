# API Contract: 仓库-规范绑定 (Repo-Steering Binding)

**Base path**: `/api/v1/web/repos/{repoId}/steerings`
**Auth**: JWT Bearer

---

## GET /api/v1/web/repos/{repoId}/steerings
获取某仓库绑定的全部规范（分页）

**Path**: `repoId` — 仓库 ID

**Query Parameters**:
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | 页码 |
| size | int | 20 | 每页大小 |

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "steeringId": 10,
        "steeringTitle": "Controller REST 接口规范",
        "steeringStatus": "active",
        "mandatory": true,
        "bindingId": 1,
        "createdAt": "2026-03-23T10:00:00Z"
      }
    ],
    "total": 5,
    "size": 20,
    "current": 1,
    "pages": 1
  }
}
```

**Note**: `steeringStatus` 非 active 时，响应中包含 `warning: "该规范状态为 draft/deprecated，不参与 MCP boost"`。

---

## PUT /api/v1/web/repos/{repoId}/steerings/{steeringId}
绑定或更新某条规范（幂等 upsert）

**Path**: `repoId` — 仓库 ID，`steeringId` — 规范 ID

**Request Body** (`application/json`):
```json
{
  "mandatory": true
}
```

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "bindingId": 1,
    "repoId": 1,
    "steeringId": 10,
    "mandatory": true,
    "warning": null
  },
  "message": "success"
}
```

**Response 200 with warning** (规范状态非 active):
```json
{
  "code": 200,
  "data": {
    "bindingId": 1,
    "repoId": 1,
    "steeringId": 12,
    "mandatory": false,
    "warning": "规范当前状态为 deprecated，不参与 MCP 搜索 boost"
  },
  "message": "success"
}
```

---

## DELETE /api/v1/web/repos/{repoId}/steerings/{steeringId}
解除仓库与规范的绑定（物理删除）

**Response 200**:
```json
{
  "code": 200,
  "data": null,
  "message": "success"
}
```

**Response 404**: 绑定关系不存在

---

## GET /api/v1/web/steerings/{steeringId}/repos
反向查询：查看某规范被哪些仓库绑定（分页）

**Path**: `steeringId` — 规范 ID

**Query Parameters**:
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | 页码 |
| size | int | 20 | 每页大小 |

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "repoId": 1,
        "repoName": "my-service",
        "repoFullName": "org/my-service",
        "repoEnabled": true,
        "mandatory": true,
        "bindingId": 1,
        "createdAt": "2026-03-23T10:00:00Z"
      }
    ],
    "total": 3,
    "size": 20,
    "current": 1,
    "pages": 1
  }
}
```

**Note**: 该端点挂载在 `SteeringController` 下，路径为 `/api/v1/web/steerings/{steeringId}/repos`。
