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

  // Find items with quantity > 0 and no batches
  const itemsWithoutBatches = db.prepare(`
    SELECT i.id, i.name, i.quantity, i.unit, i.expiry_date, i.location_id
    FROM inv_items i
    LEFT JOIN inv_item_batches b ON b.item_id = i.id
    WHERE i.quantity > 0
    GROUP BY i.id
    HAVING COUNT(b.id) = 0
  `).all() as Array<{
    id: number;
    name: string;
    quantity: number;
    unit: string;
    expiry_date: number | null;
    location_id: number | null;
  }>;

  console.log(`Found ${itemsWithoutBatches.length} items without batches`);

  const insertBatch = db.prepare(`
    INSERT INTO inv_item_batches (item_id, quantity, unit, expiry_date, location_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let created = 0;
  for (const item of itemsWithoutBatches) {
    insertBatch.run(
      item.id,
      item.quantity,
      item.unit,
      item.expiry_date,
      item.location_id,
      Date.now(),
    );
    console.log(`  Created batch for "${item.name}" (qty: ${item.quantity} ${item.unit})`);
    created++;
  }

  console.log(`\nDone! Created ${created} batch records.`);
}

backfill();
