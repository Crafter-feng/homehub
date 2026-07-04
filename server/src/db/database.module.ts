import { Module, Global } from '@nestjs/common';
import { databaseProvider } from './database.provider';
import type { Database } from './types';

/**
 * Typed injection token for the database connection.
 * Usage in services:
 *   @Inject(DATABASE_TOKEN) private db: Database
 */
export const DATABASE_TOKEN = 'DATABASE_CONNECTION' as const;

/** Re-export Database type for importing modules */
export type { Database };

@Global()
@Module({
  providers: [databaseProvider],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule {}
