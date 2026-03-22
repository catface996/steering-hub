# steering-hub Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-22

## Active Technologies
- Java 17 / TypeScript 5 + Spring Boot 3.2, MyBatis Plus 3.x, React 18, Ant Design 5, Vite, Amazon Bedrock (Titan Embeddings v2) (002-version-history-search)
- PostgreSQL 15 with pgvector, `steering` + `steering_version` tables (002-version-history-search)

- Java 17 / TypeScript 5 + Spring Boot 3.2, MyBatis Plus 3.x, React 18, Ant Design 5, Vite (001-similarity-conflict-detection)

## Project Structure

```text
steering-hub-backend/
  common/             # Result/ResultCode/Exception/Enums
  steering-service/   # 规范管理域（entities/mappers/services/controllers）
  search-service/     # EmbeddingService (Bedrock) + SearchService
  compliance-service/ # ComplianceService
  app/                # Main class + application.yml

steering-hub-frontend/src/
  pages/              # CategoryPage, SteeringListPage, CompliancePage, ...
  services/           # steeringService.ts, searchService.ts, ...
  components/         # Pagination.tsx (统一分页组件), Sidebar.tsx, ...
  types/index.ts

docs/sql/init.sql     # 完整建表脚本
```

## Commands

```bash
# Backend
cd steering-hub-backend && mvn spring-boot:run -pl app

# Frontend
cd steering-hub-frontend && npm run dev
```

## Code Style

- 后端：禁止 QueryWrapper（带条件查询用 XML Mapper）；统一返回 Result\<T\>；@Valid + DTO
- 前端分页：统一使用 src/components/Pagination.tsx，禁止自行实现

## Recent Changes
- 002-version-history-search: Added Java 17 / TypeScript 5 + Spring Boot 3.2, MyBatis Plus 3.x, React 18, Ant Design 5, Vite, Amazon Bedrock (Titan Embeddings v2)

- 001-similarity-conflict-detection: Added Java 17 / TypeScript 5 + Spring Boot 3.2, MyBatis Plus 3.x, React 18, Ant Design 5, Vite

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
