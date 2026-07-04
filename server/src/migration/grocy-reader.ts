// ═══════════════════════════════════════════════════════
// Grocy SQLite 数据库只读读取器
// ═══════════════════════════════════════════════════════

import Database from 'better-sqlite3';

// ── Grocy 实体类型 ──

export interface GrocyUser {
  id: number;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  row_created_timestamp: string;
}

export interface GrocyLocation {
  id: number;
  name: string;
  description: string;
  row_created_timestamp: string;
}

export interface GrocyQuantityUnit {
  id: number;
  name: string;
  description: string;
  row_created_timestamp: string;
}

export interface GrocyProduct {
  id: number;
  name: string;
  description: string;
  location_id: number;
  qu_id_purchase: number;
  qu_id_stock: number;
  qu_factor_purchase_to_stock: number;
  barcode: string;
  min_stock_amount: number;
  default_best_before_days: number;
  row_created_timestamp: string;
}

export interface GrocyStock {
  id: number;
  product_id: number;
  amount: number;
  best_before_date: string;
  purchased_date: string;
  stock_id: string;
  row_created_timestamp: string;
}

export interface GrocyStockLog {
  id: number;
  product_id: number;
  amount: number;
  best_before_date: string;
  purchased_date: string;
  used_date: string;
  spoiled: number;
  stock_id: string;
  transaction_type: string;
  row_created_timestamp: string;
}

export interface GrocyShoppingListItem {
  id: number;
  product_id: number;
  amount: number;
  amount_autoadded: number;
  row_created_timestamp: string;
}

export interface GrocyRecipe {
  id: number;
  name: string;
  description: string;
  base_servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  image: string;
  row_created_timestamp: string;
}

export interface GrocyRecipePosition {
  id: number;
  recipe_id: number;
  product_id: number;
  amount: number;
  qu_id: number;
  variable_amount: number;
  note: string;
  row_created_timestamp: string;
}

export interface GrocyChore {
  id: number;
  name: string;
  description: string;
  period_type: string;
  period_days: number;
  consume_stock_on_execution: number;
  consume_stock_product_id: number;
  consume_stock_quantity_unit_id: number;
  row_created_timestamp: string;
}

export interface GrocyChoreLog {
  id: number;
  chore_id: number;
  tracked_time: string;
  execution_type: string;
  row_created_timestamp: string;
}

// ── Grocy 数据库读取器 ──

export class GrocyReader {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
    this.db.pragma('journal_mode = WAL');
  }

  /** 获取数据库中所有表名 */
  getTableNames(): string[] {
    const rows = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    return rows.map((r) => r.name);
  }

  /** 检查某张表是否存在 */
  hasTable(tableName: string): boolean {
    const row = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(tableName) as { name: string } | undefined;
    return !!row;
  }

  /** 获取某张表的列名 */
  getColumns(tableName: string): string[] {
    const rows = this.db.prepare(`PRAGMA table_info("${tableName}")`).all() as { name: string }[];
    return rows.map((r) => r.name);
  }

  // ── 用户 ──
  getUsers(): GrocyUser[] {
    if (!this.hasTable('users')) return [];
    return this.db.prepare(
      'SELECT id, username, password, first_name, last_name, row_created_timestamp FROM users',
    ).all() as GrocyUser[];
  }

  // ── 位置 ──
  getLocations(): GrocyLocation[] {
    if (!this.hasTable('locations')) return [];
    return this.db.prepare(
      'SELECT id, name, description, row_created_timestamp FROM locations',
    ).all() as GrocyLocation[];
  }

  // ── 计量单位 ──
  getQuantityUnits(): GrocyQuantityUnit[] {
    if (!this.hasTable('quantity_units')) return [];
    return this.db.prepare(
      'SELECT id, name, description, row_created_timestamp FROM quantity_units',
    ).all() as GrocyQuantityUnit[];
  }

  // ── 产品 ──
  getProducts(): GrocyProduct[] {
    if (!this.hasTable('products')) return [];
    return this.db.prepare(
      `SELECT id, name, description, location_id, qu_id_purchase, qu_id_stock,
              qu_factor_purchase_to_stock, barcode, min_stock_amount,
              default_best_before_days, row_created_timestamp
       FROM products`,
    ).all() as GrocyProduct[];
  }

  // ── 当前库存 ──
  getStock(): GrocyStock[] {
    if (!this.hasTable('stock')) return [];
    return this.db.prepare(
      `SELECT id, product_id, amount, best_before_date, purchased_date,
              stock_id, row_created_timestamp
       FROM stock`,
    ).all() as GrocyStock[];
  }

  // ── 库存流水 ──
  getStockLog(): GrocyStockLog[] {
    if (!this.hasTable('stock_log')) return [];
    return this.db.prepare(
      `SELECT id, product_id, amount, best_before_date, purchased_date,
              used_date, spoiled, stock_id, transaction_type, row_created_timestamp
       FROM stock_log`,
    ).all() as GrocyStockLog[];
  }

  // ── 购物清单 ──
  getShoppingList(): GrocyShoppingListItem[] {
    if (!this.hasTable('shopping_list')) return [];
    return this.db.prepare(
      `SELECT id, product_id, amount, amount_autoadded, row_created_timestamp
       FROM shopping_list`,
    ).all() as GrocyShoppingListItem[];
  }

  // ── 食谱 ──
  getRecipes(): GrocyRecipe[] {
    if (!this.hasTable('recipes')) return [];
    const cols = this.getColumns('recipes');
    const selectCols = ['id', 'name', 'description'];
    if (cols.includes('base_servings')) selectCols.push('base_servings');
    if (cols.includes('prep_time_minutes')) selectCols.push('prep_time_minutes');
    if (cols.includes('cook_time_minutes')) selectCols.push('cook_time_minutes');
    if (cols.includes('image')) selectCols.push('image');
    selectCols.push('row_created_timestamp');
    return this.db.prepare(
      `SELECT ${selectCols.join(', ')} FROM recipes`,
    ).all() as GrocyRecipe[];
  }

  getRecipePositions(): GrocyRecipePosition[] {
    if (!this.hasTable('recipes_pos')) return [];
    return this.db.prepare(
      `SELECT id, recipe_id, product_id, amount, qu_id,
              variable_amount, note, row_created_timestamp
       FROM recipes_pos`,
    ).all() as GrocyRecipePosition[];
  }

  // ── 家务 (habits/chores) ──
  getChores(): GrocyChore[] {
    // Grocy 早期版本用 habits，后来改名 chores
    const tableName = this.hasTable('chores') ? 'chores' : 'habits';
    if (!this.hasTable(tableName)) return [];
    const cols = this.getColumns(tableName);
    const selectCols = ['id', 'name', 'description', 'period_type', 'period_days'];
    if (cols.includes('consume_stock_on_execution')) selectCols.push('consume_stock_on_execution');
    if (cols.includes('consume_stock_product_id')) selectCols.push('consume_stock_product_id');
    if (cols.includes('consume_stock_quantity_unit_id')) selectCols.push('consume_stock_quantity_unit_id');
    selectCols.push('row_created_timestamp');
    return this.db.prepare(
      `SELECT ${selectCols.join(', ')} FROM "${tableName}"`,
    ).all() as GrocyChore[];
  }

  getChoreLogs(): GrocyChoreLog[] {
    const tableName = this.hasTable('chores_log') ? 'chores_log' : 'habits_log';
    if (!this.hasTable(tableName)) return [];
    return this.db.prepare(
      `SELECT id, ${this.hasTable('chores_log') ? 'chore_id' : 'habit_id'} AS chore_id,
              tracked_time, execution_type, row_created_timestamp
       FROM "${tableName}"`,
    ).all() as GrocyChoreLog[];
  }

  /** 关闭数据库连接 */
  close(): void {
    this.db.close();
  }
}
