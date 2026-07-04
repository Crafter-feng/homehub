import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { Database } from './types';

export const databaseProvider = {
  provide: 'DATABASE_CONNECTION',
  useFactory: async (): Promise<Database> => {
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
    return drizzle(sqlite, { schema }) as Database;
  },
};
