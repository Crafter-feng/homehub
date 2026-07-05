# Grocy vs HomeHub 功能对比分析

> 日期：2026-07-05 | 基于 Grocy v4.6.0 与 HomeHub 当前版本

---

## 一、总览

| 维度 | Grocy | HomeHub |
|------|-------|---------|
| 技术栈 | PHP + SQLite + jQuery | NestJS + Vue3 + SQLite |
| 定位 | 家庭 ERP（冰箱外的 ERP） | 家庭库存管理 |
| GitHub Stars | 9.2k | — |
| 许可证 | MIT | — |
| 国际化 | Transifex 多语言，社区驱动 | 中英双语，手动维护 |
| 移动端 | PWA + 原生 Android/iOS 应用 | PWA（响应式） |
| API | 完整 REST API + Swagger | REST API |

---

## 二、核心功能对比

### 2.1 库存管理（Stock）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 物品 CRUD | ✅ | ✅ | — |
| 批次管理 | ✅ 独立 stock_entry 表 | ✅ inv_item_batches | Grocy 每个批次独立追踪价格/位置/过期 |
| FIFO 消费 | ✅ 自动按过期日+入库顺序 | ✅ | — |
| 单位转换 | ✅ purchase_unit ↔ stock_unit ↔ consume_unit | ✅ purchaseToStockFactor | HomeHub 仅支持两两转换，Grocy 支持链式 |
| 皮重处理 | ✅ tare_weight 自动扣减 | ✅ tare_weight 字段存在 | HomeHub 未实际使用 |
| 多位置库存 | ✅ 同一产品可存多个位置，分别追踪 | ❌ 物品只有单一 location | **关键差距** |
| 产品父子关系 | ✅ parent_product_id，聚合查看 | ✅ productId + parent_id | — |
| 产品条码 | ✅ product_barcodes 多条码 | ✅ inv_product_barcodes + barcode_lookup | — |
| 自定义字段 | ✅ userfields 系统，任意实体可扩展 | ✅ sys_custom_fields + sys_custom_values | — |
| 产品图片 | ✅ 文件系统存储 | ✅ image 字段 | — |
| 库存审计 | ✅ 内置 | ✅ audit 流程 | — |
| 库存警告 | ✅ min_stock_amount + 自动购物清单 | ✅ minStock + autoReplenish | — |

**关键差距：多位置库存**

Grocy 的 `stock_entry` 表记录每一笔库存的具体位置、价格、过期日。同一产品可以在冰箱和储藏室各有一份，分别追踪。

HomeHub 的 `inv_items` 表每条记录只有一个 `location_id`。如果要区分位置，需要创建多条 item 记录。

---

### 2.2 价格追踪（Price Tracking）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 入库记录价格 | ✅ 每笔 stock_entry 独立价格 | ✅ stockIn 时传入 price | — |
| 价格历史 | ✅ 按产品聚合 | ✅ getPriceHistory | — |
| 价格趋势图表 | ✅ 内置图表 | ✅ PriceHistoryChart 组件 | — |
| 历史最低/最高/均价 | ✅ 自动计算 | ✅ minPrice/maxPrice/avgPrice | — |
| 价格按商店分组 | ✅ shopping_location_id 关联 | ✅ shop 字段 + 前端分组 | — |
| 价格按规格分组 | ❌ 无 spec 概念 | ✅ spec 字段 | HomeHub 领先 |

---

### 2.3 购物清单（Shopping List）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 清单 CRUD | ✅ | ✅ | — |
| 自动补货 | ✅ min_stock 触发 | ✅ autoReplenish | — |
| 商品分组 | ✅ 按 aisle 分组优化购物路线 | ✅ group_by 字段 | — |
| 关联库存 | ✅ 购买后自动入库 | ✅ linked_item_id | — |
| 批量操作 | ✅ 批量勾选/删除 | ❌ 无批量操作 | **差距** |
| 购物清单模板 | ✅ | ✅ holiday_templates | — |
| 食谱生成清单 | ✅ 一键生成 | ✅ generateShoppingList | — |
| 分配给家庭成员 | ❌ | ✅ assignee_id | HomeHub 领先 |

---

### 2.4 食谱（Recipes）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 食谱 CRUD | ✅ | ✅ | — |
| 成分库存检查 | ✅ 实时显示缺货 | ✅ matchRecipeToStock | — |
| 缺货自动加购物清单 | ✅ | ✅ | — |
| Due Score（临期利用评分） | ✅ | ✅ dueScoreCalculator | — |
| 膳食计划关联 | ✅ meal_plan | ✅ hh_meal_plans | — |
| 食谱导入/导出 | ❌ 无内置 | ✅ JSON 导入导出（支持 Grocy 格式） | HomeHub 领先 |
| 食谱图片 | ✅ | ✅ image 字段 | — |
| 步骤化操作 | ❌ 仅 description 文本 | ✅ steps 数组（stepNumber + instruction） | HomeHub 领先 |
| 营养信息 | ❌ | ✅ caloriesPerUnit | HomeHub 领先 |

---

### 2.5 膳食计划（Meal Plan）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 周计划视图 | ✅ | ✅ | — |
| 按天/餐次分配 | ✅ day_of_week + meal_type | ✅ | — |
| 一键生成购物清单 | ✅ | ✅ | — |
| 拖拽调整 | ✅ 前端交互 | ❌ 无拖拽 | **差距** |

---

### 2.6 家务管理（Chores）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 家务 CRUD | ✅ 完整 | ⚠️ 用 hh_lists(type=chore) 模拟 | **实现方式不同** |
| 周期调度 | ✅ 周期类型/天数/间隔/配置 | ⚠️ 通过 list 的 config 字段 | — |
| 执行跟踪 | ✅ chore_log 完整追踪 | ⚠️ 通过 list_item 状态 | — |
| 轮值分配 | ✅ assignment_type: random/next/round-robin | ❌ | **关键差距** |
| 跳过/撤销 | ✅ | ❌ | **差距** |
| 执行者追踪 | ✅ done_by_user_id | ⚠️ assignee_id | — |

---

### 2.7 电池管理（Batteries）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 电池 CRUD | ✅ 完整模块 | ❌ 无独立模块 | **缺失** |
| 充电追踪 | ✅ charge_cycles | ❌ | **缺失** |
| 低电量提醒 | ✅ | ❌ | **缺失** |

---

### 2.8 设备管理（Equipment）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 设备 CRUD | ✅ | ❌ 无独立模块 | **缺失** |
| 说明书存储 | ✅ 关联文件 | ⚠️ inv_documents 可用但未专门设计 | — |
| 购买/保修追踪 | ✅ purchase_date, warranty_needs_batteries | ❌ | **缺失** |

---

### 2.9 任务管理（Tasks）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 任务 CRUD | ✅ 完整模块 | ⚠️ 用 hh_lists(type=todo) 模拟 | **实现方式不同** |
| 截止日期 | ✅ due_date | ✅ due_at | — |
| 状态追踪 | ✅ status 枚举 | ✅ pending/completed | — |
| 分配 | ❌ | ✅ assignee_id | HomeHub 领先 |

---

### 2.10 日历（Calendar）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 事件 CRUD | ✅ | ✅ hh_calendar_events | — |
| 重复事件 | ✅ recurrence 规则 | ✅ recurrence 字段 | — |
| 提醒 | ✅ | ✅ reminder_minutes | — |
| 关联实体 | ✅ related_type + related_id | ✅ | — |
| 节日模板 | ❌ | ✅ hh_holiday_templates | HomeHub 领先 |

---

### 2.11 预算管理（Budget）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| 收支记录 | ❌ 无内置 | ✅ hh_budget_entries | **HomeHub 独有** |
| 分类管理 | ❌ | ✅ hh_budget_categories | **HomeHub 独有** |
| 定期订阅 | ❌ | ✅ hh_budget_subscriptions | **HomeHub 独有** |

---

### 2.12 硬件集成（Hardware）

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| RFID 读卡器 | ❌ 无内置 | ✅ sys_rfid_readers + zones + trigger_bindings | **HomeHub 独有** |
| NFC 标签 | ❌ | ✅ sys_nfc_tag_state | **HomeHub 独有** |
| 硬件设备管理 | ❌ | ✅ sys_hardware_devices | **HomeHub 独有** |
| 自动化触发 | ❌ | ✅ sys_automation_triggers | **HomeHub 独有** |

---

### 2.13 MCP / AI 集成

| 功能 | Grocy | HomeHub | 差距 |
|------|:-----:|:-------:|------|
| MCP Server | ❌ | ✅ 内置 MCP 工具 | **HomeHub 独有** |
| AI 对话操作库存 | ❌ | ✅ 通过 MCP 工具 | **HomeHub 独有** |

---

## 三、Grocy 有而 HomeHub 缺失的关键功能

### P0 — 核心差距

| # | 功能 | 说明 | 影响 |
|---|------|------|------|
| 1 | **多位置库存** | Grocy 的 stock_entry 支持同一产品在不同位置分别追踪 | 家庭多冰箱/储藏室场景无法精确管理 |
| 2 | **条码扫描入库** | Grocy 支持浏览器摄像头扫码 + 外部条码查询（Open Food Facts） | 入库效率低 |
| 3 | **产品选择器工作流** | Grocy 在输入框输入未知内容时弹出"创建新/查找已有/条码查询"三选一 | 新建产品流程不顺畅 |

### P1 — 重要差距

| # | 功能 | 说明 |
|---|------|------|
| 4 | **购物清单批量操作** | Grocy 支持批量勾选、批量删除 |
| 5 | **家务轮值分配** | Grocy 支持 random/next/round-robin 自动分配 |
| 6 | **电池管理模块** | Grocy 有完整的电池追踪+充电记录 |
| 7 | **设备管理模块** | Grocy 可存储设备说明书和购买信息 |
| 8 | **日期输入快捷键** | Grocy 支持 `+1m`, `0517`, `x`(永不过期) 等快捷输入 |
| 9 | **键盘快捷键** | Grocy 按钮上的加粗字母可作为快捷键触发 |
| 10 | **PWA 离线缓存** | Grocy 是完整的 PWA，可安装到桌面 |
| 11 | **Feature Flags** | Grocy 可禁用不需要的模块（如隐藏 chores/batteries） |
| 12 | **夜间模式** | Grocy 支持自动/手动夜间模式切换 |

### P2 — 增强功能

| # | 功能 | 说明 |
|---|------|------|
| 13 | **标签打印** | Grocy 支持打印 Grocycode/库存标签 |
| 14 | **文件管理** | Grocy 有完整的文件上传/下载/删除 API |
| 15 | **数据库迁移可视化** | Grocy 访问根路径自动触发迁移 |
| 16 | **演示模式** | Grocy 可生成演示数据 |
| 17 | **嵌入模式** | Grocy 可嵌入其他应用运行 |
| 18 | **自定义 CSS/JS** | Grocy 支持通过文件注入自定义样式和脚本 |

---

## 四、HomeHub 有而 Grocy 缺失的功能

| # | 功能 | 说明 |
|---|------|------|
| 1 | **预算管理** | 收支记录、分类、定期订阅 |
| 2 | **RFID/NFC 硬件集成** | 标签绑定、读卡器管理、自动化触发 |
| 3 | **MCP/AI 集成** | 通过 AI 对话操作库存 |
| 4 | **食谱步骤化** | 步骤数组而非纯文本描述 |
| 5 | **营养信息** | caloriesPerUnit 字段 |
| 6 | **食谱导入导出** | JSON 格式，兼容 Grocy |
| 7 | **价格按规格分组** | spec 字段区分同产品不同规格 |
| 8 | **购物清单分配** | assignee_id 分配给家庭成员 |
| 9 | **节日模板** | 预设节日清单模板 |
| 10 | **审计盘点** | 库存盘点流程 |

---

## 五、架构差异

### 5.1 库存数据模型

**Grocy：**
```
products (产品主数据)
  └── stock_entries (每一笔库存独立记录)
        ├── location_id (所在位置)
        ├── price (单价)
        ├── best_before_date (过期日)
        ├── purchased_date (购买日)
        └── open (是否已开封)
```

**HomeHub：**
```
inv_products (产品主数据)
inv_items (库存条目 — 一个产品对应一个 item)
  ├── location_id (单一位置)
  ├── quantity (总数量)
  └── inv_item_batches (批次 — 按过期日分组)
        ├── quantity
        ├── expiry_date
        └── location_id
```

**差异：** Grocy 的 stock_entry 是最小粒度，每笔入库独立追踪。HomeHub 的 item 是聚合粒度，批次只按过期日分组。

### 5.2 身份认证

**Grocy：** 简单密码认证 + API Key
**HomeHub：** JWT access/refresh token + API Token + 家庭成员角色

### 5.3 扩展性

**Grocy：** PHP 插件系统（barcode lookup plugin 等）
**HomeHub：** 插件系统 + MCP 工具 + 自动化触发器

---

## 六、优先级建议

### 短期（1-2 周）

1. **条码扫描入库** — 接入摄像头扫码 + 条码查询 API
2. **购物清单批量操作** — 批量勾选/删除
3. **产品选择器工作流** — 输入框集成新建/查找/扫码

### 中期（1-2 月）

4. **多位置库存** — 重构 stock_entry 模型，支持同产品多位置
5. **电池管理模块** — 独立模块
6. **设备管理模块** — 独立模块
7. **家务轮值分配** — 扩展 chore 逻辑

### 长期（3+ 月）

8. **PWA 增强** — 离线缓存、安装提示
9. **Feature Flags** — 按需禁用模块
10. **标签打印** — 接入热敏打印机
11. **夜间模式** — 自动/手动切换

---

## 七、结论

HomeHub 在**硬件集成**（RFID/NFC）、**AI 集成**（MCP）、**预算管理**、**食谱步骤化**等方向有独特优势。但在**核心库存管理**的深度上（多位置追踪、条码扫描、批量操作）与 Grocy 有明显差距。

建议优先补齐条码扫描和多位置库存这两个核心能力，这是家庭库存管理的高频场景。
