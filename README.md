# Steering Hub

> AI Coding Agent 规范管理平台 | Specification Management Platform for AI Coding Agents

将团队编码规范结构化存储，通过 MCP 协议实时注入 AI Coding Agent（Claude Code、Cursor、Copilot 等），让 Agent 在编写代码时自动遵循团队规范，并追踪 Agent 的规范使用行为。

---

## 核心特性 | Key Features

- **规范管理**：Markdown 编写规范，支持版本迭代、审批流（草稿→审核→生效→废弃）、分类与标签
- **混合检索**：向量语义检索（Amazon Bedrock Titan v2，512维）+ PostgreSQL 全文检索，双路合并排序
- **仓库绑定**：注册代码仓库并绑定规范（强制/建议），MCP 搜索时对绑定规范进行排名提升（boost）
- **MCP 接入**：标准 MCP Server，AI Agent 通过 `search_steering` 工具实时检索规范
- **健康度检测**：自动扫描相似规范对，识别重复/冗余规范，维护规范库健康度
- **检索日志**：记录 Agent 每次搜索（model_name、agent_name、repo），支持用量分析与失败归因
- **合规检查**：提交代码片段，语义匹配相关规范，生成合规评分与违规详情

---

## 系统架构 | Architecture

```
┌───────────────────────────────────────────────────────┐
│               AI Coding Agent                         │
│       (Claude Code / Cursor / Copilot etc.)           │
└──────────────────────┬────────────────────────────────┘
                       │ MCP Protocol (stdio)
┌──────────────────────▼────────────────────────────────┐
│          steering-hub-mcp  (Python 3.11+)             │
│  search_steering / get_steering / submit_steering /   │
│  record_usage / report_search_failure / get_tags      │
└──────────────────────┬────────────────────────────────┘
                       │ HTTP REST  :8080
┌──────────────────────▼────────────────────────────────┐
│       steering-hub-backend  (Spring Boot 3.2)         │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ steering-svc  │  │ search-svc   │  │compliance │  │
│  │ CRUD / 审批流 │  │ 混合检索     │  │ 合规评分  │  │
│  │ 版本 / 仓库   │  │ 仓库 boost   │  │ 报告生成  │  │
│  │ 健康度检测    │  │ 检索日志分析 │  └───────────┘  │
│  └───────────────┘  └──────────────┘                  │
│  ┌────────────────────────────────────────────────┐   │
│  │  common: Result / BusinessException / Enums    │   │
│  └────────────────────────────────────────────────┘   │
└──────────┬────────────────────────┬───────────────────┘
           │                        │
┌──────────▼───────────┐  ┌─────────▼─────────────────┐
│  PostgreSQL 15+      │  │  Amazon Bedrock            │
│  + pgvector (HNSW)   │  │  Titan Embeddings v2       │
│  + tsvector GIN      │  │  512-dim cosine similarity │
└──────────────────────┘  └───────────────────────────┘

┌───────────────────────────────────────────────────────┐
│     steering-hub-frontend  (React 18 + Ant Design 5)  │
│  Dashboard / 规范管理 / 智能检索 / 仓库管理 /          │
│  检索日志 / 使用分析 / 合规检查 / 系统设置             │
└───────────────────────────────────────────────────────┘
```

---

## 规范生命周期 | Spec Lifecycle

```
DRAFT ──submit──► PENDING_REVIEW ──approve──► APPROVED ──activate──► ACTIVE
  ▲                     │                                               │
  │               reject│                                          deprecate
  └──────edit──── REJECTED                                       DEPRECATED
```

只有 `ACTIVE` 状态的规范参与 MCP 搜索和合规检查。

---

## 快速开始 | Quick Start

### 环境要求

| 组件 | 版本要求 |
|---|---|
| Java | 17+ |
| Maven | 3.9+ |
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 15+（需 pgvector 扩展） |
| AWS | Bedrock 访问权限（us-east-1，Titan Embeddings v2） |

### 1. 数据库初始化

```bash
psql -U postgres -c "CREATE DATABASE steering_hub;"
psql -U postgres -c "CREATE USER steering WITH PASSWORD 'steering123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE steering_hub TO steering;"
psql -U steering -d steering_hub -f docs/sql/init.sql
```

> Docker 快捷方式：
> ```bash
> docker run -d --name steering-hub-db \
>   -e POSTGRES_USER=steering \
>   -e POSTGRES_PASSWORD=steering123 \
>   -e POSTGRES_DB=steering_hub \
>   -p 5432:5432 ankane/pgvector
> psql -h localhost -U steering -d steering_hub -f docs/sql/init.sql
> ```

### 2. 启动后端

```bash
# 配置 AWS 凭证（Bedrock Embeddings）
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=us-east-1

cd steering-hub-backend
mvn clean package -DskipTests
java -jar app/target/steering-hub-app-*.jar
# 服务启动于 http://localhost:8080
# API 文档（Knife4j）：http://localhost:8080/doc.html
```

后端配置文件：`app/src/main/resources/application.yml`

### 3. 启动前端

```bash
cd steering-hub-frontend
npm install
npm run dev          # 开发服务器 http://localhost:5173（代理至 :8080）

# 生产构建
npm run build        # 产物在 dist/，部署至 Nginx
```

### 4. 启动 MCP Server

```bash
cd steering-hub-mcp
pip install -e .

export STEERING_HUB_API_URL=http://localhost:8080
export STEERING_HUB_API_KEY=sh_xxxx   # 在前端「系统设置 → API Keys」创建

python -m steering_hub_mcp.server
```

---

## MCP 接入 | MCP Integration

### Claude Code 配置

在项目根目录或 `~/.claude/` 下的 `settings.json` 中添加：

```json
{
  "mcpServers": {
    "steering-hub": {
      "command": "python3.11",
      "args": ["-m", "steering_hub_mcp.server"],
      "cwd": "/path/to/steering-hub-mcp",
      "env": {
        "STEERING_HUB_API_URL": "http://localhost:8080",
        "STEERING_HUB_API_KEY": "sh_xxxxxxxxxxxx"
      }
    }
  }
}
```

示例配置文件：`steering-hub-mcp/mcp-config.json`

### MCP 工具列表

| 工具 | 用途 | 关键参数 |
|---|---|---|
| `get_steering_tags` | 获取所有可用标签和分类 | — |
| `search_steering` | 混合检索规范（语义 + 全文） | `query`, `repo`, `tags`, `agent_name`, `model_name` |
| `get_steering` | 按 ID 获取规范完整内容 | `id` |
| `submit_steering` | 提交新规范（草稿，待审核） | `title`, `content`, `category_code` |
| `record_usage` | 记录规范使用（写入检索日志） | `steering_id`, `task_description` |
| `report_search_failure` | 上报无效检索（帮助持续改进） | `log_id`, `reason`, `expected_topic` |

### 使用示例

```python
# 1. 开始编码前：检索规范
search_steering(
    query="Controller HTTP 接口设计 URL 格式",
    repo="org/my-service",        # 优先返回该仓库绑定的规范
    agent_name="claude-code",
    model_name="claude-sonnet-4-6"
)

# 2. 确认使用某条规范后记录
record_usage(steering_id=7, task_description="设计订单 Controller 接口")

# 3. 搜不到想要的规范时上报
report_search_failure(log_id=123, reason="missing_spec", expected_topic="分布式锁使用规范")
```

---

## 目录结构 | Project Structure

```
steering-hub/
├── steering-hub-backend/           # Spring Boot 后端（Java 17，Maven 多模块）
│   ├── common/                     # 公共模块：Result、BusinessException、枚举
│   ├── steering-service/           # 规范 CRUD、分类、版本、审批、仓库管理、健康检测
│   ├── search-service/             # 混合检索、Embedding、检索日志、使用分析
│   ├── compliance-service/         # 合规检查、评分、报告生成
│   └── app/                        # 启动类、Security 配置、application.yml
│
├── steering-hub-frontend/          # React 18 + Ant Design 5（TypeScript + Vite）
│   └── src/
│       ├── pages/
│       │   ├── dashboard/          # 平台概览（规范统计、最近更新）
│       │   ├── steering/           # 规范列表、详情、编辑、使用分析、失败记录
│       │   ├── search/             # 智能检索页
│       │   ├── repo/               # 仓库列表、详情与规范绑定
│       │   ├── query-log/          # 检索日志列表、详情
│       │   ├── compliance/         # 合规检查
│       │   ├── category/           # 分类管理
│       │   ├── settings/           # API Key 管理、停用词
│       │   └── auth/               # 登录
│       ├── services/               # API 请求层
│       ├── components/             # 公共组件（Pagination 等）
│       ├── utils/formatTime.ts     # 统一时间格式工具
│       └── types/index.ts          # TypeScript 类型定义
│
├── steering-hub-mcp/               # MCP Server（Python 3.11+）
│   └── src/steering_hub_mcp/
│       ├── server.py               # MCP 工具定义与请求路由
│       └── client.py               # 后端 HTTP 客户端封装
│
└── docs/
    ├── sql/init.sql                # 数据库初始化脚本
    ├── sql/migration_*.sql         # 增量迁移脚本
    └── architecture.md             # 架构详细说明（含检索流程图）
```

---

## 检索机制 | Search Mechanism

```
查询文本
  ├── Bedrock Titan v2 → 512维向量 → pgvector HNSW cosine 相似度搜索
  ├── PostgreSQL tsvector → plainto_tsquery 全文检索（GIN 索引）
  └── Merge & Re-rank（只返回 status=active 的规范）
        ├── 基础排序：综合相似度分数
        └── 仓库 Boost（传入 repo 参数时）：
              强制绑定规范 > 建议绑定规范 > 未绑定规范
              （高相似度未绑定规范仍可排在低相似度绑定规范之前）
```

---

## 主要数据表 | Database Schema

| 表名 | 描述 |
|---|---|
| `steering_category` | 规范分类（支持树形，code 唯一） |
| `steering` | 规范主表（含 `vector(512)` embedding 字段） |
| `steering_version` | 版本历史（每次修改自动追加） |
| `steering_review` | 审核记录（审核人、意见、时间） |
| `steering_usage` | 规范使用记录（Agent 调用 record_usage 写入） |
| `steering_query_log` | 检索日志（含 agent_name、model_name、repo） |
| `repo` | 代码仓库注册（full_name 唯一） |
| `repo_steering` | 仓库-规范绑定（多对多，含 mandatory 标记） |
| `health_check_task` | 健康度检测任务 |
| `similar_spec_pair` | 相似规范对（检测结果） |
| `compliance_report` | 合规报告（violations/related_specs 为 JSONB） |
| `sys_user` | 系统用户 |
| `api_key` | API Key（MCP 鉴权） |
| `stop_word` | 搜索停用词 |

---

## API 文档 | API Docs

后端启动后访问 Knife4j UI：**`http://localhost:8080/doc.html`**

主要接口前缀：

| 前缀 | 用途 |
|---|---|
| `/api/v1/steerings` | 规范管理（CRUD、审批、版本） |
| `/api/v1/categories` | 分类管理 |
| `/api/v1/repos` | 仓库管理与规范绑定 |
| `/api/v1/web/search` | 前端检索、日志查询、使用分析 |
| `/api/v1/compliance` | 合规检查 |
| `/api/v1/health` | 健康度检测任务 |
| `/mcp/v1/search` | MCP Agent 专用搜索接口（API Key 鉴权） |

---

## 开发规范 | Dev Guidelines

本项目遵循平台内录入的编码规范，核心约束：

| 规范 ID | 规范名 | 核心要求 |
|---|---|---|
| ID:7 | HTTP 流量入口层规范 | URL 格式 `/api/{version}/{resource}/{action}`，仅 POST，Controller 不含业务逻辑 |
| ID:9 | Infrastructure 层规范 | 条件查询写 Mapper XML，禁止在 Java 层构造 `QueryWrapper` |
| ID:229 | 前端展示与交互规范 | 时间用 `formatTime.ts`，空值显示 `-`，状态 Tag 用 Ant Design 语义 color prop |

通过 MCP 检索更多规范：

```bash
search_steering(query="你的编码场景描述", repo="catface996/steering-hub")
```

---

## 技术栈 | Tech Stack

| 层 | 技术 |
|---|---|
| 后端 | Java 17, Spring Boot 3.2, MyBatis Plus 3.5, Maven 多模块 |
| 前端 | React 18, TypeScript, Ant Design 5, Vite |
| MCP Server | Python 3.11+, mcp SDK |
| 数据库 | PostgreSQL 15+, pgvector（HNSW cosine）, tsvector GIN |
| AI / Embedding | Amazon Bedrock Titan Embeddings v2（512-dim） |
| 部署 | Nginx（前端静态）, JVM（后端）, Docker（数据库） |

---

## License

MIT
