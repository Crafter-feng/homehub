# HomeHub vs Grocy 库存管理深度差距分析 (v2)

> **分析日期**: 2026-07-04  
> **对标项目**: [Grocy](https://github.com/grocy/grocy) v4.6.0  
> **范围**: 库存管理全流程对比  
> **更新**: 基于已实施功能重新评估

---

## 一、已对齐的功能 (23项)

以下功能 HomeHub 已实现，基本达到 Grocy 水平：

| 功能 | HomeHub 实现 | Grocy 对应 |
|------|-------------|-----------|
| 批次管理 | `invItemBatches` 表 + FIFO 消耗 | `stock` 表独立条目 |
| FIFO 消耗 | 按到期日+创建时间排序扣减 | `stock_next_use` 视图 |
| 盘点写回 | `completeAudit()` 调用 adjust API | `POST /stock/adjust` |
| 库存日志 | HistoryPage 筛选+汇总 | `/stockjournal` |
| 变质标记 | `spoiled` 字段 | `spoiled` 字段 |
| 到期日自动计算 | `defaultBestBeforeDays` | `default_best_before_days` |
| 开启后到期调整 | `defaultBestBeforeDaysAfterOpen` | `default_best_before_days_after_open` |
| 冷冻自动调整 | 位置类型判断 + 到期延长 | 位置属性配置 |
| CSV 导入导出 | 前端按钮 + 后端 API | 完整实现 |
| 批次编辑 | EditBatch API | 单条目编辑 |
| 支出报表 | SpendingReport 页面 | `/stockreports/spendings` |
| 位置报表 | LocationReport 页面 | 位置内容打印 |
| 购物列表关联 | `autoReplenish()` 低库存触发 | 自动加入购物清单 |
| 消耗率追踪 | `lastUsedAt` + `spoilRate` | `spoil_rate_percent` |
| 产品图片 | StockList 卡片/表格缩略图 | 产品图片上传 |
| 多用户追踪 | `userName` 在历史/仪表盘显示 | `changed_user_id` |
| 开启后自动转移 | `moveOnOpenLocationId` | `move_on_open` |
| 热量追踪 | `caloriesPerUnit` 字段 | `calories` 字段 |
| 多量化单位 | `mdUnits` 转换因子 + 前端选择器 | 4 种单位类型 |
| 条码多对一 | `invProductBarcodes` 表 | `barcodes` 字段 |
| 权限控制 | `AdminGuard` + `familyMembers.role` | 用户权限系统 |
| 外部条码查询 | `BarcodeLookupService` (OpenFoodFacts) | 插件系统 |
| 自定义二维码 | Encoder 模块 (QR/NFC/条码) | Grocycode |

---

## 二、残余差距清单

### P1 — 重要增强

| # | 差距 | Grocy 实现 | HomeHub 现状 | 优先级 |
|---|------|-----------|-------------|--------|
| 1 | **多单位精细区分** | 4 种单位：采购单位(purchase)、库存单位(stock)、消耗单位(consume)、价格单位(price)，每种独立配置 + 转换因子 | 仅有 1 个 unit 字段 + mdUnits 转换因子，未区分用途 | 中 |
| 2 | **库存条目独立编辑** | 每个 stock entry 可独立修改数量/到期日/位置/价格/开启状态 | 批次可编辑，但无独立条目编辑界面 | 中 |
| 3 | **库存条目合并** | `CompactStockEntries()` 自动合并同属性条目 | 有 compactBatches API，前端无入口 | 低 |
| 4 | **食谱关联消耗** | 消耗时可关联食谱，搜索含该产品的食谱，"Due Score" 指示哪些食谱适合消耗临期食材 | 有 recipes 模块但未与消耗流程关联 | 中 |
| 5 | **购物清单智能分组** | 按店铺/区域分组购物清单，优化购物路线 | 有购物清单但无分组功能 | 低 |
| 6 | **日期输入快捷键** | `MMDD`、`+1m`、`x`(永不过期) 等快捷输入 | 标准日期选择器 | 低 |
| 7 | **键盘快捷键** | 按钮字母快捷键（如 `P` 添加产品） | 无 | 低 |
| 8 | **功能开关** | `FEATURE_FLAG_*` 可禁用不需要的功能模块 | 无 | 低 |
| 9 | **自定义 CSS/JS** | `data/custom_js.html` + `data/custom_css.html` 注入 | 无 | 低 |
| 10 | **Demo 模式** | `MODE=demo` 自动生成演示数据 | 有 seed 脚本 | 低 |

### P2 — 锦上添花

| # | 差距 | 说明 | 复杂度 |
|---|------|------|--------|
| 11 | **子产品替代消耗** | 消耗父产品时自动检查子产品库存并使用 | 中 |
| 12 | **皮重处理** | 毛重/净重管理，含容器重量 | 低 |
| 13 | **电量管理** | 电池充电/更换追踪 | 低 |
| 14 | **设备手册管理** | 家电说明书/保修卡存储 | 低 (已有 invDocuments) |
| 15 | **夜间模式自动切换** | 根据日出日落自动切换 | 低 |
| 16 | **移动端原生 App** | Android/iOS 原生应用 | 高 |
| 17 | **离线 PWA** | 离线可用的 PWA | 高 |
| 18 | **多语言完善** | Transifex 集成，社区翻译 | 中 |
| 19 | **自定义字段系统** | 任意实体可附加自定义字段 | 中 |
| 20 | **REST API 文档** | Swagger/OpenAPI 自动生成 | 低 (已有 Swagger) |

---

## 三、HomeHub 独有优势

| 功能 | 说明 | Grocy 无 |
|------|------|----------|
| **AI MCP 集成** | 自然语言查询库存、智能建议 | ✅ |
| **IoT RFID 支持** | 读卡器管理、自动出入库识别 | ✅ |
| **硬件集成** | ESP32/STM32 设备管理、OTA 升级 | ✅ |
| **插件系统** | 三层架构 (core/registry/built-in)，支持热加载 | ✅ |
| **MCP 工具扩展** | 可插拔的 AI 工具集 | ✅ |
| **NestJS 架构** | 模块化 + DI，更适合大型项目扩展 | PHP 单体 |
| **Vue3 + TypeScript** | 现代前端技术栈 | jQuery + Blade |
| **Drizzle ORM** | 类型安全的数据库操作 | 手写 SQL |
| **PWA + 响应式** | 移动端适配 | ✅ (相同) |

---

## 四、Grocy 独有优势

| 功能 | 说明 | HomeHub 无 |
|------|------|-----------|
| **4 种单位体系** | 采购/库存/消耗/价格单位独立配置 | ✅ |
| **Due Score 食谱评分** | 指示哪些食谱适合消耗临期食材 | ✅ |
| **购物清单路线优化** | 按店铺/区域分组 | ✅ |
| **日期输入快捷键** | MMDD、+1m 等高效输入 | ✅ |
| **功能开关** | 可禁用不需要的模块 | ✅ |
| **自定义 CSS/JS** | 无需修改代码即可定制 | ✅ |
| **成熟社区** | 9.2k stars，活跃的 Reddit 社区 | ✅ |
| **原生移动 App** | Android/iOS 专用应用 | ✅ |
| **Demo 模式** | 一键生成演示数据 | ✅ |

---

## 五、实施建议

### 短期 (1-2 周)

1. **完善多单位体系** — 区分 purchaseUnit/stockUnit/consumeUnit，这是 Grocy 的核心设计
2. **食谱关联消耗** — 在 consume 流程中添加食谱选择，计算 Due Score
3. **购物清单分组** — 按店铺分组，支持区域标记

### 中期 (1 个月)

4. **库存条目独立编辑** — 完善 ItemDetailModal 的批次编辑功能
5. **功能开关系统** — 配置化启用/禁用模块
6. **日期输入快捷键** — 提升输入效率

### 长期 (按需)

7. **移动端 App** — 考虑 Capacitor 或原生开发
8. **离线 PWA** — Service Worker + IndexedDB
9. **自定义字段系统** — 灵活扩展实体属性

---

## 六、总结

经过本轮实施，HomeHub 已补齐 **23 项** 核心功能，与 Grocy 的差距从 34 项缩小到 **20 项**（10 项 P1 + 10 项 P2）。

**核心差距**：多单位体系（Grocy 的 4 种单位设计更精细）

**独特优势**：HomeHub 在 AI/IoT/插件系统方面领先，这是 Grocy 完全没有的方向。

**建议**：优先补齐 P1 中的多单位和食谱关联，其余按需逐步实施。HomeHub 应发挥 AI + IoT 差异化优势，而非完全对标 Grocy 的传统功能。
