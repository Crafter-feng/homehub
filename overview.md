# 前端设计审查与优化

## 完成内容
- 前端设计审查报告：docs/review/frontend-design-review-2026-07-04.md
- 参考项目分析：yuvomi（Web Components + Liquid Glass）、grocy（PHP + 智能日期输入）、homebox（Vue3 + Nuxt + Tailwind）

## 新增功能
### 日历功能 (CalendarView)
- 路由：/calendar，月历视图 + 列表视图双模式
- 事件标记：过期(红)、采购(蓝)、盘点(橙) 三类事件
- 选中日期面板显示当日事件详情
- 从 stock API 获取物品过期/采购日期自动生成事件

### 库存盘点 (InventoryAudit)
- 路由：/inventory-audit
- 4 卡片统计面板（应盘/已盘/一致/差异）
- 行内编辑实际数量，自动计算差异和状态
- 4 状态系统：待盘/一致/盈余/短缺
- 多维筛选：分类、位置、状态、搜索

### 图标系统升级 (IconPicker)
- 新组件：src/components/IconPicker.vue
- 双模式：SVG 图标(Ionicons5) + Emoji
- 8 分类 40+ SVG 图标，关键词搜索
- 工具函数：src/utils/icon-helper.ts
- MasterData 类别表格支持 SVG/emoji 双模式渲染

## 设计修复
- favicon.svg：#409EFF → 渐变 #6366f1→#8b5cf6
- manifest.json theme_color 同步更新
- Login.vue：emoji(📦📱🤖) → SVG 图标(CubeOutline/PhonePortraitOutline/HardwareChipOutline)

## 移动端增强
- MainLayout 新增底部导航栏（≤768px 显示）
- 5 快捷入口：看板/库存/日历/盘点/清单
- 内容区底部 padding 适配

## i18n 更新
- 新增 calendar(14 key) + inventoryAudit(28 key) 翻译模块
- 补全 common 缺失 key（confirmDelete/list/days 等）
- 补全 masterData 缺失 key（edit*/selectIcon/iconGroup* 等 30+ key）
- zh-CN.ts 和 en.ts 完全同步

## 构建验证
- vue-tsc --noEmit 通过
- vite build 成功（CalendarView 9.66kB, InventoryAudit 9.99kB）

## 新增文件
- client/src/views/calendar/CalendarView.vue
- client/src/views/audit/InventoryAudit.vue
- client/src/components/IconPicker.vue
- client/src/utils/icon-helper.ts
- docs/review/frontend-design-review-2026-07-04.md
