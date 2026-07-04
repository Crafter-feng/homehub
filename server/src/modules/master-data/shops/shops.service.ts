import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { mdShops } from '../../../db/schema';

@Injectable()
export class ShopsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number) {
    return this.db.select().from(mdShops)
      .where(eq(mdShops.familyId, familyId))
      .all();
  }

  async create(familyId: number, data: { name: string; icon?: string; address?: string; notes?: string }) {
    return this.db.insert(mdShops).values({
      familyId,
      name: data.name,
      icon: data.icon,
      address: data.address,
      notes: data.notes,
    }).returning().get();
  }

  async update(shopId: number, familyId: number, data: { name?: string; icon?: string; address?: string; notes?: string }) {
    const shop = await this.db.select().from(mdShops)
      .where(and(eq(mdShops.id, shopId), eq(mdShops.familyId, familyId)))
      .get();
    if (!shop) throw new NotFoundException('商店不存在');

    const updates: Record<string, any> = {};
    if (data.name) updates.name = data.name;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.address !== undefined) updates.address = data.address;
    if (data.notes !== undefined) updates.notes = data.notes;

    await this.db.update(mdShops).set(updates).where(eq(mdShops.id, shopId)).run();
    return this.db.select().from(mdShops).where(eq(mdShops.id, shopId)).get();
  }

  async delete(shopId: number, familyId: number) {
    await this.db.delete(mdShops)
      .where(and(eq(mdShops.id, shopId), eq(mdShops.familyId, familyId)))
      .run();
    return { success: true };
  }
}
