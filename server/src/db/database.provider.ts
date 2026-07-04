import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { Database } from './types';
import { Logger } from '@nestjs/common';
const fs = require('fs');
const path = require('path');

export const databaseProvider = {
  provide: 'DATABASE_CONNECTION',
  useFactory: async (): Promise<Database> => {
    const logger = new Logger('DatabaseProvider');
    const dbType = process.env.DB_TYPE || 'sqlite';

    if (dbType === 'postgres') {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/homehub',
      });
      const { drizzle: drizzlePg } = await import('drizzle-orm/node-postgres');
      return drizzlePg(pool, { schema }) as Database;
    }

    const DatabaseConstructor = require('better-sqlite3');
    const sqlite = new DatabaseConstructor(process.env.SQLITE_DB_PATH || './data/homehub.db');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    // Apply migration SQL files on startup (idempotent)
    const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrateFiles = fs.readdirSync(migrationsDir)
        .filter((f: string) => f.endsWith('.sql'))
        .sort();
      for (const file of migrateFiles) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        const statements = sql.split('--> statement-breakpoint').map((s: string) => s.trim()).filter(Boolean);
        for (const stmt of statements) {
          try { sqlite.exec(stmt); } catch { /* table/index may already exist */ }
        }
      }
    }

    const db = drizzle(sqlite, { schema }) as Database;
    logger.log('数据库就绪');
    return db;
  },
};
