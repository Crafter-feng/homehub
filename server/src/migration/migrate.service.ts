// ═══════════════════════════════════════════════════════
// Grocy → HomeHub 迁移引擎
// ═══════════════════════════════════════════════════════

import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import { GrocyReader } from './grocy-reader';
import {
  mapUsers,
  mapLocations,
  mapUnits,
  mapProductsAndStock,
  mapStockLog,
  mapShoppingList,
  mapRecipes,
  mapChores,
} from './grocy-mapper';
import type {
  HhUserInsert,
  HhFamilyInsert,
  HhFamilyMemberInsert,
  HhLocationInsert,
  HhUnitInsert,
  HhProductInsert,
  HhItemInsert,
  HhBatchInsert,
  HhStockTxInsert,
  HhListInsert,
  HhListItemInsert,
  HhRecipeInsert,
} from './grocy-mapper';

// ── 迁移报告 ──

export interface MigrationReport {
  success: boolean;
  duration: number; // ms
  summary: {
    users: number;
    families: number;
    locations: number;
    units: number;
    products: number;
    items: number;
    batches: number;
    stockTransactions: number;
    shoppingLists: number;
    shoppingListItems: number;
    recipes: number;
    chores: number;
  };
  warnings: string[];
  errors: string[];
}

// ── 迁移选项 ──

export interface MigrationOptions {
  /** Grocy SQLite 文件路径 */
  grocyDbPath: string;
  /** HomeHub SQLite 文件路径（如果使用 SQLite） */
  homehubDbPath?: string;
  /** 家庭 ID（默认 1） */
  familyId: number;
  /** 默认用户 ID（用于关联数据） */
  defaultUserId?: number;
  /** 是否只做预检不写入 */
  dryRun?: boolean;
  /** 是否跳过用户迁移 */
  skipUsers?: boolean;
}

// ── 迁移引擎 ──

export async function migrateFromGrocy(options: MigrationOptions): Promise<MigrationReport> {
  const startTime = Date.now();
  const report: MigrationReport = {
    success: false,
    duration: 0,
    summary: {
      users: 0,
      families: 0,
      locations: 0,
      units: 0,
      products: 0,
      items: 0,
      batches: 0,
      stockTransactions: 0,
      shoppingLists: 0,
      shoppingListItems: 0,
      recipes: 0,
      chores: 0,
    },
    warnings: [],
    errors: [],
  };

  let grocyReader: GrocyReader | null = null;

  try {
    // 1. 打开 Grocy 数据库（只读）
    grocyReader = new GrocyReader(options.grocyDbPath);
    const tableNames = grocyReader.getTableNames();
    console.log(`Grocy 数据库已打开，发现 ${tableNames.length} 张表: ${tableNames.join(', ')}`);

    // 2. 打开 HomeHub 数据库
    const homehubDbPath = options.homehubDbPath || process.env.SQLITE_DB_PATH || './data/homehub.db';
    const BetterSqlite3 = require('better-sqlite3');
    const sqlite = new BetterSqlite3(homehubDbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite, { schema });

    // 3. 读取 Grocy 数据
    console.log('正在读取 Grocy 数据...');
    const grocyUsers = grocyReader.getUsers();
    const grocyLocations = grocyReader.getLocations();
    const grocyUnits = grocyReader.getQuantityUnits();
    const grocyProducts = grocyReader.getProducts();
    const grocyStock = grocyReader.getStock();
    const grocyStockLog = grocyReader.getStockLog();
    const grocyShoppingList = grocyReader.getShoppingList();
    const grocyRecipes = grocyReader.getRecipes();
    const grocyRecipePos = grocyReader.getRecipePositions();
    const grocyChores = grocyReader.getChores();

    console.log(`读取完成: ${grocyUsers.length} 用户, ${grocyLocations.length} 位置, ` +
      `${grocyUnits.length} 单位, ${grocyProducts.length} 产品, ${grocyStock.length} 库存条目`);

    if (options.dryRun) {
      console.log('\n[DRY RUN] 以下为预检结果，不会写入数据库\n');
    }

    // 4. 按依赖顺序映射并写入
    const defaultUserId = options.defaultUserId || 1;

    // 4.1 用户
    if (!options.skipUsers && grocyUsers.length > 0) {
      const mapped = await mapUsers(grocyUsers);
      report.warnings.push(...mapped.warnings);
      if (!options.dryRun && mapped.items.length > 0) {
        try {
          await db.insert(schema.users).values(mapped.items);
          report.summary.users = mapped.items.length;
          console.log(`  ✓ 用户: ${mapped.items.length} 条`);
        } catch (e: any) {
          report.errors.push(`用户迁移失败: ${e.message}`);
          console.error(`  ✗ 用户迁移失败: ${e.message}`);
        }
      } else {
        report.summary.users = mapped.items.length;
        console.log(`  ○ 用户: ${mapped.items.length} 条 (dry run)`);
      }
    }

    // 4.2 位置
    if (grocyLocations.length > 0) {
      const mapped = mapLocations(grocyLocations, options.familyId);
      report.warnings.push(...mapped.warnings);
      if (!options.dryRun && mapped.items.length > 0) {
        try {
          await db.insert(schema.mdLocations).values(mapped.items);
          report.summary.locations = mapped.items.length;
          console.log(`  ✓ 位置: ${mapped.items.length} 条`);
        } catch (e: any) {
          report.errors.push(`位置迁移失败: ${e.message}`);
          console.error(`  ✗ 位置迁移失败: ${e.message}`);
        }
      } else {
        report.summary.locations = mapped.items.length;
        console.log(`  ○ 位置: ${mapped.items.length} 条 (dry run)`);
      }
    }

    // 4.3 计量单位
    if (grocyUnits.length > 0) {
      const mapped = mapUnits(grocyUnits, options.familyId);
      report.warnings.push(...mapped.warnings);
      if (!options.dryRun && mapped.items.length > 0) {
        try {
          await db.insert(schema.mdUnits).values(mapped.items);
          report.summary.units = mapped.items.length;
          console.log(`  ✓ 计量单位: ${mapped.items.length} 条`);
        } catch (e: any) {
          report.errors.push(`计量单位迁移失败: ${e.message}`);
          console.error(`  ✗ 计量单位迁移失败: ${e.message}`);
        }
      } else {
        report.summary.units = mapped.items.length;
        console.log(`  ○ 计量单位: ${mapped.items.length} 条 (dry run)`);
      }
    }

    // 4.4 产品 + 库存条目 + 批次
    const productMap = mapProductsAndStock(
      grocyProducts, grocyStock, grocyUnits, grocyLocations, options.familyId,
    );
    report.warnings.push(...productMap.warnings);

    if (!options.dryRun) {
      // 产品
      if (productMap.products.length > 0) {
        try {
          await db.insert(schema.invProducts).values(productMap.products);
          report.summary.products = productMap.products.length;
          console.log(`  ✓ 产品: ${productMap.products.length} 条`);
        } catch (e: any) {
          report.errors.push(`产品迁移失败: ${e.message}`);
          console.error(`  ✗ 产品迁移失败: ${e.message}`);
        }
      }

      // 库存条目
      if (productMap.items.length > 0) {
        try {
          await db.insert(schema.invItems).values(productMap.items);
          report.summary.items = productMap.items.length;
          console.log(`  ✓ 库存条目: ${productMap.items.length} 条`);
        } catch (e: any) {
          report.errors.push(`库存条目迁移失败: ${e.message}`);
          console.error(`  ✗ 库存条目迁移失败: ${e.message}`);
        }
      }

      // 批次
      if (productMap.batches.length > 0) {
        try {
          await db.insert(schema.invItemBatches).values(productMap.batches);
          report.summary.batches = productMap.batches.length;
          console.log(`  ✓ 批次: ${productMap.batches.length} 条`);
        } catch (e: any) {
          report.errors.push(`批次迁移失败: ${e.message}`);
          console.error(`  ✗ 批次迁移失败: ${e.message}`);
        }
      }
    } else {
      report.summary.products = productMap.products.length;
      report.summary.items = productMap.items.length;
      report.summary.batches = productMap.batches.length;
      console.log(`  ○ 产品: ${productMap.products.length} 条, ` +
        `库存条目: ${productMap.items.length} 条, ` +
        `批次: ${productMap.batches.length} 条 (dry run)`);
    }

    // 4.5 库存流水
    // 建立 Grocy product_id → HomeHub item_id 的映射
    const productToItemMap = new Map<number, number>();
    for (let i = 0; i < grocyProducts.length; i++) {
      productToItemMap.set(grocyProducts[i].id, i + 1); // 1-based
    }

    if (grocyStockLog.length > 0) {
      const mapped = mapStockLog(grocyStockLog, productToItemMap, options.familyId, defaultUserId);
      report.warnings.push(...mapped.warnings);
      if (!options.dryRun && mapped.items.length > 0) {
        try {
          await db.insert(schema.invStockTransactions).values(mapped.items);
          report.summary.stockTransactions = mapped.items.length;
          console.log(`  ✓ 库存流水: ${mapped.items.length} 条`);
        } catch (e: any) {
          report.errors.push(`库存流水迁移失败: ${e.message}`);
          console.error(`  ✗ 库存流水迁移失败: ${e.message}`);
        }
      } else {
        report.summary.stockTransactions = mapped.items.length;
        console.log(`  ○ 库存流水: ${mapped.items.length} 条 (dry run)`);
      }
    }

    // 4.6 购物清单
    const productGrocyNameMap = new Map<number, string>();
    for (const p of grocyProducts) {
      productGrocyNameMap.set(p.id, p.name);
    }

    if (grocyShoppingList.length > 0) {
      const { list, items: listItems, warnings } = mapShoppingList(
        grocyShoppingList, productGrocyNameMap, options.familyId, defaultUserId,
      );
      report.warnings.push(...warnings);

      if (!options.dryRun) {
        try {
          // 插入列表
          const listResult = await db.insert(schema.hhLists).values(list).returning();
          const listId = listResult[0].id;
          report.summary.shoppingLists = 1;

          // 插入列表条目（更新 listId）
          const itemsWithListId = listItems.map((item) => ({ ...item, listId }));
          if (itemsWithListId.length > 0) {
            await db.insert(schema.hhListItems).values(itemsWithListId);
            report.summary.shoppingListItems = itemsWithListId.length;
          }
          console.log(`  ✓ 购物清单: 1 列表, ${itemsWithListId.length} 条目`);
        } catch (e: any) {
          report.errors.push(`购物清单迁移失败: ${e.message}`);
          console.error(`  ✗ 购物清单迁移失败: ${e.message}`);
        }
      } else {
        report.summary.shoppingLists = 1;
        report.summary.shoppingListItems = listItems.length;
        console.log(`  ○ 购物清单: 1 列表, ${listItems.length} 条目 (dry run)`);
      }
    }

    // 4.7 食谱
    if (grocyRecipes.length > 0) {
      const mapped = mapRecipes(grocyRecipes, grocyRecipePos, productGrocyNameMap, options.familyId);
      report.warnings.push(...mapped.warnings);
      if (!options.dryRun && mapped.items.length > 0) {
        try {
          await db.insert(schema.hhRecipes).values(mapped.items);
          report.summary.recipes = mapped.items.length;
          console.log(`  ✓ 食谱: ${mapped.items.length} 条`);
        } catch (e: any) {
          report.errors.push(`食谱迁移失败: ${e.message}`);
          console.error(`  ✗ 食谱迁移失败: ${e.message}`);
        }
      } else {
        report.summary.recipes = mapped.items.length;
        console.log(`  ○ 食谱: ${mapped.items.length} 条 (dry run)`);
      }
    }

    // 4.8 家务
    if (grocyChores.length > 0) {
      const { lists, items: choreItems, warnings } = mapChores(
        grocyChores, options.familyId, defaultUserId,
      );
      report.warnings.push(...warnings);

      if (!options.dryRun) {
        try {
          for (let i = 0; i < lists.length; i++) {
            const listResult = await db.insert(schema.hhLists).values(lists[i]).returning();
            const listId = listResult[0].id;
            const item = { ...choreItems[i], listId };
            await db.insert(schema.hhListItems).values(item);
          }
          report.summary.chores = lists.length;
          console.log(`  ✓ 家务: ${lists.length} 条`);
        } catch (e: any) {
          report.errors.push(`家务迁移失败: ${e.message}`);
          console.error(`  ✗ 家务迁移失败: ${e.message}`);
        }
      } else {
        report.summary.chores = lists.length;
        console.log(`  ○ 家务: ${lists.length} 条 (dry run)`);
      }
    }

    // 5. 完成
    report.success = report.errors.length === 0;
    report.duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(50));
    console.log('迁移完成!');
    console.log(`耗时: ${report.duration}ms`);
    console.log('汇总:', JSON.stringify(report.summary, null, 2));

    if (report.warnings.length > 0) {
      console.log(`\n警告 (${report.warnings.length}):`);
      report.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
    }

    if (report.errors.length > 0) {
      console.log(`\n错误 (${report.errors.length}):`);
      report.errors.forEach((e) => console.log(`  ✗ ${e}`));
    }

    // 清理
    grocyReader.close();
    sqlite.close();

    return report;
  } catch (error: any) {
    report.success = false;
    report.duration = Date.now() - startTime;
    report.errors.push(`迁移失败: ${error.message}`);
    console.error(`迁移失败: ${error.message}`);

    if (grocyReader) {
      try { grocyReader.close(); } catch { /* ignore */ }
    }

    return report;
  }
}
