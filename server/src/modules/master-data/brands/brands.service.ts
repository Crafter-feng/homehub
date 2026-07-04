import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { brands } from '../../../db/schema';

@Injectable()
export class BrandsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number) {
    return this.db.select().from(brands)
      .where(eq(brands.familyId, familyId))
      .all();
  }

  async create(familyId: number, data: { name: string; notes?: string }) {
    return this.db.insert(brands).values({
      familyId,
      name: data.name,
      notes: data.notes,
    }).returning().get();
  }

  async update(brandId: number, familyId: number, data: { name?: string; notes?: string }) {
    const brand = await this.db.select().from(brands)
      .where(and(eq(brands.id, brandId), eq(brands.familyId, familyId)))
      .get();
    if (!brand) throw new NotFoundException('品牌不存在');

    const updates: Record<string, any> = {};
    if (data.name) updates.name = data.name;
    if (data.notes !== undefined) updates.notes = data.notes;

    await this.db.update(brands).set(updates).where(eq(brands.id, brandId)).run();
    return this.db.select().from(brands).where(eq(brands.id, brandId)).get();
  }

  async delete(brandId: number, familyId: number) {
    await this.db.delete(brands)
      .where(and(eq(brands.id, brandId), eq(brands.familyId, familyId)))
      .run();
    return { success: true };
  }
}
