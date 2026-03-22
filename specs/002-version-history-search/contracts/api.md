# API Contracts: 规范版本管理与搜索行为优化

**Branch**: `002-version-history-search` | **Date**: 2026-03-22
**Base URL**: `/api/v1/web/steerings`

---

## 已有接口（行为变更，签名不变）

### POST /{id}/review

**变更**：`action` 新增合法值 `withdraw`；`action=activate` 增加乐观锁冲突返回 409。

**Request Body**（不变）：
```json
{
  "action": "submit | approve | reject | activate | deprecate | withdraw",
  "comment": "可选备注"
}
```

**Response 变化**：
- `action=activate` 冲突时 HTTP 409：
```json
{
  "code": 409,
  "message": "并发冲突，请刷新后重试",
  "data": null
}
```

---

### PUT /{id}（updateSteering）

**变更**：当 steering 处于 ACTIVE 状态时，不再覆盖主表 content，仅创建新 draft 版本。返回结构不变。

> 注意：前端调用 `PUT /{id}` 后若规范处于 active 状态，返回的 `status` 仍为 `active`（不变），`currentVersion` 不变。

---

## 新增接口

### GET /{id}/versions — 版本历史列表

**描述**：获取指定规范的所有版本历史，按版本号倒序排列，支持分页。

**Request Params**：
| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `current` | long | 否 | 1 | 页码 |
| `size` | long | 否 | 20 | 每页条数 |

**Response**：`Result<IPage<SteeringVersionVO>>`
```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": 102,
        "versionNumber": 3,
        "status": "pending_review",
        "changeSummary": "更新异常处理规范",
        "createdAt": "2026-03-22T10:00:00+08:00",
        "updatedAt": "2026-03-22T10:30:00+08:00"
      },
      {
        "id": 101,
        "versionNumber": 2,
        "status": "superseded",
        "changeSummary": "新增示例代码",
        "createdAt": "2026-03-20T09:00:00+08:00",
        "updatedAt": "2026-03-22T10:30:00+08:00"
      },
      {
        "id": 100,
        "versionNumber": 1,
        "status": "superseded",
        "changeSummary": "初始版本",
        "createdAt": "2026-03-18T08:00:00+08:00",
        "updatedAt": "2026-03-20T09:00:00+08:00"
      }
    ],
    "total": 3,
    "size": 20,
    "current": 1,
    "pages": 1
  }
}
```

---

### GET /{id}/versions/{versionNumber} — 版本详情（只读）

**描述**：获取指定规范的指定版本号的完整内容快照，只读，不返回编辑入口。

**Path Params**：
| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | Long | 规范 ID |
| `versionNumber` | int | 版本号（1-based integer） |

**Response**：`Result<SteeringVersionDetailVO>`
```json
{
  "code": 200,
  "data": {
    "id": 101,
    "steeringId": 42,
    "versionNumber": 2,
    "title": "Controller REST 接口规范",
    "content": "## 接口设计原则\n...",
    "tags": "controller,rest,api",
    "keywords": "Controller,REST,接口,规范",
    "status": "superseded",
    "changeSummary": "新增示例代码",
    "createdAt": "2026-03-20T09:00:00+08:00",
    "updatedAt": "2026-03-22T10:30:00+08:00"
  }
}
```

**Error**：
- 404：规范不存在 / 版本号不存在

---

## 前端新增 API 调用

### steeringService.ts 新增方法

```typescript
// 获取版本历史列表（分页）
listVersions(id: number, current?: number, size?: number): Promise<PageResult<SteeringVersionVO>>

// 获取版本详情
getVersionDetail(id: number, versionNumber: number): Promise<SteeringVersionDetailVO>

// 撤回（withdraw）
withdraw(id: number, comment?: string): Promise<void>
// 实现：调用 POST /{id}/review with { action: 'withdraw', comment }
```

---

## TypeScript 类型新增

```typescript
// types/index.ts

export type SteeringStatus =
  | 'draft' | 'pending_review' | 'approved' | 'rejected'
  | 'active' | 'superseded' | 'deprecated';

export interface SteeringVersionVO {
  id: number;
  versionNumber: number;
  status: SteeringStatus;
  changeSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SteeringVersionDetailVO {
  id: number;
  steeringId: number;
  versionNumber: number;
  title: string;
  content: string;
  tags?: string;
  keywords?: string;
  status: SteeringStatus;
  changeSummary?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 搜索接口（无签名变更，仅记录行为保证）

- `POST /api/v1/web/search/hybrid`：仅返回 `steering.status = 'active'` 的规范 ✅（已有过滤，保持不变）
- `POST /api/v1/web/search/semantic`：同上 ✅
- `POST /api/v1/web/search/fulltext`：同上 ✅
- MCP `search_steering`：通过 search-service 调用，行为同上 ✅
