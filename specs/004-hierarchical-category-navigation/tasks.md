# Tasks: 分级 Category 导航

**Input**: Design documents from `/specs/004-hierarchical-category-navigation/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: No automated tests (per plan.md: 无自动化测试框架，与现有一致)

**Organization**: Tasks grouped by layer (bottom-up: DTO → Mapper → Service → Controller → MCP)

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on concurrent tasks)

---

## Phase 1: Response DTOs（新建，无依赖，可并行）

- [ ] T001 [P] 新建 `CategoryNavItem.java`，路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/response/CategoryNavItem.java`
  - 字段：`Long id`, `String name`, `String code`, `String description`, `Integer childCount`
  - 注解：`@Data`（Lombok）

- [ ] T002 [P] 新建 `SteeringNavItem.java`，路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/dto/response/SteeringNavItem.java`
  - 字段：`Long id`, `String title`, `String tags`, `OffsetDateTime updatedAt`
  - 注解：`@Data`（Lombok）

---

## Phase 2: Mapper 扩展（依赖 Phase 1 DTO 已存在）

- [ ] T003 [P] 扩展 `SteeringCategoryMapper.java`，路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/SteeringCategoryMapper.java`
  - 新增方法签名：`List<CategoryNavItem> listChildrenWithCount(@Param("parentId") Long parentId)`
  - **说明**：parentId=null 时 XML 动态 SQL 自动处理 IS NULL 分支

- [ ] T004 [P] 扩展 `SteeringCategoryMapper.xml`，路径：`steering-hub-backend/steering-service/src/main/resources/mapper/SteeringCategoryMapper.xml`
  - 新增 `<select id="listChildrenWithCount">` SQL（参考 data-model.md 示例）
  - 使用 `<choose><when test="parentId != null and parentId > 0">` 处理 IS NULL 分支
  - 新增对应 ResultMap，列名映射：`child_count → childCount`

- [ ] T005 [P] 扩展 `SteeringMapper.java`，路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/mapper/SteeringMapper.java`
  - 新增方法签名：`List<SteeringNavItem> listActiveByCategory(@Param("categoryId") Long categoryId, @Param("limit") int limit)`

- [ ] T006 [P] 扩展 `SteeringMapper.xml`，路径：`steering-hub-backend/steering-service/src/main/resources/mapper/SteeringMapper.xml`
  - 新增 `<select id="listActiveByCategory">` SQL（参考 data-model.md 示例）
  - 过滤条件：`status = 'active' AND deleted = FALSE AND category_id = #{categoryId}`
  - 排序：`ORDER BY updated_at DESC`
  - 分页：`LIMIT #{limit}`

**Checkpoint**: Phase 2 完成后，数据访问层就绪，可以开始 Service 层

---

## Phase 3: Service 层（依赖 Phase 1 + Phase 2）

- [ ] T007 [P] 新建 `CategoryNavService.java`，路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/CategoryNavService.java`
  - 方法签名：
    ```java
    List<CategoryNavItem> listChildren(Long parentId);
    List<SteeringNavItem> listActiveByCategory(Long categoryId, int limit);
    ```

- [ ] T008 新建 `CategoryNavServiceImpl.java`，路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/service/impl/CategoryNavServiceImpl.java`
  - **【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Service 类型对应规范）**
  - 注解：`@Service @RequiredArgsConstructor`
  - 注入：`SteeringCategoryMapper steeringCategoryMapper`，`SteeringMapper steeringMapper`
  - `listChildren(Long parentId)`：调用 `steeringCategoryMapper.listChildrenWithCount(parentId)`
  - `listActiveByCategory(Long categoryId, int limit)`：limit clamp 到 [1, 50]；调用 `steeringMapper.listActiveByCategory(categoryId, limit)`

**Checkpoint**: Phase 3 完成后，Service 层就绪，可以开始 Controller 层

---

## Phase 4: Controller（依赖 Phase 3）

- [ ] T009 新建 `CategoryNavController.java`，路径：`steering-hub-backend/steering-service/src/main/java/com/steeringhub/steering/controller/CategoryNavController.java`
  - **【Constitution I】实现前先调用 MCP search_steering 查询相关规范（Controller 类型对应规范）**
  - 注解：`@RestController @RequestMapping("/api/v1/mcp") @RequiredArgsConstructor`
  - 端点 1：
    ```java
    @GetMapping("/categories")
    public Result<List<CategoryNavItem>> listCategories(
        @RequestParam(required = false) Long parentId)
    ```
  - 端点 2：
    ```java
    @GetMapping("/steerings")
    public Result<List<SteeringNavItem>> listSteerings(
        @RequestParam Long categoryId,
        @RequestParam(defaultValue = "10") @Min(1) @Max(50) Integer limit)
    ```
  - 两个端点均返回 `Result.ok(data)`；不需要 `@Valid` 在方法级别，但 `@Min/@Max` 需要在类上加 `@Validated`
  - 错误处理：无需特殊处理，不存在的 parent_id / category_id 返回空数组

**Checkpoint**: Phase 4 完成后，后端 REST API 就绪，可用 curl 验证

---

## Phase 5: MCP Server 扩展（依赖 Phase 4 后端 API 就绪）

- [ ] T010 扩展 `steering-hub-mcp/src/steering_hub_mcp/client.py`
  - **【Constitution I】实现前先调用 MCP search_steering 查询相关规范**
  - 新增函数：
    ```python
    async def list_categories(parent_id: Optional[int] = None) -> list[dict]:
        params = {}
        if parent_id is not None and parent_id > 0:
            params["parent_id"] = parent_id
        return await get("/api/v1/mcp/categories", params=params)

    async def list_steerings(category_id: int, limit: int = 10) -> list[dict]:
        params = {"category_id": category_id, "limit": limit}
        return await get("/api/v1/mcp/steerings", params=params)
    ```
  - 注意：`get()` 函数返回 `response["data"]`（与现有 client 模式一致）

- [ ] T011 扩展 `steering-hub-mcp/src/steering_hub_mcp/server.py`
  - 在 `list_tools()` 函数返回列表中追加 2 个新 Tool 定义（参考 contracts/api.md 中的 MCP 工具定义）
  - 在 `call_tool()` 的 `match` / `if-elif` 分支中增加对 `"list_categories"` 和 `"list_steerings"` 的处理
  - 调用对应 client 函数，将结果格式化为 `TextContent`（与现有 `handle_search_steering` 模式一致）
  - 格式化规则：
    - `list_categories`：每条分类输出 `## {name} ({code})\n{description}\nSubcategories: {childCount}`
    - `list_steerings`：每条规范输出 `## [{id}] {title}\nTags: {tags}\nUpdated: {updatedAt}`

**Checkpoint**: Phase 5 完成后，MCP 工具全部就绪，可用 quickstart.md 流程验证

---

## Phase 6: 端到端验证

- [ ] T012 按 `quickstart.md` 执行全流程验证：
  - ✓ `GET /api/v1/mcp/categories` 返回顶层分类，含 childCount
  - ✓ `GET /api/v1/mcp/categories?parent_id=N` 返回子分类
  - ✓ `GET /api/v1/mcp/steerings?category_id=N` 返回 active 规范摘要（不含 content）
  - ✓ `parent_id=9999`（不存在）返回空数组，非报错
  - ✓ `category_id=9999`（不存在）返回空数组，非报错
  - ✓ `search_steering` 行为与改动前完全一致（zero regression）
  - ✓ MCP 工具 `list_categories` + `list_steerings` 可在 Claude Code 中正常调用

---

## Dependencies & Execution Order

```
T001 [DTO]  ─┐
T002 [DTO]  ─┤
             ├→ T003/T004 [CategoryMapper] ─┐
             │                               ├→ T007 [Service 接口]
             └→ T005/T006 [SteeringMapper] ─┘
                                             └→ T008 [ServiceImpl]
                                                        └→ T009 [Controller]
                                                                    └→ T010/T011 [MCP]
                                                                                 └→ T012 [验证]
```

**Parallel opportunities**:
- T001、T002 可并行（不同文件）
- T003、T004、T005、T006 可并行（不同文件）
- T007 与 T003~T006 可并行（只需要 DTO，不依赖 Mapper 实现）
- T010、T011 需等后端 API 可用（T009 完成）后才能端对端测试，但可以先写代码
