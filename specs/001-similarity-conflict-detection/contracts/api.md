# API Contracts: 规范相似性检测

**Base URL**: `/api/v1`
**Auth**: JWT Bearer Token（所有接口）
**Response envelope**: `Result<T>` — `{ "code": 200, "message": "success", "data": T }`

---

## 1. 触发相似性检测任务

```
POST /api/v1/health-check/trigger
```

**Request Body**: 无

**Response 200** — 成功触发：
```json
{
  "code": 200,
  "data": {
    "taskId": 42,
    "status": "running"
  }
}
```

**Response 409** — 检测任务正在进行中：
```json
{
  "code": 409,
  "message": "检测任务正在进行中，请等待完成后再触发"
}
```

**Response 400** — active 规范数量不足：
```json
{
  "code": 400,
  "message": "规范数量不足，无需检测（当前 active 规范 1 条）"
}
```

---

## 2. SSE 事件流（任务状态推送）

```
GET /api/v1/health-check/events
Content-Type: text/event-stream
```

**Query Params**: 无（订阅服务端广播）

**Events**:

```
// 任务完成
event: task-completed
data: {"taskId": 42, "similarPairCount": 7, "activeSpecCount": 35, "completedAt": "2026-03-22T10:30:00Z"}

// 任务失败
event: task-failed
data: {"taskId": 42, "errorMessage": "计算异常：..."}

// 心跳（每 30s 一次，防止连接超时）
event: heartbeat
data: {}
```

**Notes**:
- 前端触发检测后立即建立此 SSE 连接
- 收到 `task-completed` 或 `task-failed` 后前端主动调用 `EventSource.close()`
- 后端 `SseEmitter` timeout 设为 300000ms（5 分钟）

---

## 3. 获取最新检测任务状态

```
GET /api/v1/health-check/latest
```

**Response 200** — 有历史任务：
```json
{
  "code": 200,
  "data": {
    "taskId": 42,
    "status": "completed",
    "similarPairCount": 7,
    "activeSpecCount": 35,
    "startedAt": "2026-03-22T10:28:00Z",
    "completedAt": "2026-03-22T10:30:00Z",
    "isExpired": false
  }
}
```

**Response 200** — 无历史任务：
```json
{
  "code": 200,
  "data": null
}
```

**字段说明**:
- `isExpired`: `completedAt` 超过 24 小时为 `true`，前端展示"结果已过期"提示
- `status`: `running` | `completed` | `failed`

---

## 4. 查询相似规范对列表

```
GET /api/v1/health-check/{taskId}/similar-pairs
```

**Path Params**:
- `taskId`: 检测任务 ID

**Query Params**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码（从 1 开始） |
| `pageSize` | int | 10 | 每页条数 |
| `specTitle` | String | — | 可选；规范A或规范B标题的模糊匹配关键词 |
| `categoryId` | Long | — | 可选；规范A所属分类ID过滤 |

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "total": 7,
    "page": 1,
    "pageSize": 10,
    "records": [
      {
        "id": 101,
        "specAId": 12,
        "specATitle": "MySQL 分页查询规范",
        "specACategoryId": 3,
        "specACategoryName": "数据库",
        "specBId": 27,
        "specBTitle": "数据库分页性能优化",
        "specBCategoryId": 3,
        "specBCategoryName": "数据库",
        "overallScore": 0.842,
        "vectorScore": 0.891,
        "titleScore": 0.600,
        "tagsScore": 0.667,
        "keywordsScore": 0.500,
        "reasonTags": ["内容语义相近", "标题相似", "tags重叠"]
      }
    ]
  }
}
```

---

## 5. 查看两条规范的完整内容（左右分屏对比）

```
GET /api/v1/steerings/compare?idA={idA}&idB={idB}
```

**Query Params**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `idA` | long | 规范 A 的 ID |
| `idB` | long | 规范 B 的 ID |

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "specA": {
      "id": 12,
      "title": "MySQL 分页查询规范",
      "tags": "MySQL,分页,性能",
      "keywords": "LIMIT,OFFSET,游标分页",
      "content": "## 背景\n...",
      "status": "active",
      "updatedAt": "2026-03-20T09:00:00Z"
    },
    "specB": {
      "id": 27,
      "title": "数据库分页性能优化",
      "tags": "分页,PostgreSQL,性能",
      "keywords": "分页查询,keyset,offset",
      "content": "## 概述\n...",
      "status": "active",
      "updatedAt": "2026-03-18T14:30:00Z"
    }
  }
}
```

**Notes**:
- 此接口为通用对比接口，不强依赖 similar_spec_pair 记录
- 任意两条规范都可以对比

---

## 错误码扩展

在现有 `ResultCode` 基础上新增：

| Code | HTTP Status | Message |
|------|-------------|---------|
| `TASK_ALREADY_RUNNING` | 409 | 检测任务正在进行中 |
| `SPEC_COUNT_INSUFFICIENT` | 400 | active 规范数量不足，无法检测 |
| `TASK_NOT_FOUND` | 404 | 检测任务不存在 |
