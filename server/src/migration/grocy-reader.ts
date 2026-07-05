// ═══════════════════════════════════════════════════════
// Grocy SQLite 数据库只读读取器
// ═══════════════════════════════════════════════════════

import Database from 'better-sqlite3';

export interface GrocyUser {
  id: number;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  picture_file_name: string | null;
  row_created_timestamp: string;
}

export interface GrocyLocation {
  id: number;
  name: string;
  description: string;
  is_freezer: number;
  active: number;
  row_created_timestamp: string;
}

export interface GrocyQuantityUnit {
  id: number;
  name: string;
  description: string;
  name_plural: string | null;
  plural_forms: string | null;
  active: number;
  row_created_timestamp: string;
}

export interface GrocyProductGroup {
  id: number;
  name: string;
  description: string;
  active: number;
  row_created_timestamp: string;
}

export interface GrocyShop {
  id: number;
  name: string;
  description: string;
  active: number;
  row_created_timestamp: string;
}

export interface GrocyProduct {
  id: number;
  name: string;
  description: string;
  product_group_id: number;
  active: number;
  location_id: number;
  shopping_location_id: number;
  qu_id_purchase: number;
  qu_id_stock: number;
  min_stock_amount: number;
  default_best_before_days: number;
  parent_product_id: number;
  calories: number;
  row_created_timestamp: string;
}

export interface GrocyProductBarcode {
  id: number;
  product_id: number;
  barcode: string;
  qu_id: number;
  amount: number;
  shopping_location_id: number;
  last_price: number;
  row_created_timestamp: string;
  note: string;
}

export interface GrocyStock {
  id: number;
  product_id: number;
  amount: number;
  best_before_date: string;
  purchased_date: string;
  location_id: number;
  stock_id: string;
  price: number;
  open: number;
  opened_date: string;
  shopping_location_id: number;
  note: string;
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
  price: number;
  undone: number;
  location_id: number;
  shopping_location_id: number;
  recipe_id: number;
  user_id: number;
  note: string;
  row_created_timestamp: string;
}

export interface GrocyShoppingList {
  id: number;
  product_id: number;
  note: string;
  amount: number;
  shopping_list_id: number;
  done: number;
  qu_id: number;
  row_created_timestamp: string;
}

export interface GrocyRecipe {
  id: number;
  name: string;
  description: string;
  picture_file_name: string;
  base_servings: number;
  desired_servings: number;
  type: string;
  product_id: number;
  row_created_timestamp: string;
}

export interface GrocyRecipePosition {
  id: number;
  recipe_id: number;
  product_id: number;
  amount: number;
  note: string;
  qu_id: number;
  ingredient_group: string;
  variable_amount: string;
  row_created_timestamp: string;
}

export interface GrocyChore {
  id: number;
  name: string;
  description: string;
  period_type: string;
  period_days: number;
  period_interval: number;
  period_config: string;
  track_date_only: number;
  rollover: number;
  assignment_type: string;
  assignment_config: string;
  next_execution_assigned_to_user_id: number;
  consume_product_on_execution: number;
  product_id: number;
  product_amount: number;
  active: number;
  start_date: string;
  row_created_timestamp: string;
}

export interface GrocyChoreLog {
  id: number;
  chore_id: number;
  tracked_time: string;
  done_by_user_id: number;
  undone: number;
  skipped: number;
  scheduled_execution_time: string;
  row_created_timestamp: string;
}

export class GrocyReader {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }

  getTableNames(): string[] {
    return (this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]).map(r => r.name);
  }

  hasTable(tableName: string): boolean {
    return !!this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
  }

  getColumns(tableName: string): string[] {
    return (this.db.prepare(`PRAGMA table_info("${tableName}")`).all() as { name: string }[]).map(r => r.name);
  }

  getUsers(): GrocyUser[] {
    if (!this.hasTable('users')) return [];
    return this.db.prepare(`SELECT id, username, password, first_name, last_name, picture_file_name, row_created_timestamp FROM users`).all() as GrocyUser[];
  }

  getLocations(): GrocyLocation[] {
    if (!this.hasTable('locations')) return [];
    return this.db.prepare(`SELECT id, name, description, is_freezer, active, row_created_timestamp FROM locations WHERE active = 1`).all() as GrocyLocation[];
  }

  getQuantityUnits(): GrocyQuantityUnit[] {
    if (!this.hasTable('quantity_units')) return [];
    return this.db.prepare(`SELECT id, name, description, name_plural, plural_forms, active, row_created_timestamp FROM quantity_units WHERE active = 1`).all() as GrocyQuantityUnit[];
  }

  getProductGroups(): GrocyProductGroup[] {
    if (!this.hasTable('product_groups')) return [];
    return this.db.prepare(`SELECT id, name, description, active, row_created_timestamp FROM product_groups WHERE active = 1`).all() as GrocyProductGroup[];
  }

  getShops(): GrocyShop[] {
    if (!this.hasTable('shopping_locations')) return [];
    return this.db.prepare(`SELECT id, name, description, active, row_created_timestamp FROM shopping_locations WHERE active = 1`).all() as GrocyShop[];
  }

  getProducts(): GrocyProduct[] {
    if (!this.hasTable('products')) return [];
    return this.db.prepare(`SELECT id, name, description, product_group_id, active, location_id, shopping_location_id, qu_id_purchase, qu_id_stock, min_stock_amount, default_best_before_days, parent_product_id, calories, row_created_timestamp FROM products WHERE active = 1`).all() as GrocyProduct[];
  }

  getProductBarcodes(): GrocyProductBarcode[] {
    if (!this.hasTable('product_barcodes')) return [];
    return this.db.prepare(`SELECT id, product_id, barcode, qu_id, amount, shopping_location_id, last_price, row_created_timestamp, note FROM product_barcodes`).all() as GrocyProductBarcode[];
  }

  getStock(): GrocyStock[] {
    if (!this.hasTable('stock')) return [];
    return this.db.prepare(`SELECT id, product_id, amount, best_before_date, purchased_date, stock_id, price, open, opened_date, location_id, shopping_location_id, note, row_created_timestamp FROM stock`).all() as GrocyStock[];
  }

  getStockLog(): GrocyStockLog[] {
    if (!this.hasTable('stock_log')) return [];
    return this.db.prepare(`SELECT id, product_id, amount, best_before_date, purchased_date, used_date, spoiled, stock_id, transaction_type, price, undone, location_id, shopping_location_id, recipe_id, user_id, note, row_created_timestamp FROM stock_log WHERE undone = 0`).all() as GrocyStockLog[];
  }

  getShoppingListItems(): GrocyShoppingList[] {
    if (!this.hasTable('shopping_list')) return [];
    return this.db.prepare(`SELECT id, product_id, note, amount, shopping_list_id, done, qu_id, row_created_timestamp FROM shopping_list WHERE done = 0`).all() as GrocyShoppingList[];
  }

  getRecipes(): GrocyRecipe[] {
    if (!this.hasTable('recipes')) return [];
    return this.db.prepare(`SELECT id, name, description, picture_file_name, base_servings, desired_servings, type, product_id, row_created_timestamp FROM recipes`).all() as GrocyRecipe[];
  }

  getRecipePositions(): GrocyRecipePosition[] {
    if (!this.hasTable('recipes_pos')) return [];
    return this.db.prepare(`SELECT id, recipe_id, product_id, amount, note, qu_id, ingredient_group, variable_amount, row_created_timestamp FROM recipes_pos`).all() as GrocyRecipePosition[];
  }

  getChores(): GrocyChore[] {
    if (!this.hasTable('chores')) return [];
    return this.db.prepare(`SELECT id, name, description, period_type, period_days, period_interval, period_config, track_date_only, rollover, assignment_type, assignment_config, next_execution_assigned_to_user_id, consume_product_on_execution, product_id, product_amount, active, start_date, row_created_timestamp FROM chores WHERE active = 1`).all() as GrocyChore[];
  }

  getChoreLogs(): GrocyChoreLog[] {
    if (!this.hasTable('chores_log')) return [];
    return this.db.prepare(`SELECT id, chore_id, tracked_time, done_by_user_id, undone, skipped, scheduled_execution_time, row_created_timestamp FROM chores_log WHERE undone = 0`).all() as GrocyChoreLog[];
  }

  close(): void {
    this.db.close();
  }
}
