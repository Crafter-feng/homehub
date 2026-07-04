import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../db/database.module';
import { eq, and } from 'drizzle-orm';
import { pickDefined } from './helpers/partial-update.helper';

/**
 * Base service for master-data CRUD operations.
 * Eliminates ~300 lines of duplicated code across brands/shops/tags/units/categories.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class BrandsService extends BaseMasterDataService<typeof mdBrands> {
 *   constructor(@Inject(DATABASE_TOKEN) db: any) {
 *     super(db, mdBrands, '品牌', ['name', 'notes']);
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseMasterDataService<TTable extends Record<string, any>> {
  constructor(
    @Inject(DATABASE_TOKEN) protected readonly db: any,
    protected readonly table: TTable,
    protected readonly entityName: string,
    protected readonly allowedFields: string[],
  ) {}

  async list(familyId: number): Promise<any[]> {
    return this.db.select().from(this.table)
      .where(eq((this.table as any).familyId, familyId))
      .all();
  }

  async create(familyId: number, data: Record<string, any>): Promise<any> {
    return this.db.insert(this.table)
      .values({ familyId, ...data } as any)
      .returning()
      .get();
  }

  async update(id: number, familyId: number, data: Record<string, any>): Promise<any> {
    const existing = await this.db.select().from(this.table)
      .where(and(eq((this.table as any).id, id), eq((this.table as any).familyId, familyId)))
      .get();
    if (!existing) throw new NotFoundException(`${this.entityName}不存在`);

    const updates = pickDefined(data, this.allowedFields);
    (updates as any).updatedAt = new Date();

    await this.db.update(this.table)
      .set(updates as any)
      .where(eq((this.table as any).id, id))
      .run();

    return this.db.select().from(this.table)
      .where(eq((this.table as any).id, id))
      .get();
  }

  async delete(id: number, familyId: number): Promise<{ success: true }> {
    await this.db.delete(this.table)
      .where(and(eq((this.table as any).id, id), eq((this.table as any).familyId, familyId)))
      .run();
    return { success: true };
  }
}
