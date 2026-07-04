import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { shops } from '../../../db/schema';

@Injectable()
export class ShopsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number) {
    return this.db.select().from(shops)
      .where(eq(shops.familyId, familyId))
      .all();
  }

  async create(familyId: number, data: { name: string; icon?: string; address?: string; notes?: string }) {
    return this.db.insert(shops).values({
      familyId,
      name: data.name,
      icon: data.icon,
      address: data.address,
      notes: data.notes,
    }).returning().get();
  }

  async update(shopId: number, familyId: number, data: { name?: string; icon?: string; address?: string; notes?: string }) {
    const shop = await this.db.select().from(shops)
      .where(and(eq(shops.id, shopId), eq(shops.familyId, familyId)))
      .get();
    if (!shop) throw new NotFoundException('商店不存在');

    const updates: Record<string, any> = {};
    if (data.name) updates.name = data.name;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.address !== undefined) updates.address = data.address;
    if (data.notes !== undefined) updates.notes = data.notes;

    await this.db.update(shops).set(updates).where(eq(shops.id, shopId)).run();
    return this.db.select().from(shops).where(eq(shops.id, shopId)).get();
  }

  async delete(shopId: number, familyId: number) {
    await this.db.delete(shops)
      .where(and(eq(shops.id, shopId), eq(shops.familyId, familyId)))
      .run();
    return { success: true };
  }
}
