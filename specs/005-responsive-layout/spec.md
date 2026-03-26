# Feature 005 — 响应式布局：PC + 手机端适配

## Feature Branch
`005-responsive-layout`

## Created
2026-03-26

## Status
Draft

## Input
前端当前布局完全为 PC 固定宽度设计：Sidebar 固定 280px、Dashboard 4 列网格、QueryLogPage 原生 `<table>` 需要 912px+ 最小宽度，在手机端（375px viewport）完全不可用。本 Feature 为纯前端改造，无后端变更。

---

## 现状分析

| 组件 | 问题 | 影响 |
|------|------|------|
| `Sidebar.tsx` | `Layout.Sider width={280}` 固定，无折叠、无 Drawer，手机端占 75% 宽度 | 所有页面手机端不可用 |
| `MainLayout.tsx` | 无任何 `useBreakpoint` 逻辑 | 布局不响应屏幕变化 |
| `DashboardPage.tsx` | `gridTemplateColumns: 'repeat(4, 1fr)'` 硬编码 4 列 | 375px 手机单格 65px，内容溢出 |
| `QueryLogPage.tsx` | 原生 `<table>` 各列宽固定，合计 ≈ 912px | 手机端水平滚动无法使用 |
| `SteeringListPage.tsx` | flex 行内固定宽度列（100/120/140/280px） | 手机端列宽溢出 |
| 所有 Modal | 未设置 `width="90vw"` 等响应限制 | 手机端弹窗超出屏幕 |

---

## 断点定义（Ant Design 5/6 标准）

| 断点 | 宽度 | 场景 |
|------|------|------|
| xs | < 576px | 手机竖屏 |
| sm | 576–767px | 手机横屏 |
| md | 768–991px | 平板 |
| lg | ≥ 992px | PC（当前唯一支持场景） |

**移动优先判断阈值**：`md`（< 768px）触发移动布局，`lg`（≥ 992px）恢复 PC 布局。

---

## 用户场景

### US-001 Sidebar 折叠与 Drawer（P0）
**As** 手机端用户
**I want** 进入页面时主内容区全宽展示，点击汉堡菜单弹出导航
**So that** 我能在小屏上正常阅读内容

**验收场景：**
- **Given** viewport < 768px
  **When** 页面加载
  **Then** Sidebar 隐藏，顶部显示汉堡图标（`☰`），内容区占全宽
- **Given** viewport < 768px，Drawer 关闭
  **When** 点击汉堡图标
  **Then** Sidebar 以 Drawer 形式从左侧滑入，宽度 ≤ 280px
- **Given** Drawer 已打开
  **When** 点击遮罩层或 Drawer 内任意菜单项
  **Then** Drawer 关闭
- **Given** viewport ≥ 992px
  **When** 页面加载或窗口调整
  **Then** 还原为固定 Sidebar，汉堡图标消失

### US-002 Header 手机端适配（P0）
**As** 手机端用户
**I want** 顶部 Header 不溢出屏幕
**So that** 始终能看到页面标题和用户头像

**验收场景：**
- **Given** viewport < 768px
  **When** 任意页面加载
  **Then** Header 内容不溢出，标题自动截断或隐藏，头像可点击
- **Given** viewport ≥ 992px
  **When** 任意页面加载
  **Then** Header 还原为完整 PC 样式（padding 24px，完整标题）

### US-003 QueryLogPage 手机端可读（P0）
**As** 手机端用户
**I want** 查看查询日志时内容可读
**So that** 不需要横向滚动 912px

**验收场景：**
- **Given** viewport < 768px
  **When** 访问 QueryLogPage
  **Then** 每条日志以卡片形式展示（规范名、来源、状态、时间），关键字段垂直排列
- **Given** viewport ≥ 992px
  **When** 访问 QueryLogPage
  **Then** 还原为完整 table 视图，所有列正常显示

### US-004 Dashboard 单列布局（P1）
**As** 手机端用户
**I want** Dashboard 统计卡片垂直排列
**So that** 每张卡片宽度充足，数字清晰可读

**验收场景：**
- **Given** viewport < 768px
  **When** 访问 DashboardPage
  **Then** 统计卡片单列排列（1 列），每张卡片宽度 = 屏幕宽度 - padding
- **Given** viewport 768–991px
  **When** 访问 DashboardPage
  **Then** 统计卡片 2 列排列
- **Given** viewport ≥ 992px
  **When** 访问 DashboardPage
  **Then** 统计卡片 4 列排列（现有行为不变）

### US-005 Modal 宽度自适应（P1）
**As** 手机端用户
**I want** 弹窗不超出屏幕宽度
**So that** 我能完整看到弹窗内容并操作

**验收场景：**
- **Given** viewport < 768px
  **When** 任意 Modal 弹出
  **Then** Modal 宽度 = `min(90vw, 520px)`，不超出屏幕
- **Given** viewport ≥ 992px
  **When** 任意 Modal 弹出
  **Then** Modal 使用默认宽度（520px 或原有设定），行为不变

### US-006 SteeringListPage 手机端可用（P1）
**As** 手机端用户
**I want** 浏览规范列表时内容可读
**So that** 不需要横向滚动

**验收场景：**
- **Given** viewport < 768px
  **When** 访问 SteeringListPage
  **Then** 每条规范以卡片形式展示（名称、分类、状态），固定宽度列隐藏或收起
- **Given** viewport ≥ 992px
  **When** 访问 SteeringListPage
  **Then** 还原为完整列表视图

### US-007 HealthPage 手机端可读（P2）
**As** 手机端用户
**I want** 健康检查页面在手机上可读
**So that** 我能查看相似规范对列表

**验收场景：**
- **Given** viewport < 768px
  **When** 访问 HealthPage
  **Then** 相似对列表以卡片展示，列宽自适应

---

## 不适配范围

以下页面/组件在本 Feature 中**不做响应式改造**，原因为操作复杂度高、手机端使用频率极低：

| 页面 | 原因 |
|------|------|
| `CategoryNavPage.tsx` | 树形拖拽操作，手机端不适合使用 |
| `CompliancePage.tsx` | 复杂表单 + 结果展示，手机端不适合使用 |
| `RepoListPage.tsx` | 管理页面，PC 优先 |
| Swagger UI（`/api-docs`） | 第三方工具，不在改造范围 |

以上页面在手机端展示时，只需确保**有基础滚动**，不做专项适配。

---

## 独立测试（Independent Tests）

IT-001: 375px viewport 下，Sidebar 不可见，汉堡图标可见
IT-002: 点击汉堡图标，Drawer 从左侧滑入
IT-003: Drawer 打开时，点击遮罩层，Drawer 关闭
IT-004: 1280px viewport 下，Sidebar 正常显示，汉堡图标不可见
IT-005: 375px viewport 下，QueryLogPage 显示卡片列表而非 table
IT-006: 375px viewport 下，DashboardPage 统计卡片为 1 列
IT-007: 375px viewport 下，任意 Modal 宽度不超过屏幕宽度
IT-008: 992px viewport 下，所有页面恢复 PC 布局
