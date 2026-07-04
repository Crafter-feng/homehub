// ═══════════════════════════════════════════════════════
// Grocy → HomeHub 数据映射器
// ═══════════════════════════════════════════════════════

import * as bcrypt from 'bcryptjs';
import type {
  GrocyUser,
  GrocyLocation,
  GrocyQuantityUnit,
  GrocyProduct,
  GrocyStock,
  GrocyStockLog,
  GrocyShoppingListItem,
  GrocyRecipe,
  GrocyRecipePosition,
  GrocyChore,
} from './grocy-reader';

// ── HomeHub 插入类型 ──

export interface HhUserInsert {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HhFamilyInsert {
  name: string;
  inviteCode: string;
  createdAt: Date;
}

export interface HhFamilyMemberInsert {
  userId: number;
  familyId: number;
  role: 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
}

export interface HhLocationInsert {
  familyId: number;
  name: string;
  parentId: number | null;
  level: number;
  notes: string | null;
  sortOrder: number;
  createdAt: Date;
}

export interface HhUnitInsert {
  familyId: number;
  name: string;
  parentId: number | null;
  conversionFactor: number;
  notes: string | null;
  createdAt: Date;
}

export interface HhProductInsert {
  familyId: number;
  name: string;
  barcode: string | null;
  categoryId: number | null;
  unit: string;
  brand: string | null;
  defaultPrice: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HhItemInsert {
  familyId: number;
  productId: number | null;
  name: string;
  type: string;
  barcode: string | null;
  categoryId: number | null;
  locationId: number | null;
  quantity: number;
  unit: string;
  minStock: number;
  brand: string | null;
  notes: string | null;
  expiryDate: Date | null;
  purchaseDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HhBatchInsert {
  itemId: number;
  batchNumber: string | null;
  quantity: number;
  unit: string;
  purchaseDate: Date | null;
  expiryDate: Date | null;
  locationId: number | null;
  createdAt: Date;
}

export interface HhStockTxInsert {
  itemId: number;
  batchId: number | null;
  type: 'add' | 'consume' | 'transfer' | 'adjust';
  quantity: number;
  unit: string;
  fromLocationId: number | null;
  toLocationId: number | null;
  userId: number;
  source: 'manual' | 'barcode' | 'nfc' | 'rfid' | 'voice' | 'vision' | 'mcp';
  note: string | null;
  createdAt: Date;
}

export interface HhListInsert {
  familyId: number;
  name: string;
  type: 'shopping' | 'todo' | 'chore' | 'holiday' | 'meal_plan';
  notes: string | null;
  config: Record<string, unknown> | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HhListItemInsert {
  listId: number;
  content: string;
  notes: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  completedBy: number | null;
  completedAt: Date | null;
  assigneeId: number | null;
  quantity: number | null;
  unit: string | null;
  linkedItemId: number | null;
  dueAt: Date | null;
  lastResetAt: Date | null;
  sortOrder: number;
  createdAt: Date;
}

export interface HhRecipeInsert {
  familyId: number;
  name: string;
  description: string | null;
  notes: string | null;
  ingredients: Array<{ itemName: string; quantity: number; unit: string; optional?: boolean }>;
  steps: Array<{ stepNumber: number; instruction: string; duration?: string }>;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  image: string | null;
  source: string | null;
  createdAt: Date;
}

// ── 映射结果 ──

export interface MapResult<T> {
  items: T[];
  warnings: string[];
}

// ── 工具函数 ──

const GROCY_DEFAULT_PASSWORD = 'grocy-migrated-123';

function parseGrocyTimestamp(ts: string): Date {
  if (!ts) return new Date();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr || dateStr === '0000-00-00' || dateStr === '') return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function mapStockTxType(grocyType: string): 'add' | 'consume' | 'transfer' | 'adjust' {
  switch (grocyType) {
    case 'purchase':
    case 'stock-added':
      return 'add';
    case 'consume':
    case 'stock-used':
      return 'consume';
    case 'inventory-adj':
    case 'stock-adjusted':
      return 'adjust';
    case 'transfer':
      return 'transfer';
    default:
      return 'adjust';
  }
}

// ── 映射函数 ──

export async function mapUsers(users: GrocyUser[]): Promise<MapResult<HhUserInsert>> {
  const warnings: string[] = [];
  const passwordHash = await bcrypt.hash(GROCY_DEFAULT_PASSWORD, 10);

  if (users.length === 0) {
    warnings.push('Grocy 中没有用户，将跳过用户迁移');
  }

  const items: HhUserInsert[] = users.map((u) => ({
    email: u.username?.includes('@') ? u.username : `${u.username || 'user'}@grocy.local`,
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Grocy User',
    passwordHash,
    createdAt: parseGrocyTimestamp(u.row_created_timestamp),
    updatedAt: new Date(),
  }));

  return { items, warnings };
}

export function mapLocations(
  locations: GrocyLocation[],
  familyId: number,
): MapResult<HhLocationInsert> {
  const items: HhLocationInsert[] = locations.map((loc, idx) => ({
    familyId,
    name: loc.name,
    parentId: null,
    level: 1,
    notes: loc.description || null,
    sortOrder: idx,
    createdAt: parseGrocyTimestamp(loc.row_created_timestamp),
  }));
  return { items, warnings: [] };
}

export function mapUnits(
  units: GrocyQuantityUnit[],
  familyId: number,
): MapResult<HhUnitInsert> {
  const items: HhUnitInsert[] = units.map((u) => ({
    familyId,
    name: u.name,
    parentId: null,
    conversionFactor: 1,
    notes: u.description || null,
    createdAt: parseGrocyTimestamp(u.row_created_timestamp),
  }));
  return { items, warnings: [] };
}

export function mapProductsAndStock(
  products: GrocyProduct[],
  stockEntries: GrocyStock[],
  units: GrocyQuantityUnit[],
  locations: GrocyLocation[],
  familyId: number,
): {
  products: HhProductInsert[];
  items: HhItemInsert[];
  batches: HhBatchInsert[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const productItems: HhProductInsert[] = [];
  const invItems: HhItemInsert[] = [];
  const batches: HhBatchInsert[] = [];

  const unitMap = new Map<number, string>();
  units.forEach((u) => unitMap.set(u.id, u.name));

  const locationMap = new Map<number, number>();
  locations.forEach((loc, idx) => locationMap.set(loc.id, idx + 1));

  const stockByProduct = new Map<number, GrocyStock[]>();
  for (const s of stockEntries) {
    const arr = stockByProduct.get(s.product_id) || [];
    arr.push(s);
    stockByProduct.set(s.product_id, arr);
  }

  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    const hhProductId = idx + 1;

    productItems.push({
      familyId,
      name: p.name,
      barcode: p.barcode || null,
      categoryId: null,
      unit: unitMap.get(p.qu_id_stock) || '个',
      brand: null,
      defaultPrice: null,
      notes: p.description || null,
      createdAt: parseGrocyTimestamp(p.row_created_timestamp),
      updatedAt: new Date(),
    });

    const productStock = stockByProduct.get(p.id) || [];
    const totalQuantity = productStock.reduce((sum, s) => sum + s.amount, 0);

    if (productStock.length > 0) {
      const primaryStock = productStock[0];
      const itemId = invItems.length + 1;

      invItems.push({
        familyId,
        productId: hhProductId,
        name: p.name,
        type: 'generic',
        barcode: p.barcode || null,
        categoryId: null,
        locationId: locationMap.get(p.location_id) || null,
        quantity: totalQuantity,
        unit: unitMap.get(p.qu_id_stock) || '个',
        minStock: p.min_stock_amount || 0,
        brand: null,
        notes: p.description || null,
        expiryDate: parseDate(primaryStock.best_before_date),
        purchaseDate: parseDate(primaryStock.purchased_date),
        createdAt: parseGrocyTimestamp(p.row_created_timestamp),
        updatedAt: new Date(),
      });

      for (const s of productStock) {
        batches.push({
          itemId,
          batchNumber: s.stock_id || null,
          quantity: s.amount,
          unit: unitMap.get(p.qu_id_stock) || '个',
          purchaseDate: parseDate(s.purchased_date),
          expiryDate: parseDate(s.best_before_date),
          locationId: locationMap.get(p.location_id) || null,
          createdAt: parseGrocyTimestamp(s.row_created_timestamp),
        });
      }
    } else {
      invItems.push({
        familyId,
        productId: hhProductId,
        name: p.name,
        type: 'generic',
        barcode: p.barcode || null,
        categoryId: null,
        locationId: locationMap.get(p.location_id) || null,
        quantity: 0,
        unit: unitMap.get(p.qu_id_stock) || '个',
        minStock: p.min_stock_amount || 0,
        brand: null,
        notes: p.description || null,
        expiryDate: null,
        purchaseDate: null,
        createdAt: parseGrocyTimestamp(p.row_created_timestamp),
        updatedAt: new Date(),
      });
    }
  }

  if (products.length === 0) warnings.push('Grocy 中没有产品');
  return { products: productItems, items: invItems, batches, warnings };
}

export function mapStockLog(
  stockLogs: GrocyStockLog[],
  productToItemMap: Map<number, number>,
  familyId: number,
  defaultUserId: number,
): MapResult<HhStockTxInsert> {
  const warnings: string[] = [];
  const items: HhStockTxInsert[] = [];

  for (const log of stockLogs) {
    const itemId = productToItemMap.get(log.product_id);
    if (itemId === undefined) {
      warnings.push(`stock_log product_id=${log.product_id} 未找到对应 item，已跳过`);
      continue;
    }
    items.push({
      itemId,
      batchId: null,
      type: mapStockTxType(log.transaction_type),
      quantity: Math.abs(log.amount),
      unit: '个',
      fromLocationId: null,
      toLocationId: null,
      userId: defaultUserId,
      source: 'manual',
      note: log.transaction_type,
      createdAt: parseGrocyTimestamp(log.row_created_timestamp),
    });
  }
  return { items, warnings };
}

export function mapShoppingList(
  listItems: GrocyShoppingListItem[],
  productMap: Map<number, string>,
  familyId: number,
  defaultUserId: number,
): { list: HhListInsert; items: HhListItemInsert[]; warnings: string[] } {
  const warnings: string[] = [];
  const items: HhListItemInsert[] = [];

  const list: HhListInsert = {
    familyId,
    name: 'Grocy 购物清单',
    type: 'shopping',
    notes: '从 Grocy 迁移的购物清单',
    config: null,
    createdBy: defaultUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  for (let idx = 0; idx < listItems.length; idx++) {
    const sl = listItems[idx];
    items.push({
      listId: 0,
      content: productMap.get(sl.product_id) || `产品 #${sl.product_id}`,
      notes: null,
      status: 'pending',
      completedBy: null,
      completedAt: null,
      assigneeId: null,
      quantity: sl.amount || 1,
      unit: null,
      linkedItemId: null,
      dueAt: null,
      lastResetAt: null,
      sortOrder: idx,
      createdAt: parseGrocyTimestamp(sl.row_created_timestamp),
    });
  }

  if (listItems.length === 0) warnings.push('Grocy 购物清单为空');
  return { list, items, warnings };
}

export function mapRecipes(
  recipes: GrocyRecipe[],
  positions: GrocyRecipePosition[],
  productMap: Map<number, string>,
  familyId: number,
): MapResult<HhRecipeInsert> {
  const warnings: string[] = [];
  const items: HhRecipeInsert[] = [];

  const posByRecipe = new Map<number, GrocyRecipePosition[]>();
  for (const pos of positions) {
    const arr = posByRecipe.get(pos.recipe_id) || [];
    arr.push(pos);
    posByRecipe.set(pos.recipe_id, arr);
  }

  for (const r of recipes) {
    const recipePositions = posByRecipe.get(r.id) || [];
    const ingredients = recipePositions.map((pos) => ({
      itemName: productMap.get(pos.product_id) || `产品 #${pos.product_id}`,
      quantity: pos.amount || 1,
      unit: '个',
      optional: false,
    }));

    const steps = r.description
      ? [{ stepNumber: 1, instruction: r.description }]
      : [{ stepNumber: 1, instruction: '请参见原始食谱' }];

    items.push({
      familyId,
      name: r.name,
      description: r.description || null,
      notes: null,
      ingredients,
      steps,
      prepTime: r.prep_time_minutes || null,
      cookTime: r.cook_time_minutes || null,
      servings: r.base_servings || null,
      image: r.image || null,
      source: 'grocy_import',
      createdAt: parseGrocyTimestamp(r.row_created_timestamp),
    });
  }

  if (recipes.length === 0) warnings.push('Grocy 中没有食谱');
  return { items, warnings };
}

export function mapChores(
  chores: GrocyChore[],
  familyId: number,
  defaultUserId: number,
): { lists: HhListInsert[]; items: HhListItemInsert[]; warnings: string[] } {
  const warnings: string[] = [];
  const lists: HhListInsert[] = [];
  const items: HhListItemInsert[] = [];

  for (let idx = 0; idx < chores.length; idx++) {
    const chore = chores[idx];

    let autoReset: string | undefined;
    let autoResetDays: number | undefined;

    switch (chore.period_type) {
      case 'daily':
        autoReset = 'daily';
        autoResetDays = 1;
        break;
      case 'weekly':
        autoReset = 'weekly';
        autoResetDays = 7;
        break;
      case 'monthly':
        autoReset = 'monthly';
        autoResetDays = 30;
        break;
      case 'dynamic-regular':
        autoReset = 'interval';
        autoResetDays = chore.period_days || undefined;
        break;
      default:
        break;
    }

    lists.push({
      familyId,
      name: chore.name,
      type: 'chore',
      notes: chore.description || null,
      config: autoReset ? { autoReset, autoResetDays } : null,
      createdBy: defaultUserId,
      createdAt: parseGrocyTimestamp(chore.row_created_timestamp),
      updatedAt: new Date(),
    });

    items.push({
      listId: 0,
      content: chore.name,
      notes: chore.description || null,
      status: 'pending',
      completedBy: null,
      completedAt: null,
      assigneeId: null,
      quantity: null,
      unit: null,
      linkedItemId: null,
      dueAt: null,
      lastResetAt: null,
      sortOrder: 0,
      createdAt: parseGrocyTimestamp(chore.row_created_timestamp),
    });
  }

  if (chores.length === 0) warnings.push('Grocy 中没有家务');
  return { lists, items, warnings };
}
