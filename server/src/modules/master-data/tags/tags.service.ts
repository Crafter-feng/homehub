import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { tags, itemTags } from '../../../db/schema';

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
    return this.db.select().from(tags)
      .where(eq(tags.familyId, familyId))
      .all();
  }

  async create(familyId: number, dto: CreateTagDto) {
    return this.db.insert(tags).values({
      familyId,
      name: dto.name,
      icon: dto.icon,
      color: dto.color || '#409EFF',
      notes: dto.notes,
    }).returning().get();
  }

  async update(tagId: number, familyId: number, dto: { name?: string; icon?: string; color?: string; notes?: string }) {
    const tag = await this.db.select().from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.familyId, familyId)))
      .get();
    if (!tag) throw new NotFoundException('标签不存在');

    const updates: Record<string, any> = {};
    if (dto.name) updates.name = dto.name;
    if (dto.icon !== undefined) updates.icon = dto.icon;
    if (dto.color) updates.color = dto.color;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    await this.db.update(tags).set(updates).where(eq(tags.id, tagId)).run();
    return this.db.select().from(tags).where(eq(tags.id, tagId)).get();
  }

  async delete(tagId: number, familyId: number) {
    await this.db.delete(tags)
      .where(and(eq(tags.id, tagId), eq(tags.familyId, familyId)))
      .run();
    return { success: true };
  }

  async addToItem(itemId: number, tagId: number) {
    await this.db.insert(itemTags).values({ itemId, tagId }).run();
    return { success: true };
  }

  async removeFromItem(itemId: number, tagId: number) {
    await this.db.delete(itemTags)
      .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)))
      .run();
    return { success: true };
  }

  async getItemTags(itemId: number) {
    return this.db.select({
      id: tags.id,
      name: tags.name,
      icon: tags.icon,
      color: tags.color,
    }).from(itemTags)
      .innerJoin(tags, eq(itemTags.tagId, tags.id))
      .where(eq(itemTags.itemId, itemId))
      .all();
  }
}
