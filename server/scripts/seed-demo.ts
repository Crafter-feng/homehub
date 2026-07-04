/**
 * Demo data seed script
 * Generates realistic test data for HomeHub
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.SQLITE_DB_PATH || './data/homehub.db';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const FAMILY_ID = 1;
const USER_ID = 1;

// Product categories
const categories = ['食品', '饮料', '日用品', '调味品', '零食', '冷冻食品', '乳制品', '个护'];

// Locations
const locations = ['冰箱', '冷冻柜', ' pantry', '储物间', '厨房台面', '客厅'];

// Units
const units = ['个', '瓶', '袋', '盒', '包', '罐', '箱', '千克', '升'];

// Product templates
const productTemplates = [
  { name: '牛奶', category: '乳制品', unit: '瓶', minStock: 2, bestBeforeDays: 7 },
  { name: '鸡蛋', category: '食品', unit: '个', minStock: 10, bestBeforeDays: 30 },
  { name: '面包', category: '食品', unit: '袋', minStock: 1, bestBeforeDays: 5 },
  { name: '酸奶', category: '乳制品', unit: '盒', minStock: 3, bestBeforeDays: 14 },
  { name: '苹果', category: '食品', unit: '个', minStock: 5, bestBeforeDays: 14 },
  { name: '香蕉', category: '食品', unit: '个', minStock: 3, bestBeforeDays: 5 },
  { name: '番茄', category: '食品', unit: '个', minStock: 4, bestBeforeDays: 7 },
  { name: '黄瓜', category: '食品', unit: '个', minStock: 3, bestBeforeDays: 5 },
  { name: '猪肉', category: '食品', unit: '千克', minStock: 0.5, bestBeforeDays: 3 },
  { name: '鸡肉', category: '食品', unit: '千克', minStock: 0.5, bestBeforeDays: 3 },
  { name: '鱼', category: '食品', unit: '千克', minStock: 0, bestBeforeDays: 2 },
  { name: '豆腐', category: '食品', unit: '块', minStock: 1, bestBeforeDays: 3 },
  { name: '米饭', category: '食品', unit: '袋', minStock: 1, bestBeforeDays: 180 },
  { name: '面条', category: '食品', unit: '袋', minStock: 2, bestBeforeDays: 90 },
  { name: '酱油', category: '调味品', unit: '瓶', minStock: 1, bestBeforeDays: 365 },
  { name: '醋', category: '调味品', unit: '瓶', minStock: 1, bestBeforeDays: 365 },
  { name: '盐', category: '调味品', unit: '袋', minStock: 1, bestBeforeDays: 730 },
  { name: '糖', category: '调味品', unit: '袋', minStock: 1, bestBeforeDays: 365 },
  { name: '食用油', category: '调味品', unit: '瓶', minStock: 1, bestBeforeDays: 180 },
  { name: '可乐', category: '饮料', unit: '瓶', minStock: 2, bestBeforeDays: 180 },
  { name: '果汁', category: '饮料', unit: '瓶', minStock: 1, bestBeforeDays: 30 },
  { name: '矿泉水', category: '饮料', unit: '瓶', minStock: 6, bestBeforeDays: 365 },
  { name: '洗衣液', category: '日用品', unit: '瓶', minStock: 1, bestBeforeDays: 730 },
  { name: '洗洁精', category: '日用品', unit: '瓶', minStock: 1, bestBeforeDays: 730 },
  { name: '卫生纸', category: '日用品', unit: '包', minStock: 2, bestBeforeDays: 1095 },
  { name: '牙膏', category: '个护', unit: '支', minStock: 1, bestBeforeDays: 730 },
  { name: '洗发水', category: '个护', unit: '瓶', minStock: 1, bestBeforeDays: 730 },
  { name: '薯片', category: '零食', unit: '袋', minStock: 1, bestBeforeDays: 60 },
  { name: '巧克力', category: '零食', unit: '盒', minStock: 0, bestBeforeDays: 90 },
  { name: '冰淇淋', category: '冷冻食品', unit: '盒', minStock: 0, bestBeforeDays: 90 },
  { name: '冻水饺', category: '冷冻食品', unit: '袋', minStock: 1, bestBeforeDays: 90 },
  { name: '冻虾', category: '冷冻食品', unit: '袋', minStock: 0, bestBeforeDays: 180 },
  { name: '橙汁', category: '饮料', unit: '盒', minStock: 2, bestBeforeDays: 7 },
  { name: '啤酒', category: '饮料', unit: '瓶', minStock: 0, bestBeforeDays: 180 },
  { name: '茶叶', category: '食品', unit: '盒', minStock: 1, bestBeforeDays: 365 },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return Math.round((Math.random() * (max - min) + min) * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function seed() {
  console.log('开始生成演示数据...');

  // Ensure family and user exist
  db.prepare('INSERT OR IGNORE INTO families (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)')
    .run(FAMILY_ID, '演示家庭', 'DEMO001', Date.now());
  db.prepare('INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(USER_ID, 'demo@example.com', '演示用户', 'hash', Date.now(), Date.now());

  // Create locations
  const locationIds: number[] = [];
  for (const locName of locations) {
    const result = db.prepare('INSERT INTO md_locations (family_id, name, level, created_at) VALUES (?, ?, 1, ?)')
      .run(FAMILY_ID, locName, Date.now());
    locationIds.push(Number(result.lastInsertRowid));
  }
  console.log(`创建了 ${locationIds.length} 个位置`);

  // Create categories
  const categoryIds: number[] = [];
  for (const catName of categories) {
    const result = db.prepare('INSERT INTO md_categories (family_id, name, created_at) VALUES (?, ?, ?)')
      .run(FAMILY_ID, catName, Date.now());
    categoryIds.push(Number(result.lastInsertRowid));
  }
  console.log(`创建了 ${categoryIds.length} 个分类`);

  // Create units
  for (const unitName of units) {
    db.prepare('INSERT OR IGNORE INTO md_units (family_id, name, conversion_factor, created_at) VALUES (?, ?, 1, ?)')
      .run(FAMILY_ID, unitName, Date.now());
  }
  console.log(`创建了 ${units.length} 个单位`);

  // Create products and items
  let totalProducts = 0;
  let totalBatches = 0;
  let totalTransactions = 0;

  for (const template of productTemplates) {
    const catIndex = categories.indexOf(template.category);
    const categoryId = categoryIds[catIndex >= 0 ? catIndex : 0];
    const locationId = locationIds[randomInt(0, locationIds.length - 1)];

    // Create product
    const prodResult = db.prepare(`
      INSERT INTO inv_products (family_id, name, category_id, unit, default_best_before_days, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(FAMILY_ID, template.name, categoryId, template.unit, template.bestBeforeDays, Date.now(), Date.now());
    const productId = Number(prodResult.lastInsertRowid);
    totalProducts++;

    // Create item
    const quantity = randomInt(1, 10);
    const itemResult = db.prepare(`
      INSERT INTO inv_items (family_id, product_id, name, type, category_id, location_id, quantity, unit, min_stock, purchase_price, expiry_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      FAMILY_ID, productId, template.name, template.category,
      categoryId, locationId, quantity, template.unit, template.minStock,
      randomFloat(5, 50),
      Date.now() + randomInt(-10, 30) * 86400000, // Random expiry
      Date.now(), Date.now()
    );
    const itemId = Number(itemResult.lastInsertRowid);

    // Create batch
    const batchResult = db.prepare(`
      INSERT INTO inv_item_batches (item_id, quantity, unit, purchase_date, expiry_date, location_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      itemId, quantity, template.unit,
      Date.now() - randomInt(1, 14) * 86400000,
      Date.now() + randomInt(-10, 30) * 86400000,
      locationId, Date.now()
    );
    totalBatches++;

    // Create some transactions
    const txCount = randomInt(1, 3);
    for (let i = 0; i < txCount; i++) {
      const txType = Math.random() > 0.7 ? 'consume' : 'add';
      const txQty = randomFloat(0.5, 3);
      db.prepare(`
        INSERT INTO inv_stock_transactions (item_id, type, quantity, unit, user_id, source, created_at)
        VALUES (?, ?, ?, ?, ?, 'manual', ?)
      `).run(itemId, txType, txQty, template.unit, USER_ID, Date.now() - randomInt(1, 30) * 86400000);
      totalTransactions++;
    }
  }

  console.log(`创建了 ${totalProducts} 个产品`);
  console.log(`创建了 ${totalBatches} 个批次`);
  console.log(`创建了 ${totalTransactions} 条流水`);
  console.log('演示数据生成完成！');
}

seed();
