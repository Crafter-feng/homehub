import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { mdTags, mdItemTags, invItems } from '../../../db/schema';

export class CreateTagDto {
  name: string;
  icon?: string;
  color?: string;
  notes?: string;
}

@Injectable()
export class TagsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number) {
    return this.db.select().from(mdTags)
      .where(eq(mdTags.familyId, familyId))
      .all();
  }

  async create(familyId: number, dto: CreateTagDto) {
    return this.db.insert(mdTags).values({
      familyId,
      name: dto.name,
      icon: dto.icon,
      color: dto.color || '#409EFF',
      notes: dto.notes,
    }).returning().get();
  }

  async update(tagId: number, familyId: number, dto: { name?: string; icon?: string; color?: string; notes?: string }) {
    const tag = await this.db.select().from(mdTags)
      .where(and(eq(mdTags.id, tagId), eq(mdTags.familyId, familyId)))
      .get();
    if (!tag) throw new NotFoundException('标签不存在');

    const updates: Record<string, any> = {};
    if (dto.name) updates.name = dto.name;
    if (dto.icon !== undefined) updates.icon = dto.icon;
    if (dto.color) updates.color = dto.color;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    await this.db.update(mdTags).set(updates).where(eq(mdTags.id, tagId)).run();
    return this.db.select().from(mdTags).where(eq(mdTags.id, tagId)).get();
  }

  async delete(tagId: number, familyId: number) {
    await this.db.delete(mdTags)
      .where(and(eq(mdTags.id, tagId), eq(mdTags.familyId, familyId)))
      .run();
    return { success: true };
  }

  async addToItem(itemId: number, tagId: number, familyId: number) {
    // Verify item belongs to family
    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('物品不存在');
    await this.db.insert(mdItemTags).values({ itemId, tagId }).run();
    return { success: true };
  }

  async removeFromItem(itemId: number, tagId: number, familyId: number) {
    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('物品不存在');
    await this.db.delete(mdItemTags)
      .where(and(eq(mdItemTags.itemId, itemId), eq(mdItemTags.tagId, tagId)))
      .run();
    return { success: true };
  }

  async getItemTags(itemId: number, familyId: number) {
    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('物品不存在');
    return this.db.select({
      id: mdTags.id,
      name: mdTags.name,
      icon: mdTags.icon,
      color: mdTags.color,
    }).from(mdItemTags)
      .innerJoin(mdTags, eq(mdItemTags.tagId, mdTags.id))
      .where(eq(mdItemTags.itemId, itemId))
      .all();
  }
}
