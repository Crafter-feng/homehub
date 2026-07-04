import { defineConfig } from 'drizzle-kit';

const dbType = process.env.DB_TYPE || 'sqlite';

export default defineConfig(
  dbType === 'postgres'
    ? {
        schema: './src/db/schema/*',
        out: './src/db/migrations',
        dialect: 'postgresql',
        dbCredentials: {
          url: process.env.DATABASE_URL || 'postgres://localhost:5432/homehub',
        },
      }
    : {
        schema: './src/db/schema/*',
        out: './src/db/migrations',
        dialect: 'sqlite',
        dbCredentials: {
          url: process.env.SQLITE_DB_PATH || './data/homehub.db',
        },
      }
);
