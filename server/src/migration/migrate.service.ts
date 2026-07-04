// ═══════════════════════════════════════════════════════
// Grocy → HomeHub 迁移引擎
// ═══════════════════════════════════════════════════════

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import { GrocyReader } from './grocy-reader';
import { mapUsers, mapLocations, mapUnits, mapProductGroups, mapShops, mapProductsAndStock, mapStockLog, mapShoppingList, mapRecipes, mapChores } from './grocy-mapper';

export interface MigrationReport {
  success: boolean;
  duration: number;
  summary: {
    users: number; families: number; locations: number; units: number;
    categories: number; shops: number;
    products: number; items: number; batches: number; stockTransactions: number;
    shoppingLists: number; shoppingListItems: number; recipes: number; chores: number;
  };
  warnings: string[];
  errors: string[];
}

export interface MigrationOptions {
  grocyDbPath: string;
  homehubDbPath?: string;
  familyId: number;
  defaultUserId?: number;
  dryRun?: boolean;
  skipUsers?: boolean;
}

export async function migrateFromGrocy(options: MigrationOptions): Promise<MigrationReport> {
  const startTime = Date.now();
  const report: MigrationReport = {
    success: false, duration: 0,
    summary: { users: 0, families: 0, locations: 0, units: 0, categories: 0, shops: 0, products: 0, items: 0, batches: 0, stockTransactions: 0, shoppingLists: 0, shoppingListItems: 0, recipes: 0, chores: 0 },
    warnings: [], errors: [],
  };

  let grocyReader: GrocyReader | null = null;
  let sqlite: Database.Database | null = null;

  try {
    grocyReader = new GrocyReader(options.grocyDbPath);
    console.log(`Grocy 数据库已打开，发现 ${grocyReader.getTableNames().length} 张表`);

    const homehubDbPath = options.homehubDbPath || process.env.SQLITE_DB_PATH || './data/homehub.db';
    sqlite = new Database(homehubDbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite, { schema });

    const familyCheck = sqlite.prepare('SELECT id FROM families WHERE id = ?').get(options.familyId);
    if (!familyCheck) { report.errors.push(`家庭 ID ${options.familyId} 不存在`); report.duration = Date.now() - startTime; return report; }

    // 读取所有数据
    const grocyUsers = grocyReader.getUsers();
    const grocyLocations = grocyReader.getLocations();
    const grocyUnits = grocyReader.getQuantityUnits();
    const grocyProductGroups = grocyReader.getProductGroups();
    const grocyShops = grocyReader.getShops();
    const grocyProducts = grocyReader.getProducts();
    const grocyBarcodes = grocyReader.getProductBarcodes();
    const grocyStock = grocyReader.getStock();
    const grocyStockLog = grocyReader.getStockLog();
    const grocyShoppingListItems = grocyReader.getShoppingListItems();
    const grocyRecipes = grocyReader.getRecipes();
    const grocyRecipePos = grocyReader.getRecipePositions();
    const grocyChores = grocyReader.getChores();

    console.log(`读取完成: ${grocyUsers.length} 用户, ${grocyLocations.length} 位置, ${grocyUnits.length} 单位, ${grocyProductGroups.length} 分类, ${grocyShops.length} 商店, ${grocyProducts.length} 产品, ${grocyStock.length} 库存`);

    const unitMap = new Map<number, string>();
    grocyUnits.forEach(u => unitMap.set(u.id, u.name));
    const productGrocyNameMap = new Map<number, string>();
    grocyProducts.forEach(p => productGrocyNameMap.set(p.id, p.name));
    const shopMap = new Map<number, string>();
    grocyShops.forEach(s => shopMap.set(s.id, s.name));
    const defaultUserId = options.defaultUserId || 1;

    if (options.dryRun) {
      console.log('\n[DRY RUN] 预检结果\n');
      if (!options.skipUsers && grocyUsers.length > 0) { const m = await mapUsers(grocyUsers); report.summary.users = m.items.length; console.log(`  ○ 用户: ${m.items.length}`); }
      if (grocyLocations.length > 0) { const m = mapLocations(grocyLocations, options.familyId); report.summary.locations = m.items.length; console.log(`  ○ 位置: ${m.items.length}`); }
      if (grocyUnits.length > 0) { const m = mapUnits(grocyUnits, options.familyId); report.summary.units = m.items.length; console.log(`  ○ 单位: ${m.items.length}`); }
      if (grocyProductGroups.length > 0) { const m = mapProductGroups(grocyProductGroups, options.familyId); report.summary.categories = m.items.length; console.log(`  ○ 分类: ${m.items.length}`); }
      if (grocyShops.length > 0) { const m = mapShops(grocyShops, options.familyId); report.summary.shops = m.items.length; console.log(`  ○ 商店: ${m.items.length}`); }
      const pResult = mapProductsAndStock(grocyProducts, grocyStock, grocyBarcodes, grocyUnits, grocyLocations, options.familyId, shopMap);
      report.summary.products = pResult.products.length; report.summary.items = pResult.items.length; report.summary.batches = pResult.batches.length;
      console.log(`  ○ 产品: ${pResult.products.length}, 库存: ${pResult.items.length}, 批次: ${pResult.batches.length}`);
      if (grocyStockLog.length > 0) { const pToI = new Map<number, number>(); grocyProducts.forEach((p, i) => pToI.set(p.id, i + 1)); const m = mapStockLog(grocyStockLog, pToI, options.familyId, defaultUserId, unitMap); report.summary.stockTransactions = m.items.length; console.log(`  ○ 流水: ${m.items.length}`); }
      if (grocyShoppingListItems.length > 0) { const r = mapShoppingList(grocyShoppingListItems, productGrocyNameMap, options.familyId, defaultUserId, unitMap); report.summary.shoppingLists = 1; report.summary.shoppingListItems = r.items.length; console.log(`  ○ 购物清单: 1/${r.items.length}`); }
      if (grocyRecipes.length > 0) { const m = mapRecipes(grocyRecipes, grocyRecipePos, productGrocyNameMap, options.familyId, unitMap); report.summary.recipes = m.items.length; console.log(`  ○ 食谱: ${m.items.length}`); }
      if (grocyChores.length > 0) { const r = mapChores(grocyChores, options.familyId, defaultUserId); report.summary.chores = r.lists.length; console.log(`  ○ 家务: ${r.lists.length}`); }
      report.success = true; report.duration = Date.now() - startTime; return report;
    }

    // ── 实际迁移 ──
    if (!options.skipUsers && grocyUsers.length > 0) { const m = await mapUsers(grocyUsers); report.warnings.push(...m.warnings); if (m.items.length > 0) { await db.insert(schema.users).values(m.items); report.summary.users = m.items.length; console.log(`  ✓ 用户: ${m.items.length}`); } }
    if (grocyLocations.length > 0) { const m = mapLocations(grocyLocations, options.familyId); if (m.items.length > 0) { await db.insert(schema.mdLocations).values(m.items); report.summary.locations = m.items.length; console.log(`  ✓ 位置: ${m.items.length}`); } }
    if (grocyUnits.length > 0) { const m = mapUnits(grocyUnits, options.familyId); if (m.items.length > 0) { await db.insert(schema.mdUnits).values(m.items); report.summary.units = m.items.length; console.log(`  ✓ 单位: ${m.items.length}`); } }
    if (grocyProductGroups.length > 0) { const m = mapProductGroups(grocyProductGroups, options.familyId); if (m.items.length > 0) { await db.insert(schema.mdCategories).values(m.items); report.summary.categories = m.items.length; console.log(`  ✓ 分类: ${m.items.length}`); } }
    if (grocyShops.length > 0) { const m = mapShops(grocyShops, options.familyId); if (m.items.length > 0) { await db.insert(schema.mdShops).values(m.items); report.summary.shops = m.items.length; console.log(`  ✓ 商店: ${m.items.length}`); } }

    const pResult = mapProductsAndStock(grocyProducts, grocyStock, grocyBarcodes, grocyUnits, grocyLocations, options.familyId, shopMap);
    report.warnings.push(...pResult.warnings);
    if (pResult.products.length > 0) { await db.insert(schema.invProducts).values(pResult.products); report.summary.products = pResult.products.length; console.log(`  ✓ 产品: ${pResult.products.length}`); }

    const insertedItems: Array<{ id: number; productId: number | null }> = [];
    if (pResult.items.length > 0) { const r = await db.insert(schema.invItems).values(pResult.items).returning(); insertedItems.push(...r); report.summary.items = r.length; console.log(`  ✓ 库存: ${r.length}`); }

    if (pResult.batches.length > 0) {
      const batchesWithRealIds = pResult.batches.map(b => ({ ...b, itemId: insertedItems[b.itemId - 1]?.id ?? b.itemId }));
      await db.insert(schema.invItemBatches).values(batchesWithRealIds); report.summary.batches = batchesWithRealIds.length; console.log(`  ✓ 批次: ${batchesWithRealIds.length}`);
    }

    const productToItemMap = new Map<number, number>();
    for (let i = 0; i < grocyProducts.length; i++) { if (insertedItems[i]) productToItemMap.set(grocyProducts[i].id, insertedItems[i].id); }

    if (grocyStockLog.length > 0) { const m = mapStockLog(grocyStockLog, productToItemMap, options.familyId, defaultUserId, unitMap); report.warnings.push(...m.warnings); if (m.items.length > 0) { await db.insert(schema.invStockTransactions).values(m.items); report.summary.stockTransactions = m.items.length; console.log(`  ✓ 流水: ${m.items.length}`); } }

    if (grocyShoppingListItems.length > 0) {
      const { list, items: listItems, warnings } = mapShoppingList(grocyShoppingListItems, productGrocyNameMap, options.familyId, defaultUserId, unitMap);
      report.warnings.push(...warnings);
      const listResult = await db.insert(schema.hhLists).values(list).returning();
      report.summary.shoppingLists = 1;
      if (listItems.length > 0) { const itemsWithId = listItems.map(item => ({ ...item, listId: listResult[0].id })); await db.insert(schema.hhListItems).values(itemsWithId); report.summary.shoppingListItems = itemsWithId.length; }
      console.log(`  ✓ 购物清单: 1/${report.summary.shoppingListItems}`);
    }

    if (grocyRecipes.length > 0) { const m = mapRecipes(grocyRecipes, grocyRecipePos, productGrocyNameMap, options.familyId, unitMap); report.warnings.push(...m.warnings); if (m.items.length > 0) { await db.insert(schema.hhRecipes).values(m.items); report.summary.recipes = m.items.length; console.log(`  ✓ 食谱: ${m.items.length}`); } }

    if (grocyChores.length > 0) {
      const { lists, items: choreItems, warnings } = mapChores(grocyChores, options.familyId, defaultUserId);
      report.warnings.push(...warnings);
      for (let i = 0; i < lists.length; i++) { const lr = await db.insert(schema.hhLists).values(lists[i]).returning(); await db.insert(schema.hhListItems).values({ ...choreItems[i], listId: lr[0].id }); }
      report.summary.chores = lists.length; console.log(`  ✓ 家务: ${lists.length}`);
    }

    report.success = report.errors.length === 0;
    report.duration = Date.now() - startTime;
    console.log(`\n迁移完成 (${report.duration}ms)`);
    return report;
  } catch (error: any) {
    report.success = false; report.duration = Date.now() - startTime;
    report.errors.push(`迁移失败: ${error.message}`);
    console.error(`迁移失败: ${error.message}`);
    return report;
  } finally {
    try { grocyReader?.close(); } catch { /* ignore */ }
    try { sqlite?.close(); } catch { /* ignore */ }
  }
}
