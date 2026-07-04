import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { eq, and, like, count } from 'drizzle-orm';
import { invProducts } from '../../db/schema';
import { CreateProductDto, UpdateProductDto } from './dto/products.dto';
import { DATABASE_TOKEN } from '../../db/database.module';
import type { Database } from '../../db/types';
import { pickDefined } from '../../common';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
  ) {}

  async list(familyId: number) {
    return this.db.select().from(invProducts).where(eq(invProducts.familyId, familyId)).all();
  }

  async search(familyId: number, query: string) {
    return this.db.select().from(invProducts)
      .where(and(
        eq(invProducts.familyId, familyId),
        like(invProducts.name, `%${query}%`),
      ))
      .all();
  }

  async getById(id: number, familyId: number): Promise<any> {
    const product = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, id), eq(invProducts.familyId, familyId)))
      .get();
    if (!product) throw new NotFoundException('产品不存在');
    return product;
  }

  async create(familyId: number, dto: CreateProductDto): Promise<any> {
    const result = this.db.insert(invProducts).values({
      familyId,
      name: dto.name,
      barcode: dto.barcode,
      categoryId: dto.categoryId,
      unit: dto.unit || '个',
      brand: dto.brand,
      image: dto.image,
      defaultPrice: dto.defaultPrice,
      notes: dto.notes,
    }).run();

    const id = Number(result.lastInsertRowid);
    this.logger.log(`创建产品: ${dto.name} (ID: ${id})`);
    return this.db.select().from(invProducts).where(eq(invProducts.id, id)).get();
  }

  async update(id: number, familyId: number, dto: UpdateProductDto): Promise<any> {
    const existing = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, id), eq(invProducts.familyId, familyId)))
      .get();
    if (!existing) throw new NotFoundException('产品不存在');

    const updates = pickDefined(dto as Record<string, unknown>, [
      'name', 'barcode', 'categoryId', 'unit', 'brand', 'image',
      'defaultPrice', 'defaultBestBeforeDays', 'defaultBestBeforeDaysAfterOpen',
      'moveOnOpenLocationId', 'parentId', 'caloriesPerUnit', 'notes',
    ]);
    (updates as Record<string, unknown>).updatedAt = new Date();

    this.db.update(invProducts)
      .set(updates as any)
      .where(eq(invProducts.id, id))
      .run();

    return this.db.select().from(invProducts).where(eq(invProducts.id, id)).get();
  }

  async delete(id: number, familyId: number): Promise<void> {
    const existing = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, id), eq(invProducts.familyId, familyId)))
      .get();
    if (!existing) throw new NotFoundException('产品不存在');

    this.db.delete(invProducts).where(eq(invProducts.id, id)).run();
    this.logger.log(`删除产品: ${existing.name} (ID: ${id})`);
  }
}