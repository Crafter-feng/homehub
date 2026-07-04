import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { categories } from '../../../db/schema';

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
    return this.db.select().from(categories)
      .where(eq(categories.familyId, familyId))
      .all();
  }

  async create(familyId: number, dto: CreateCategoryDto) {
    return this.db.insert(categories).values({
      familyId,
      name: dto.name,
      icon: dto.icon,
      parentId: dto.parentId,
    }).returning().get();
  }

  async delete(categoryId: number, familyId: number) {
    await this.db.delete(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.familyId, familyId)))
      .run();
    return { success: true };
  }
}
