# Feature 005 — Tasks

## Input
`specs/005-responsive-layout/spec.md`

## Prerequisites
- Ant Design `Grid.useBreakpoint()` 可用（antd ^6.3.0 已包含）
- 无后端变更，纯前端改造
- 所有改动在 `005-responsive-layout` 分支进行

## Tests
每个 Task 完成后，在浏览器 DevTools 中切换以下 viewport 验证：
- 375px（手机竖屏 / iPhone SE）
- 768px（平板临界）
- 1280px（PC）

## Critical Constraints
- 禁止引入新的第三方 UI 库（只用 Ant Design 内置组件）
- PC 布局（≥ 992px）行为必须与改造前完全一致，不得引入视觉回归
- 使用 `Grid.useBreakpoint()` 统一断点，禁止硬编码 `window.innerWidth` 判断

---

## Phase 1 — 布局骨架（P0，其他 Task 的前置）

### T001 — Sidebar：固定 Sider → Drawer（抽屉菜单）[P0]

**目标：** 小屏下 Sidebar 变为 Drawer，顶部显示汉堡图标

**涉及文件：**
- `src/components/Sidebar.tsx`
- `src/components/Layout/MainLayout.tsx`

**实现要点：**

```tsx
// MainLayout.tsx 中引入断点判断
import { Grid } from 'antd';
const { useBreakpoint } = Grid;

const screens = useBreakpoint();
const isMobile = !screens.lg;  // lg = 992px

// 维护 drawerVisible state
const [drawerOpen, setDrawerOpen] = useState(false);

// 条件渲染：
// isMobile → <Drawer open={drawerOpen} ...><Sidebar /></Drawer> + 汉堡图标
// !isMobile → <Layout.Sider ...><Sidebar /></Layout.Sider>（现有行为）
```

**汉堡图标位置：** 在 `GlobalHeader` 左侧，`isMobile` 时显示 `<MenuOutlined />`，点击切换 `drawerOpen`

**Drawer 关闭时机：**
- 点击遮罩
- Sidebar 内菜单项被点击（在 `Sidebar.tsx` 中通过回调 `onMenuClick` 通知 MainLayout）

**验收：** IT-001 ~ IT-004

---

### T002 — Header：手机端紧凑模式 [P0]

**目标：** viewport < 768px 时 Header 不溢出

**涉及文件：**
- `src/components/Layout/MainLayout.tsx`（GlobalHeader 区域）

**实现要点：**

```tsx
// Header padding 根据断点收窄
const headerPadding = isMobile ? '0 12px' : '0 24px';

// isMobile 时隐藏页面标题文字（logo 或项目名），保留头像
// 汉堡图标在 Header 最左侧（isMobile 时可见）
```

**验收：** IT-001（间接），IT-008（不回归）

---

## Phase 2 — 页面级适配（P0/P1）

### T003 — QueryLogPage：table → 手机卡片 [P0]

**目标：** 小屏下以卡片展示查询日志，消除横向滚动

**涉及文件：**
- `src/pages/query-log/QueryLogPage.tsx`

**实现要点：**

```tsx
const screens = useBreakpoint();
const isMobile = !screens.lg;

// isMobile 时渲染卡片列表：
// <List dataSource={logs} renderItem={item => (
//   <Card size="small" style={{ marginBottom: 8 }}>
//     <Typography.Text strong>{item.steeringName}</Typography.Text>
//     <Tag color={statusColor}>{item.status}</Tag>
//     <Typography.Text type="secondary">{item.source} · {item.createdAt}</Typography.Text>
//   </Card>
// )} />

// !isMobile 时渲染原有 <table>（行为不变）
```

**卡片必须展示字段：** 规范名称、命中状态（Tag）、来源、查询时间

**验收：** IT-005

---

### T004 — DashboardPage：动态列数 [P1]

**目标：** 统计卡片列数随断点变化（xs:1, sm/md:2, lg+:4）

**涉及文件：**
- `src/pages/dashboard/DashboardPage.tsx`

**实现要点：**

```tsx
const screens = useBreakpoint();
const columns = screens.lg ? 4 : screens.sm ? 2 : 1;

// 替换硬编码：
// 原：gridTemplateColumns: 'repeat(4, 1fr)'
// 新：gridTemplateColumns: `repeat(${columns}, 1fr)`
```

**验收：** IT-006

---

### T005 — Modal 宽度自适应 [P1]

**目标：** 所有 Modal 在手机端不超出屏幕

**涉及文件（全局搜索 `<Modal`）：**
- `src/pages/steering/SteeringListPage.tsx`
- `src/pages/category-nav/CategoryNavPage.tsx`（不做全面响应，但 Modal 宽度仍需修复）
- 其他含 Modal 的页面

**实现要点：**

```tsx
// 创建 hooks/useModalWidth.ts（或直接内联）
const screens = useBreakpoint();
const modalWidth = screens.lg ? 520 : '90vw';

// 所有 <Modal> 加上 width={modalWidth}
// 如 Modal 原有自定义宽度（如 800px），则改为 screens.lg ? 800 : '90vw'
```

**验收：** IT-007

---

### T006 — SteeringListPage：手机端卡片视图 [P1]

**目标：** 小屏下以卡片展示规范列表

**涉及文件：**
- `src/pages/steering/SteeringListPage.tsx`

**实现要点：**

```tsx
const screens = useBreakpoint();
const isMobile = !screens.lg;

// isMobile 时渲染卡片列表（同 T003 模式）：
// <List renderItem={item => (
//   <Card size="small">
//     <Typography.Text strong>{item.name}</Typography.Text>
//     <Tag>{item.categoryName}</Tag>
//     <Tag color={statusColor}>{item.status}</Tag>
//   </Card>
// )} />

// !isMobile 时渲染原有 flex 行（行为不变）
```

**验收：** 375px 下列表无横向溢出，卡片显示规范名 + 分类 + 状态

---

## Phase 3 — 补充适配（P2）

### T007 — HealthPage：手机端卡片视图 [P2]

**目标：** 相似规范对列表在手机端可读

**涉及文件：**
- `src/pages/health/HealthPage.tsx`

**实现要点：**

与 T003/T006 模式相同：`isMobile` 时将 table/list 行渲染为 Card，展示规范名对 + 相似度分数。

---

## Checkpoints

**Phase 1 完成后检查点：**
- [ ] 375px 下主导航可通过 Drawer 访问
- [ ] 1280px 下 Sidebar 行为与改造前一致（无视觉回归）
- [ ] 汉堡图标仅在 < 992px 时可见

**Phase 2 完成后检查点：**
- [ ] 375px 下 QueryLogPage、DashboardPage、SteeringListPage 均无横向溢出
- [ ] 所有 Modal 在 375px 下不超出屏幕
- [ ] 1280px 下所有页面恢复 PC 样式（对比截图）

**Phase 3 完成后检查点：**
- [ ] HealthPage 在 375px 下可读
- [ ] 全量回归：在 1280px 下访问所有改动页面，确认无视觉变化
