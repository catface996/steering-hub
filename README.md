# Steering Hub - AI Coding Agent 规范管理平台

AI Coding Agent 规范管理平台，用于管理各类研发规范，并通过 MCP Server 为 AI Agent 提供动态规范检索能力，同时追踪规范使用情况并支持合规性审查。

## 快速启动（Docker）

**推荐使用 Docker Compose 一键启动所有服务：**

```bash
# 需要配置 AWS Bedrock 权限（~/.aws/credentials）
docker-compose up -d

# 访问前端
open http://localhost:3000

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

服务说明：
- **前端**：http://localhost:3000
- **后端 API**：http://localhost:8080
- **API 文档**：http://localhost:8080/doc.html
- **数据库**：localhost:5432

## 本地开发

### 前置依赖

- Java 17+
- Maven 3.9+
- PostgreSQL 15+（需安装 pgvector 扩展）
- Python 3.11+（MCP Server）
- Node.js 22+（前端）
- AWS 凭证（用于 Bedrock Titan Embeddings，配置 `~/.aws/credentials`）

### 1. 初始化数据库

```bash
# 以 superuser 连接 PostgreSQL，执行初始化脚本
psql -U postgres -c "CREATE DATABASE steering_hub;"
psql -U postgres -c "CREATE USER steering WITH PASSWORD 'steering123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE steering_hub TO steering;"
psql -U steering -d steering_hub -f docs/sql/init.sql
```

> `pgvector` 需在 PostgreSQL 中预先安装：[pgvector 安装指南](https://github.com/pgvector/pgvector)

### 2. 启动后端

```bash
cd steering-hub-backend
mvn clean package -DskipTests
java -jar app/target/steering-hub-app-1.0.0-SNAPSHOT.jar
```

后端默认监听 `http://localhost:8080`

API 文档（Knife4j）：`http://localhost:8080/doc.html`

### 3. 启动 MCP Server

```bash
cd steering-hub-mcp
cp .env.example .env
# 编辑 .env，填写 STEERING_HUB_API_URL

# 使用 uv（推荐）
uv sync
uv run steering-hub-mcp

# 或使用 pip
pip install -e .
steering-hub-mcp
```

#### 集成到 Claude Desktop

将 `mcp-config.json` 的内容合并到 `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）。

### 4. 启动前端

```bash
cd steering-hub-frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

## 项目结构

```
steering-hub/
├── pom.xml                          # 根 Maven POM（多模块管理）
├── docker-compose.yml               # Docker Compose 配置
├── steering-hub-backend/            # Spring Boot 后端（模块化单体）
│   ├── Dockerfile
│   ├── common/                      # 公共模块（Result/异常/枚举/配置）
│   ├── spec-service/                # 规范管理服务（CRUD/审核流/版本控制）
│   ├── search-service/              # 检索服务（语义/全文/混合检索）
│   ├── compliance-service/          # 合规审查服务
│   └── app/                         # 主应用启动模块（聚合所有服务）
├── steering-hub-mcp/                # MCP Server（Python）
│   ├── src/steering_hub_mcp/
│   │   ├── server.py                # MCP Server 入口，注册 4 个 Tool
│   │   └── client.py                # HTTP 客户端，与后端 API 通信
│   ├── pyproject.toml
│   └── mcp-config.json              # Claude Desktop 配置示例
├── steering-hub-frontend/           # React 18 + Ant Design 5 前端
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── api/                     # API 请求层
│       ├── pages/                   # 页面组件
│       ├── components/              # 公共组件
│       └── types/                   # TypeScript 类型定义
└── docs/
    ├── sql/init.sql                 # 数据库初始化脚本
    └── architecture.md              # 架构文档
```

## 技术栈

| 层次 | 技术选型 |
|------|---------|
| 后端框架 | Java 17 + Spring Boot 3.2 |
| ORM | MyBatis Plus 3.5 |
| 数据库 | PostgreSQL 15+ + pgvector |
| 向量化 | Amazon Bedrock Titan Embeddings v2（512维） |
| 全文检索 | PostgreSQL tsvector（可扩展 zhparser 中文分词） |
| MCP Server | Python 3.11+ + mcp SDK |
| 前端 | React 18 + Ant Design 5 + TypeScript + Vite |
| 构建 | Maven 多模块 |
| 容器化 | Docker + Docker Compose |

## 核心功能

### 规范管理

规范生命周期：**草稿** → **提交审核** → **审核通过 / 驳回** → **生效** → **废弃**

- 支持版本控制：每次修改自动生成新版本号，保留历史版本，支持回滚
- Markdown 格式内容，支持标签和关键词
- 规范保存时自动异步生成 embedding 向量（通过 Bedrock Titan v2）

### 智能检索

| 模式 | 实现 |
|------|------|
| 语义检索 | pgvector HNSW 索引 + cosine similarity |
| 全文检索 | PostgreSQL GIN tsvector 索引 |
| 混合检索 | 两路结果合并、去重、按综合得分排序 |

**注**：只返回 `status = 'active'` 的规范。

### 可检索性评分（Self-Retrieval Score）

自动评估规范的可被检索程度（0-100分），确保规范能被 AI Agent 准确找到。

### MCP Server Tools

| Tool | 描述 |
|------|------|
| `search_spec` | 混合检索规范，支持指定分类 |
| `get_spec` | 按 ID 获取规范全文 |
| `submit_spec` | Agent 提交新规范（草稿，需人工审核） |
| `record_usage` | 记录规范使用（供合规追踪） |

### 合规审查

提交代码片段 + 仓库信息 → 语义匹配相关规范 → 生成合规评分（0-100）和违规详情报告。

## 数据库表

| 表名 | 描述 |
|------|------|
| `spec_category` | 规范分类（支持树形结构） |
| `spec` | 规范主表（含 `vector(512)` embedding 字段） |
| `spec_version` | 版本历史 |
| `spec_review` | 审核记录 |
| `spec_usage` | 使用追踪 |
| `repo` | 代码仓库注册 |
| `compliance_report` | 合规报告（violations/related_specs 使用 JSONB） |

## 配置说明

### 后端配置（`app/src/main/resources/application.yml`）

```yaml
spring.datasource.url: jdbc:postgresql://localhost:5432/steering_hub
aws.region: us-east-1          # Bedrock 所在 Region
embedding.dimensions: 512      # Titan Embeddings v2 维度
```

### MCP Server 配置（`.env`）

```
STEERING_HUB_API_URL=http://localhost:8080
LOG_LEVEL=INFO
```

## 扩展说明

- **微服务拆分**：每个 `spec-service`、`search-service`、`compliance-service` 均为独立 Maven 模块，可直接拆分为独立 Spring Boot 应用，添加 Spring Cloud Gateway 即可完成微服务化。
- **中文全文检索**：安装 `zhparser` 后，将 `init.sql` 中 tsvector 配置从 `simple` 切换为 `chinese`，实现精准中文分词检索。
- **合规分析增强**：`ComplianceServiceImpl.detectViolations()` 目前为占位符，可替换为调用 Claude（Bedrock）进行 LLM-based 代码规范对比分析。

## License

MIT
