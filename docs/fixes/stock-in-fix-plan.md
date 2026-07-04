# 入库功能修复与增强方案

> 日期：2026-07-04 | 涉及：Server + Client

---

## 目录

- [一、Bug 修复：单位换算下的数量错误](#一bug-修复单位换算下的数量错误)
- [二、Schema 扩展：产品规格字段](#二schema-扩展产品规格字段)
- [三、后端增强：交易记录写入规格 + 价格历史重构](#三后端增强交易记录写入规格--价格历史重构)
- [四、前端增强：入库表单增加规格/商店输入](#四前端增强入库表单增加规格商店输入)
- [五、前端增强：价格历史图表按商店+规格分组](#五前端增强价格历史图表按商店规格分组)
- [六、迁移 SQL](#六迁移-sql)
- [七、改动清单与影响范围](#七改动清单与影响范围)

---

## 一、Bug 修复：单位换算下的数量错误

### Bug 1 — 交易记录 quantity 未用换算值

**位置**：`server/src/modules/stock/stock.service.ts:357`

**当前**：
```typescript
quantity: dto.quantity,   // ← BUG：采购数量，非库存数量
```

**修复**：
```typescript
quantity: stockQuantity,  // ✓ 使用转换后的库存数量
```

### Bug 2 — 均价计算分母/总值使用采购数量

**位置**：`stock.service.ts:342,345`

**当前**（第 2 次读取时行号略有偏移，变量名已确认）：
```typescript
const totalQuantity = item.quantity + dto.quantity;      // ← BUG
const newTotalValue = dto.quantity * dto.price;          // ← BUG
```

**修复**：
```typescript
const totalQuantity = item.quantity + stockQuantity;     // ✓
const newTotalValue = stockQuantity * dto.price;         // ✓
```

**影响**：买 2 箱（每箱 6 瓶，price=¥30/箱），`stockQuantity=12`,
- 旧：`totalQuantity = item.qty + 2`, `newTotalValue = 2 × 30 = 60`, avgPrice = 60/... → 均价偏高
- 新：`totalQuantity = item.qty + 12`, `newTotalValue = 12 × 30 = 360`, avgPrice = 360/12 = ¥30/瓶 ✓

---

## 二、Schema 扩展：产品规格字段

### 2.1 产品表 `inv_products` 加规格字段

```typescript
// server/src/db/schema/inventory.ts — invProducts 表
spec: text('spec'),             // 规格描述，e.g. "330ml", "10kg", "500ml×12", "3层200抽×10包"
```

用途：存储产品的规格文本。自由文本，前端直接展示，不参与计算。

### 2.2 交易记录表 `inv_stock_transactions` 加规格字段

```typescript
// server/src/db/schema/inventory.ts — invStockTransactions 表
spec: text('spec'),             // 入库时的产品规格（从产品复制，快照）
```

用途：价格历史按规格分组。同一产品不同规格（如 330ml vs 500ml）价格不同，需区分。

### 2.3 数据流

```
产品创建/编辑 → 填写 "330ml"
      ↓
入库时 → 从 product.spec 自动填充到 transaction.spec
      ↓
价格历史 → 按 store + spec 分组展示
```

---

## 三、后端增强：交易记录写入规格 + 价格历史重构

### 3.1 stockIn() — 写入 spec

**位置**：`stock.service.ts` 的 `stockIn` 方法

在插入 `invStockTransactions` 时增加 `spec`：

```typescript
tx.insert(invStockTransactions).values({
  // ... 现有字段 ...
  quantity: stockQuantity,  // ← Bug 1 修复
  unit: product?.stockUnit || item.unit,  // ← 注意：如果用 stockUnit，此处改为 stockUnit
  shop: dto.shop ?? item.shop ?? null,    // ← 新增：优先 dto.shop，其次 item.shop
  spec: product?.spec ?? null,            // ← 新增：从产品取规格快照
}).run();
```

### 3.2 getPriceHistory() — 返回 spec 字段

**位置**：`stock.service.ts:450-481`

```typescript
return {
  // ... 现有字段 ...
  history: transactions.map(t => ({
    date: t.createdAt,
    price: t.price,
    quantity: t.quantity,
    unit: t.unit,
    note: t.note,
    store: t.shop,           // 直接返回原始值，前端控制显示
    spec: t.spec,            // ← 新增
  })),
};
```

### 3.3 PriceStoredProcedure 同步

如果其他模块（如 MCP）也调用 getPriceHistory，自动受益。

---

## 四、前端增强：入库表单增加规格/商店输入

### 4.1 ItemDetail.vue — 详细入库弹窗

**位置**：`client/src/views/stock/ItemDetail.vue`

当前弹窗只有 数量 + 备注。新增：

```vue
<!-- 入库 Modal — 现有弹窗增强 -->
<n-form-item label="规格">
  <n-input :value="productSpec" disabled placeholder="从产品自动获取" />
</n-form-item>
<n-form-item label="商店">
  <n-select v-model:value="stockInShop"
    :options="shopOptions"     <!-- 从历史商店自动补全 -->
    filterable
    tag                          <!-- 允许输入新值 -->
    clearable
    placeholder="购买商店" />
</n-form-item>
<n-form-item label="单价 (¥)">
  <n-input-number v-model:value="stockInPrice" :min="0" placeholder="单价" />
</n-form-item>
<n-form-item label="批次号">
  <n-input v-model:value="stockInBatchNo" placeholder="如有批次号请填写" />
</n-form-item>
<n-form-item label="生产日期">
  <n-date-picker v-model:value="stockInPurchaseDate" type="date" />
</n-form-item>
<n-form-item label="过期日期">
  <n-date-picker v-model:value="stockInExpiryDate" type="date" />
</n-form-item>
```

调用时传递所有字段：
```typescript
await stockApi.stockIn(item.value.id, {
  quantity: stockInQuantity.value,
  price: stockInPrice.value || undefined,
  shop: stockInShop.value || undefined,
  batchNumber: stockInBatchNo.value || undefined,
  purchaseDate: stockInPurchaseDate.value,
  expiryDate: stockInExpiryDate.value,
  note: stockInNote.value || undefined,
});
```

### 4.2 StockList.vue — 快速入库弹窗

**位置**：`client/src/views/stock/StockList.vue:633-648`

当前只有 数量。新增 商店 + 单价：

```vue
<n-form-item label="数量">
  <n-input-number v-model:value="inlineStockInQty" :min="0.01" />
</n-form-item>
<n-form-item label="商店">
  <n-input v-model:value="inlineStockInShop" placeholder="购买商店（可选）" />
</n-form-item>
<n-form-item label="单价 (¥)">
  <n-input-number v-model:value="inlineStockInPrice" :min="0" placeholder="可选" />
</n-form-item>
```

### 4.3 商店自动补全来源

从当前物品的历史交易记录中提取已有商店列表：

```typescript
// 当前物品的 shopOptions — 从价格历史提取
const shopOptions = computed(() => {
  if (!priceHistory.value?.history) return [];
  const shops = new Set<string>();
  priceHistory.value.history.forEach((r: any) => {
    if (r.store) shops.add(r.store);
  });
  return Array.from(shops).map(s => ({ label: s, value: s }));
});
```

### 4.4 shop 回退逻辑修复

**位置**：`stock.service.ts` — `stockIn()` 方法

```typescript
shop: dto.shop ?? item.shop ?? null,
// 逻辑：dto.shop（表单传入）> item.shop（物品默认商店）> null
```

这样即使快速入库不填商店，也会自动用物品的默认商店：

---

## 五、前端增强：价格历史图表按商店+规格分组

### 5.1 storeColors 计算优化

**位置**：`client/src/components/ItemDetailModal.vue:476-484`

当前按 `store` 分组。改为按 `store + spec` 复合分组：

```typescript
const storeColors = computed(() => {
  if (!priceHistory.value?.history) return [];
  const groups = new Set<string>();
  priceHistory.value.history.forEach((r: any) => {
    const key = r.spec ? `${r.store} (${r.spec})` : r.store || '未指定';
    groups.add(key);
  });
  return Array.from(groups).map((name, idx) => ({
    name,
    color: storeColorPalette[idx % storeColorPalette.length],
  }));
});
```

`storeData` 分组也同步改为用 `r.store + r.spec` 作为 key。

### 5.2 空 shop 的展示

原始值 `null` → 前端显示 `"未指定"`（仅当确实没有商店信息时），避免所有记录都显示"未知"。

### 5.3 价格概览卡片样式

保持现有 `price-overview` 布局不变，只修改 store 的分组逻辑。

---

## 六、迁移 SQL

### 6.1 产品表加列

```sql
ALTER TABLE `inv_products` ADD COLUMN `spec` text;
```

### 6.2 交易记录表加列

```sql
ALTER TABLE `inv_stock_transactions` ADD COLUMN `spec` text;
```

### 6.3 迁移文件

创建 `server/src/db/migrations/0015_product_spec.sql`：

```sql
ALTER TABLE `inv_products` ADD COLUMN `spec` text;
ALTER TABLE `inv_stock_transactions` ADD COLUMN `spec` text;
```

更新 `meta/_journal.json` 追加一条 entry。

---

## 七、改动清单与影响范围

### 后端改动

| 文件 | 改动 | 行号 |
|------|------|------|
| `server/src/db/schema/inventory.ts` | `invProducts` 加 `spec` 列 | ~13 |
| `server/src/db/schema/inventory.ts` | `invStockTransactions` 加 `spec` 列 | ~107 |
| `server/src/db/migrations/0015_product_spec.sql` | 新建迁移文件 | — |
| `server/src/db/migrations/meta/_journal.json` | 追加迁移条目 | — |
| `server/src/modules/stock/stock.service.ts` | Bug 1: `dto.quantity` → `stockQuantity` | 357 |
| `server/src/modules/stock/stock.service.ts` | Bug 2a: `dto.quantity` → `stockQuantity` | 342 |
| `server/src/modules/stock/stock.service.ts` | Bug 2b: `dto.quantity` → `stockQuantity` | 345 |
| `server/src/modules/stock/stock.service.ts` | 写入 `spec` + `shop` 回退逻辑 | ~364 |
| `server/src/modules/stock/stock.service.ts` | `getPriceHistory` 返回 `spec` 字段 | ~464-471 |
| `server/src/modules/stock/stock.controller.ts` | 可能不需要改 | — |

### 前端改动

| 文件 | 改动 |
|------|------|
| `client/src/views/stock/ItemDetail.vue` | 入库弹窗增加 规格显示/商店/单价/批次/日期 |
| `client/src/views/stock/StockList.vue` | 快速入库弹窗增加 商店/单价 |
| `client/src/components/ItemDetailModal.vue` | storeColors 分组改为 store+spec 复合 |

### 无影响模块

- Auth / Users / Families — 无变化
- Dashboard — 可能用到价格历史，自动受益
- MCP — 自动受益（MCP 调用的是 REST API）
- 条码扫描入库 — API 相同，表单改了即可
- 导出/导入 CSV — 如果后续需要规格字段，可后补

### 数据库

- 两个 `ALTER TABLE`，向前兼容
- 已有数据不受影响，spec 列初始为 null