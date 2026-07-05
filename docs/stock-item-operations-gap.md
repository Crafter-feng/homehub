# 库存物品操作差距分析

> 聚焦库存物品的增删改查及所有操作，对比 Grocy v4.6.0

---

## 一、操作对比总表

| 操作 | Grocy | HomeHub | 状态 |
|------|:-----:|:-------:|------|
| 创建物品 | ✅ 产品选择器工作流 | ✅ 表单创建 | ⚠️ 缺少选择器 |
| 编辑物品 | ✅ 列表/详情/弹窗均可编辑 | ❌ **无编辑入口** | **缺失** |
| 删除物品 | ✅ | ✅ | — |
| 入库（Purchase） | ✅ 完整表单 | ✅ | — |
| 消费（Consume） | ✅ 支持多种方式 | ✅ FIFO 批次消费 | — |
| 转移（Transfer） | ✅ 支持部分转移 | ⚠️ 只能全部转移 | **差距** |
| 调整（Adjust） | ✅ inventory-correction | ✅ 绝对值调整 | — |
| 标记已开封 | ✅ open 状态 | ✅ currentState='opened' | — |
| 产品合并 | ✅ merge 两个产品 | ❌ | **缺失** |
| 标签打印 | ✅ printlabel | ❌ | **缺失** |
| 条码外部查询 | ✅ Open Food Facts | ⚠️ apizero + OFF | 基本对等 |
| 撤销操作 | ✅ undo booking | ❌ 注释掉的框架 | **缺失** |
| 批次编辑 | ✅ 可编辑每条 stock entry | ❌ "开发中" toast | **缺失** |
| 批次删除 | ✅ | ✅ | — |
| 批次合并 | ❌ | ✅ compactBatches | HomeHub 领先 |
| 部分消费 | ✅ 指定 batch_id 消费 | ✅ 支持 batchId | — |
| 过期消费 | ✅ spoiled 标记 | ⚠️ API 有字段但 UI 未暴露 | **UI 缺失** |
| 食谱关联消费 | ✅ recipe_id | ⚠️ API 有字段但 UI 未暴露 | **UI 缺失** |
| 库存盘点 | ❌ 无内置 | ✅ audit 流程 | HomeHub 领先 |
| CSV 导入导出 | ✅ | ✅ | — |
| 自动补货 | ✅ min_stock + 购物清单 | ✅ autoReplenish | — |

---

## 二、缺失操作详解

### 🔴 P0 — 编辑功能完全缺失

**现状：** StockList.vue 的"更多操作"菜单中有"编辑"选项，但点击后只是打开 ItemDetailModal（只读详情），没有编辑表单。

**应该有：**
- 物品名称、类型、分类、位置、单位、品牌、备注、图片的编辑
- 最低库存（minStock）的编辑
- 购买价格、购买日期的编辑
- 保质期的编辑
- 自定义字段的编辑
- 产品规格（spec）的编辑

**Grocy 对比：** 任何列表项、详情页、弹窗中点击编辑图标即可进入编辑模式，字段全部可改。

---

### 🔴 P0 — 缺少产品选择器工作流

**现状：** 创建物品时需要手动填写所有字段。没有"输入框中输入内容 → 弹出选择器（创建新/查找已有/条码查询）"的流程。

**Grocy 对比：** 在任何产品输入框中输入未知内容，自动弹出三选一：
1. 作为新产品创建
2. 搜索已有产品
3. 通过条码查询外部数据库

---

### 🟡 P1 — 转移只能全部转移

**现状：** 转移弹窗只有"目标位置"选择，没有数量字段。API 的 `TransferItemDto` 有可选的 `quantity` 参数，但 UI 未暴露。

**Grocy 对比：** 支持部分转移（指定数量），可以从一个位置的一部分移到另一个位置。

---

### 🟡 P1 — 批次编辑未实现

**现状：** ItemDetailModal 的批次 tab 中有"编辑"按钮，但点击显示 `message.info('批次编辑功能开发中')`。

**Grocy 对比：** 每条 stock entry 可独立编辑：数量、过期日、价格、位置、开封状态。

---

### 🟡 P1 — 过期消费和食谱关联消费 UI 缺失

**现状：** `ConsumeItemDto` 有 `spoiled` 和 `recipeId` 字段，但前端的消耗弹窗没有这些选项。

**Grocy 对比：** 消费时可勾选"已变质"，可关联到食谱。

---

### 🟡 P1 — 产品合并功能缺失

**现状：** 无合并功能。如果创建了重复产品，只能手动删除一个。

**Grocy 对比：** `POST /stock/products/{productIdToKeep}/merge/{productIdToRemove}` 可将两个产品合并，保留一个的库存和历史。

---

### 🟡 P1 — 缺少开封状态切换

**现状：** 只能标记为"已开封"，不能从"已开封"恢复为"未开封"。

**Grocy 对比：** open 状态可自由切换（已开封 ↔ 未开封），影响 FIFO 消费顺序（已开封的优先消费）。

---

### 🟢 P2 — 撤销操作未实现

**现状：** StockList.vue 有注释掉的 undo 框架，后端无 undo 端点。

**Grocy 对比：** `DELETE /stock/bookings/{bookingId}/undo` 可撤销任何库存操作。

---

### 🟢 P2 — 部分转移 UI 缺失

**现状：** 转移总是移动全部数量。

**Grocy 对比：** 可指定转移数量，实现部分位置调整。

---

### 🟢 P2 — 缺少批量操作

**现状：** 列表无多选功能，不能批量消费、批量转移、批量删除。

**Grocy 对比：** 购物清单支持批量勾选/删除。库存列表虽无多选，但支持批量导入。

---

### 🟢 P2 — 缺少物品克隆

**现状：** 无克隆功能。

**Grocy 对比：** 无内置克隆，但可通过复制创建。

---

## 三、UI 交互差距

### 3.1 列表页操作

| 交互 | Grocy | HomeHub |
|------|-------|---------|
| 点击行 | 展开详情/编辑 | 打开弹窗（只读） |
| 编辑按钮 | ✅ 直接编辑 | ❌ 打开详情弹窗 |
| 删除按钮 | ✅ 确认后删除 | ✅ 确认后删除 |
| 快速入库 | ✅ 行内输入 | ✅ 行内弹窗 |
| 快速消费 | ✅ 行内输入 | ✅ 确认消费 1 个 |
| 搜索 | ✅ 实时搜索 | ✅ 搜索框 |
| 筛选 | ✅ 多维度 | ✅ 分类/位置/状态 |
| 排序 | ✅ 多列可排序 | ⚠️ 仅分组排序 |
| 视图切换 | ✅ 列表/看板 | ✅ 表格/卡片 |

### 3.2 详情页操作

| 交互 | Grocy | HomeHub |
|------|-------|---------|
| 编辑 | ✅ 内联编辑 | ❌ 只读展示 |
| 入库 | ✅ 完整表单 | ✅ |
| 消费 | ✅ 完整表单 | ✅ |
| 转移 | ✅ 含数量 | ⚠️ 无数量 |
| 删除 | ✅ | ✅ |
| 批次管理 | ✅ 编辑/删除/移动 | ⚠️ 只能删除/合并 |
| 价格历史 | ✅ | ✅ |
| 交易记录 | ✅ | ✅ |
| 标签打印 | ✅ | ❌ |

### 3.3 表单字段对比

| 字段 | Grocy 产品表单 | HomeHub 产品表单 |
|------|---------------|-----------------|
| 名称 | ✅ | ✅ |
| 分类 | ✅ product_group | ✅ categoryId |
| 位置 | ✅ 默认位置 | ✅ locationId |
| 单位 | ✅ purchase/stock/consume 三套 | ✅ purchase/stock/consume + 转换因子 |
| 品牌 | ❌ | ✅ brand |
| 条码 | ✅ 多条码 | ✅ barcode + product_barcodes |
| 图片 | ✅ | ✅ image |
| 备注 | ✅ description | ✅ notes |
| 最低库存 | ✅ min_stock_amount | ✅ minStock |
| 默认价格 | ✅ | ✅ defaultPrice |
| 过期天数 | ✅ default_best_before_days | ✅ defaultBestBeforeDays |
| 开封后过期天数 | ✅ default_best_before_days_after_open | ✅ defaultBestBeforeDaysAfterOpen |
| 开封后自动转移位置 | ✅ move_on_open_location_id | ✅ moveOnOpenLocationId |
| 皮重 | ✅ tare_weight | ✅ tareWeight |
| 热量 | ✅ calories | ✅ caloriesPerUnit |
| 父产品 | ✅ parent_product_id | ✅ parentId |
| 购买商店 | ✅ shopping_location_id | ✅ shop（直接存名称） |
| 规格 | ❌ | ✅ spec（HomeHub 独有） |
| 自定义字段 | ✅ userfields | ✅ sys_custom_fields |

---

## 四、建议修复优先级

### 立即修复（本次迭代）

1. **添加编辑功能** — 在 StockList 和 ItemDetailModal 中加入编辑表单，调用 `PUT /stock/items/:id`
2. **实现批次编辑** — ItemDetailModal 批次 tab 的编辑按钮接入 `PUT /stock/items/batches/:batchId`
3. **转移增加数量字段** — TransferItemDto 已支持 quantity，只需在 UI 弹窗中加一个输入框

### 短期（1-2 周）

4. **开封状态切换** — 消费弹窗或详情页增加"标记为未开封"按钮
5. **过期消费标记** — 消费弹窗增加"已变质"复选框
6. **食谱关联消费** — 消费弹窗增加食谱选择（如有关联食谱）
7. **产品选择器工作流** — 入库/创建时的智能选择器

### 中期（1 月）

8. **产品合并** — 后端实现 merge 端点，前端提供合并入口
9. **撤销操作** — 后端 undo 端点 + 前端 toast 撤销
10. **批量操作** — 列表多选 + 批量消费/转移/删除
11. **部分转移** — UI 支持指定转移数量

---

## 五、编辑功能实现方案

### 需要编辑的字段

**物品基本信息：**
- name, type, categoryId, locationId, unit, brand, barcode, notes, image
- minStock, shop, spec

**价格相关：**
- purchasePrice, currency

**日期相关：**
- purchaseDate, expiryDate

**高级字段：**
- customFields

### 实现方式

1. 在 StockList.vue 的"更多操作"菜单中，"编辑"按钮打开一个新的编辑弹窗
2. 在 ItemDetailModal.vue 中，信息 tab 顶部增加"编辑"按钮，点击后切换为编辑模式
3. 编辑表单复用 ProductFormDialog.vue（已存在但可能需要调整）
4. 调用 `PUT /stock/items/:id` 保存

### 需要注意

- `update()` 方法已经实现了大部分字段的更新
- `currentState` 的特殊处理（opened 状态自动调整过期日和位置）已经存在
- 编辑后需要刷新列表和详情数据
