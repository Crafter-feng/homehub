/**
 * Backfill batch records for existing items that have quantity > 0 but no batches.
 * Creates a "legacy" batch for each item.
 *
 * Usage: npx tsx scripts/backfill-batches.ts
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.SQLITE_DB_PATH || './data/homehub.db';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function backfill() {
  console.log('Starting batch backfill...');

  // Find products that have no batch records
  const productsWithoutBatches = db.prepare(`
    SELECT p.id, p.name, p.unit, p.location_id
    FROM inv_products p
    LEFT JOIN inv_batches b ON b.product_id = p.id
    GROUP BY p.id
    HAVING COUNT(b.id) = 0
  `).all() as Array<{
    id: number;
    name: string;
    unit: string;
    location_id: number | null;
  }>;

  console.log(`Found ${productsWithoutBatches.length} products without batches`);

  const insertBatch = db.prepare(`
    INSERT INTO inv_batches (product_id, quantity, unit, location_id, created_at)
    VALUES (?, 0, ?, ?, ?)
  `);

  let created = 0;
  for (const product of productsWithoutBatches) {
    insertBatch.run(
      product.id,
      product.unit,
      product.location_id,
      Date.now(),
    );
    console.log(`  Created batch for "${product.name}"`);
    created++;
  }

  console.log(`\nDone! Created ${created} batch records.`);
}

backfill();
