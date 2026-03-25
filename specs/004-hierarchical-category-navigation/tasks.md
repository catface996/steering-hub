# Tasks: 分级 Category 导航（DAG 方案）

**Input**: Design documents from `/specs/004-hierarchical-category-navigation/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: No automated tests (无自动化测试框架，与现有一致)

**Critical constraint**: `steering.tags` 和 `search_steering` 逻辑**绝对不能修改**（FR-007）

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies on concurrent tasks)

---

## Phase 1: DB Migration

**Purpose**: 建表 + 初始化子分类 + 建立关系数据 — 所有后续任务的前提

- [ ] T001 创建 `docs/sql/migration_004_category_hierarchy.sql`，内容分三段：

  **段 1：建表**
  ```sql
  CREATE TABLE IF NOT EXISTS category_hierarchy (
      parent_category_id BIGINT NOT NULL REFERENCES steering_category(id),
      child_category_id  BIGINT NOT NULL REFERENCES steering_category(id),
      sort_order         INT    NOT NULL DEFAULT 0,
      PRIMARY KEY (parent_category_id, child_category_id),
      CONSTRAINT chk_no_self_loop CHECK (parent_category_id != child_category_id)
  );
  CREATE INDEX IF NOT EXISTS idx_cat_hier_parent ON category_hierarchy(parent_category_id);
  CREATE INDEX IF NOT EXISTS idx_cat_hier_child  ON category_hierarchy(child_category_id);
  ```

  **段 2：插入子分类**（8条，基于 research.md 建议方案）
  ```sql
  INSERT INTO steering_category (name, code, description, sort_order, enabled, deleted)
  VALUES
    ('Java 后端', 'java-backend', 'Java / SpringBoot / DDD / MyBatisPlus', 1, true, false),
    ('前端', 'frontend', 'React / Ant Design / 组件 / Hook', 2, true, false),
    ('TypeScript', 'typescript', 'TypeScript 类型系统', 3, true, false),
    ('数据访问', 'data-access', 'MyBatisPlus / Repository / XML Mapper', 4, true, false),
    ('API 设计', 'api-design', 'REST / HTTP / 接口版本 / 限流', 1, true, false),
    ('数据库 & 缓存', 'database', 'MySQL / Redis / 索引 / 分片', 2, true, false),
    ('DevOps', 'devops', 'Docker / Git / CI/CD', 3, true, false),
    ('分布式', 'distributed', '分布式锁 / 消息队列', 4, true, false)
  ON CONFLICT (code) DO NOTHING;
  ```

  **段 3：建立 category_hierarchy 关系**
  ```sql
  -- coding → java-backend / frontend / typescript / data-access
  INSERT INTO category_hierarchy (parent_category_id, child_category_id, sort_order)
  SELECT p.id, c.id, c.sort_order
  FROM steering_category p, steering_category c
  WHERE p.code = 'coding'
    AND c.code IN ('java-backend','frontend','typescript','data-access')
  ON CONFLICT DO NOTHING;

  -- architecture → api-design / database / devops / distributed
  INSERT INTO category_hierarchy (parent_category_id, child_category_id, sort_order)
  SELECT p.id, c.id, c.sort_order
  FROM steering_category p, steering_category c
  WHERE p.code = 'architecture'
    AND c.code IN ('api-design','database','devops','distributed')
  ON CONFLICT DO NOTHING;
  ```

**Checkpoint**: Migration 应用后，`SELECT * FROM category_hierarchy;` 应有 8 条记录；`SELECT COUNT(*) FROM steering_category WHERE deleted=false;` 应为 14。

---

## Phase 2: 实体 + Mapper + DTO（全部可并行）

- [ ] T002 [P] 新建 `CategoryHierarchy.java` 实体
  - 路径：`steering-service/src/main/java/com/steeringhub/steering/entity/CategoryHierarchy.java`
  - 字段：`Long parentCategoryId`, `Long childCategoryId`, `Integer sortOrder`
  - 注解：`@Data @TableName("category_hierarchy")`（复合主键，MyBatis Plus 通过 XML Mapper 操作）

- [ ] T003 [P] 新建 `CategoryHierarchyMapper.java` + `CategoryHierarchyMapper.xml`
  - Mapper 路径：`steering-service/src/main/java/com/steeringhub/steering/mapper/CategoryHierarchyMapper.java`
  - XML 路径：`steering-service/src/main/resources/mapper/CategoryHierarchyMapper.xml`
  - 方法签名：
    ```java
    void insertRelation(@Param("parentId") Long parentId,
                        @Param("childId") Long childId,
                        @Param("sortOrder") int sortOrder);
    void deleteRelation(@Param("parentId") Long parentId,
                        @Param("childId") Long childId);
    List<Long> selectChildIds(@Param("parentId") Long parentId);
    ```
  - XML SQL 要点：
    - `insertRelation`：`INSERT ... ON CONFLICT DO NOTHING`
    - `deleteRelation`：`DELETE ... WHERE parent_category_id = #{parentId} AND child_category_id = #{childId}`
    - `selectChildIds`：`SELECT child_category_id FROM category_hierarchy WHERE parent_category_id = #{parentId}`（BFS 环检测使用）

- [ ] T004 [P] 新建 4 个 DTO 类
  - `CategoryNavItem.java`：字段 `Long id, String name, String code, String description, Integer childCount, Integer sortOrder`
  - `SteeringNavItem.java`：字段 `Long id, String title, String tags, OffsetDateTime updatedAt`
  - `CategoryHierarchyRequest.java`：字段 `@NotNull Long parentCategoryId, @NotNull Long childCategoryId, @Min(0) Integer sortOrder = 0`
  - `CategoryHierarchyDeleteRequest.java`：字段 `@NotNull Long parentCategoryId, @NotNull Long childCategoryId`
  - 路径：`dto/request/` 和 `dto/response/`

- [ ] T005 [P] 扩展 `SteeringCategoryMapper.java` + `SteeringCategoryMapper.xml`
  - 新增方法：
    ```java
    List<CategoryNavItem> listTopLevel();       // 无父节点的顶层分类
    List<CategoryNavItem> listChildren(@Param("parentId") Long parentId);  // 某父节点的直接子分类
    ```
  - XML SQL：见 data-model.md（listTopLevel 用 NOT EXISTS 子查询；listChildren 做 JOIN category_hierarchy）
  - ResultMap：列名 `child_count → childCount`, `sort_order → sortOrder`

- [ ] T006 [P] 扩展 `SteeringMapper.java` + `SteeringMapper.xml`
  - 新增方法：
    ```java
    List<SteeringNavItem> listActiveByCategory(@Param("categoryId") Long categoryId,
                                               @Param("limit") int limit);
    ```
  - XML SQL：`WHERE category_id=#{categoryId} AND status='active' AND deleted=FALSE ORDER BY updated_at DESC LIMIT #{limit}`
  - **严禁**修改 `steering.tags` 相关字段和任何 search 查询

**Checkpoint**: Phase 2 完成后，数据访问层就绪，可以开始 Service 层

---

## Phase 3: Service 层

- [ ] T007 [P] 新建 `CategoryNavService.java` 接口
  - 路径：`steering-service/src/main/java/com/steeringhub/steering/service/CategoryNavService.java`
  - 方法：
    ```java
    List<CategoryNavItem> listCategories(Long parentId);  // parentId=null 或 0 → 顶层
    List<SteeringNavItem> listSteerings(Long categoryId, int limit);
    void addHierarchy(Long parentId, Long childId, int sortOrder);   // 含环检测
    void removeHierarchy(Long parentId, Long childId);               // 幂等删除
    ```

- [ ] T008 新建 `CategoryNavServiceImpl.java`
  - **【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Service 类型对应规范）**
  - 路径：`steering-service/src/main/java/com/steeringhub/steering/service/impl/CategoryNavServiceImpl.java`
  - 注解：`@Service @RequiredArgsConstructor`
  - 注入：`CategoryHierarchyMapper`, `SteeringCategoryMapper`, `SteeringMapper`（均为接口，非 Impl）
  - `listCategories`：parentId 为 null 或 0 时调用 `listTopLevel()`，否则调用 `listChildren(parentId)`
  - `listSteerings`：limit clamp 到 [1, 50]；调用 `listActiveByCategory(categoryId, limit)`
  - `addHierarchy`：
    1. 校验 parent != child（自环检测，也可依赖 DB CHECK）
    2. 调用 `getAllDescendants(childId)`（BFS via `selectChildIds`）
    3. 若 `descendants.contains(parentId)` → 抛 `BusinessException("CYCLE_DETECTED", "添加此关系将形成环")`
    4. 调用 `categoryHierarchyMapper.insertRelation(parentId, childId, sortOrder)`
    5. 注解：`@Transactional`（Constitution 要求事务在 Service 层）
  - `removeHierarchy`：调用 `categoryHierarchyMapper.deleteRelation(parentId, childId)`（幂等，不存在时无报错）

**Checkpoint**: Phase 3 完成后，Service 层就绪，可以开始 Controller 层

---

## Phase 4: Controller

- [ ] T009 新建 `CategoryNavController.java`
  - **【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Controller 类型对应规范）**
  - 路径：`steering-service/src/main/java/com/steeringhub/steering/controller/CategoryNavController.java`
  - 注解：`@RestController @RequiredArgsConstructor @Validated`
  - 4 个端点：
    ```java
    // MCP 只读
    @GetMapping("/api/v1/mcp/categories")
    public Result<List<CategoryNavItem>> listCategories(@RequestParam(required = false) Long parentId)

    @GetMapping("/api/v1/mcp/steerings")
    public Result<List<SteeringNavItem>> listSteerings(
        @RequestParam Long categoryId,
        @RequestParam(defaultValue = "10") @Min(1) @Max(50) Integer limit)

    // Web 管理
    @PostMapping("/api/v1/web/category-hierarchy")
    public Result<Void> addHierarchy(@RequestBody @Valid CategoryHierarchyRequest req)

    @DeleteMapping("/api/v1/web/category-hierarchy")
    public Result<Void> removeHierarchy(@RequestBody @Valid CategoryHierarchyDeleteRequest req)
    ```
  - 错误处理：`addHierarchy` 捕获 `BusinessException("CYCLE_DETECTED")` → 已由 GlobalExceptionHandler 统一处理，无需额外代码

**Checkpoint**: Phase 4 完成后，用 curl 验证 4 个端点（见 quickstart.md）

---

## Phase 5: MCP Server

- [ ] T010 扩展 `steering-hub-mcp/src/steering_hub_mcp/client.py`
  - **【Constitution I】实现前先调用 MCP search_steering 查询相关规范**
  - 新增函数：
    ```python
    async def list_categories(parent_id: Optional[int] = None) -> list[dict]:
        params = {}
        if parent_id is not None and parent_id > 0:
            params["parent_id"] = parent_id
        resp = await get("/api/v1/mcp/categories", params=params)
        return resp  # resp = data field from Result<List<CategoryNavItem>>

    async def list_steerings(category_id: int, limit: int = 10) -> list[dict]:
        return await get("/api/v1/mcp/steerings",
                         params={"category_id": category_id, "limit": limit})
    ```

- [ ] T011 扩展 `steering-hub-mcp/src/steering_hub_mcp/server.py`
  - 在 `list_tools()` 追加 `list_categories` 和 `list_steerings` Tool 定义（参考 contracts/api.md MCP 工具定义）
  - 在 `call_tool()` 增加对应处理分支
  - 格式化输出（与现有 `search_steering` 风格一致）：
    - `list_categories`：每条 → `## [{code}] {name}\n{description}\nSubcategories: {childCount}`
    - `list_steerings`：每条 → `## [{id}] {title}\nTags: {tags}\nUpdated: {updatedAt}`

**Checkpoint**: Phase 5 完成后，MCP 工具可在 Claude Code 中调用

---

## Phase 6: 端到端验证

- [ ] T012 按 `quickstart.md` 执行全流程验证：
  - ✓ DB migration 成功，`category_hierarchy` 有 8 条记录
  - ✓ `GET /api/v1/mcp/categories` 返回 6 个顶层分类（coding/architecture等，含 childCount=4）
  - ✓ `GET /api/v1/mcp/categories?parent_id=1` 返回 4 个 coding 子分类
  - ✓ `GET /api/v1/mcp/steerings?category_id=1` 返回 active 规范摘要（含 tags 字段）
  - ✓ `POST /api/v1/web/category-hierarchy` 建立新关系成功
  - ✓ 成环请求返回 400 CYCLE_DETECTED
  - ✓ `DELETE /api/v1/web/category-hierarchy` 删除成功，重复删除返回成功（幂等）
  - ✓ **search_steering 回归**：`search_steering(query="Controller")` 结果与改动前一致
  - ✓ **tags 不变**：list_steerings 返回的 tags 字段与 steering 表原始值完全一致

---

## Dependencies & Execution Order

```
T001 [Migration]
  └→ T002/T003/T004/T005/T006 [全部并行]
       └→ T007 [Service 接口] ──┐
       └→ T008 [ServiceImpl] ←─┘
              └→ T009 [Controller]
                     └→ T010/T011 [MCP，可先写代码，需后端可用才能端对端测]
                                └→ T012 [验证]
```

**总任务数**: 12 个（T001~T012，含 6 个可并行任务）

**并行机会**:
- T002、T003、T004、T005、T006 全部不同文件，完全并行
- T007 与 T002~T006 并行（只需 DTO 已存在）
- T010、T011 可以先写代码，等 T009 完成后再端对端测试

---

## Notes

- `steering.tags` 字段：所有任务中**严禁**修改 tags 相关代码，包括 SteeringMapper 中已有的 search 查询
- BFS 环检测中的 `selectChildIds` 查询：一次查出所有子节点 ID（批量），**禁止**在循环中逐条调用 selectById（Constitution III N+1 红线）
- `insertRelation` 使用 `ON CONFLICT DO NOTHING`（PostgreSQL 幂等 INSERT），无需应用层先查后写
- `removeHierarchy` 的幂等：DELETE 0行时不报错，Service 层不需要额外判断
