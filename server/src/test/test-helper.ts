import path from 'path';
import fs from 'fs';
import { Test } from '@nestjs/testing';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';

export async function createTestModule(providers: any[], imports: any[] = []): Promise<{ module: any, db: any, sqlite: any }> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  // 执行迁移 SQL（与生产代码相同的逻辑）
  const migrationsDir = path.join(__dirname, '..', '..', 'src', 'db', 'migrations');
  const sqlFile = path.join(migrationsDir, '0000_init.sql');
  if (fs.existsSync(sqlFile)) {
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    const statements = sql.split('--> statement-breakpoint').map((s: string) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try { sqlite.exec(stmt); } catch { /* table/index may already exist */ }
    }
  }

  // Seed base data for FK constraints
  db.insert(schema.families).values({ id: 1, name: '测试家庭', inviteCode: 'TEST001' }).run();
  db.insert(schema.families).values({ id: 2, name: '家庭2号', inviteCode: 'TEST002' }).run();
  db.insert(schema.users).values({ id: 1, email: 'test@test.com', name: '测试用户', passwordHash: 'hash' }).run();
  db.insert(schema.mdLocations).values({ id: 1, familyId: 1, name: '冰箱', level: 1 }).run();
  db.insert(schema.mdLocations).values({ id: 2, familyId: 2, name: '冷藏柜', level: 1 }).run();

  const modRef = await Test.createTestingModule({
    imports,
    providers: [
      {
        provide: 'DATABASE_CONNECTION',
        useValue: db,
      },
      ...providers,
    ],
  }).compile();

  return { module: modRef, db, sqlite };
}
