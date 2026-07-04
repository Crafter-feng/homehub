import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { mdCategories } from '../../../db/schema';

export class CreateCategoryDto {
  name: string;
  icon?: string;
  parentId?: number;
}

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number) {
    return this.db.select().from(mdCategories)
      .where(eq(mdCategories.familyId, familyId))
      .all();
  }

  async create(familyId: number, dto: CreateCategoryDto) {
    return this.db.insert(mdCategories).values({
      familyId,
      name: dto.name,
      icon: dto.icon,
      parentId: dto.parentId,
    }).returning().get();
  }

  async delete(categoryId: number, familyId: number) {
    await this.db.delete(mdCategories)
      .where(and(eq(mdCategories.id, categoryId), eq(mdCategories.familyId, familyId)))
      .run();
    return { success: true };
  }
}
