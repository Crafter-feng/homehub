# HomeHub 前端设计审查与优化报告

## 审查日期
2026-07-04

## 审查范围
对 HomeHub 前端项目（Vue3 + Naive UI + Pinia）进行全面设计审查，参考 yuvomi、grocy、homebox 三个开源项目的设计模式，进行功能增强和体验优化。

---

## 一、设计一致性修复

### 1.1 Favicon 颜色统一
- **问题**：favicon.svg 使用 `#409EFF`，与主题主色 `#6366f1` 不一致
- **修复**：更新为渐变色 `#6366f1 → #8b5cf6`，与 Logo 一致
- **同步修复**：manifest.json `theme_color` 同步更新

### 1.2 Login 页面 Emoji 替换
- **问题**：Login.vue 品牌区使用 emoji（📦 📱 🤖），与全站 SVG 图标风格不统一
- **修复**：替换为 `@vicons/ionicons5` SVG 图标（CubeOutline、PhonePortraitOutline、HardwareChipOutline），使用半透明圆角背景容器

---

## 二、新增功能

### 2.1 日历功能（CalendarView）
**路由**：`/calendar`

**功能特性**：
- **月历视图**：7×6 网格布局，显示当月日历，支持月份切换
- **事件标记**：日期单元格底部显示彩色圆点标记事件类型（过期=红、采购=蓝、盘点=橙）
- **选中日期面板**：右侧 360px 侧栏显示当日事件列表，包含物品名称、类型徽章、数量、位置、过期状态
- **列表视图**：按日期分组的时间线视图，支持事件统计
- **数据来源**：从 stock API 获取物品的过期日期和采购日期，自动生成日历事件
- **响应式**：移动端切换为单列布局

**参考设计**：
- Yuvomi 的日历多视图模式
- Grocy 的过期跟踪逻辑

### 2.2 库存盘点（InventoryAudit）
**路由**：`/inventory-audit`

**功能特性**：
- **盘点统计面板**：4 卡片显示应盘/已盘/一致/差异数量
- **进度条**：实时显示盘点完成百分比
- **开始/完成盘点**：支持一键启动盘点，完成后生成差异报告
- **行内编辑**：直接在表格中输入实际数量，自动计算差异和状态
- **状态系统**：4 种状态（待盘/一致/盈余/短缺），颜色标签区分
- **多维筛选**：按分类、位置、状态、搜索关键词过滤
- **差异报告**：完成盘点时显示总数和差异数摘要

**参考设计**：
- Grocy 的库存跟踪和数量管理
- Homebox 的低摩擦数据录入

### 2.3 图标系统升级（IconPicker 组件）
**组件路径**：`src/components/IconPicker.vue`

**功能特性**：
- **双模式选择器**：支持 SVG 图标 和 Emoji 两个 Tab
- **SVG 图标库**：8 个分类（食品/饮品/日用品/医药/家居/电子/工具/其他），共 40+ 个 Ionicons5 SVG 图标
- **关键词搜索**：每个 SVG 图标带有英文关键词，支持搜索
- **向后兼容**：自动识别已有 emoji 图标并正确渲染
- **统一渲染工具**：`src/utils/icon-helper.ts` 提供 `isEmojiIcon()`、`resolveIconComponent()` 方法

**MasterData 升级**：
- 类别表格的图标列支持 SVG 和 emoji 双模式渲染
- 产品表格的分类列也支持 SVG 图标显示
- 分类下拉选项正确显示图标

---

## 三、移动端响应式增强

### 3.1 底部导航栏
- **新增**：移动端（≤768px）显示固定底部导航栏
- **5 个快捷入口**：看板、库存、日历、盘点、清单
- **样式**：与主题色统一，选中项高亮，触摸友好
- **内容区适配**：移动端底部增加 72px padding 避免遮挡

---

## 四、i18n 国际化完善

### 4.1 新增翻译模块
- `calendar`：日历功能全部翻译（14 个 key）
- `inventoryAudit`：库存盘点全部翻译（28 个 key）

### 4.2 补全缺失翻译
- `common`：补充 `confirmDelete`、`confirmDeleteContent`、`item`、`operationFailed`、`deleteFailed`、`list`、`days` 等
- `masterData`：补充 `editProduct`、`editLocation`、`selectIcon`、`searchIcon`、`iconGroup*` 等 30+ 个缺失 key
- `nav`：添加 `calendar` 和 `inventoryAudit`

### 4.3 中英文同步
- zh-CN.ts 和 en.ts 完全同步，无遗漏

---

## 五、参考项目设计模式应用

| 设计模式 | 来源 | 应用情况 |
|---------|------|---------|
| 智能日期跟踪 | Grocy | ✅ 日历自动聚合过期和采购日期 |
| 过期优先级 | Grocy | ✅ 日历事件标记过期/即将过期状态 |
| 低摩擦录入 | Homebox | ✅ 盘点行内直接输入数量 |
| 徽章设计 | Homebox | ✅ 盘点状态使用 NTag 颜色标签 |
| 模块色调 | Yuvomi | ✅ 事件类型使用不同颜色区分 |
| 移动优先 | Yuvomi | ✅ 底部导航栏 + 响应式布局 |
| SVG 图标系统 | Homebox | ✅ IconPicker 组件 + ionicons5 |
| 多视图切换 | Yuvomi | ✅ 日历月视图/列表视图切换 |

---

## 六、构建验证

- ✅ TypeScript 类型检查通过（`vue-tsc --noEmit`）
- ✅ 生产构建成功（`vite build`）
- ✅ 新增组件正确打包：
  - CalendarView: 9.66 kB (gzip: 3.27 kB)
  - InventoryAudit: 9.99 kB (gzip: 3.27 kB)
  - IconPicker: 集成在 MasterData chunk 中

---

## 七、后续建议

1. **后端 API 适配**：日历和盘点功能目前使用现有 stock API，建议后续添加专门的 `/calendar/events` 和 `/audit` 端点
2. **PWA 启用**：`vite-plugin-pwa` 已安装但未启用，建议配置后开启离线支持
3. **AdminPanel 修复**：AdminPanel.vue 仍使用 `fetch()` 而非封装的 axios 实例，应统一使用 `api` 模块
4. **键盘快捷键**：参考 Grocy 模式，为高频操作（如盘点录入）添加键盘快捷键
5. **QR 码标签打印**：参考 Homebox 模式，在物品详情页集成 QR 码生成和打印功能
