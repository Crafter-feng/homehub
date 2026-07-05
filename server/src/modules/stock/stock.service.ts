import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { eq, and, sql, desc, count, asc } from 'drizzle-orm';
import { invProducts, invBatches, invStockLog, mdLocations, mdItemTags } from '../../db/schema';
import { CreateProductDto, UpdateProductDto, StockInDto, ConsumeDto, TransferDto, AdjustDto, UpdateBatchDto } from './dto/stock.dto';
import { DATABASE_TOKEN } from '../../db/database.module';
import type { Database, TransactionContext } from '../../db/types';
import { PaginationQuery, PaginationResponse, pickDefined, daysFromNow } from '../../common';
import { ProductSelect, BatchSelect } from '../../db/types';
import { PluginRegistryService } from '../../plugins/registry/plugin-registry.service';
import { ListsService } from '../lists/lists.service';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly registry: PluginRegistryService,
    private readonly listsService: ListsService,
  ) {}

  // ── 产品列表（含聚合数量） ──

  async listProducts(
    familyId: number,
    query?: { category?: string; location?: string; expiring?: number },
    pagination?: PaginationQuery,
  ): Promise<PaginationResponse<any>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(invProducts.familyId, familyId)];
    if (query?.category) {
      conditions.push(eq(invProducts.categoryId, parseInt(query.category)));
    }
    if (query?.location) {
      conditions.push(eq(invProducts.locationId, parseInt(query.location)));
    }

    // 获取产品列表
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(invProducts)
      .where(and(...conditions));

    const products = await this.db
      .select()
      .from(invProducts)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    // 聚合每个产品的批次数量
    const productIds = products.map((p: any) => p.id);
    const batchQuantities = await this.db
      .select({
        productId: invBatches.productId,
        totalQuantity: sql<number>`COALESCE(SUM(${invBatches.quantity}), 0)`,
      })
      .from(invBatches)
      .where(sql`${invBatches.productId} IN (${sql.join(productIds.map((id: number) => sql`${id}`), sql`,`)})`)
      .groupBy(invBatches.productId);

    const quantityMap = new Map<number, number>();
    batchQuantities.forEach((bq: any) => quantityMap.set(bq.productId, bq.totalQuantity));

    // 获取最近过期日
    const nextDueDates = await this.db
      .select({
        productId: invBatches.productId,
        nextDue: sql<number>`MIN(${invBatches.expiryDate})`,
      })
      .from(invBatches)
      .where(and(
        sql`${invBatches.productId} IN (${sql.join(productIds.map((id: number) => sql`${id}`), sql`,`)})`,
        sql`${invBatches.expiryDate} IS NOT NULL`,
      ))
      .groupBy(invBatches.productId);

    const dueDateMap = new Map<number, number | null>();
    nextDueDates.forEach((dd: any) => dueDateMap.set(dd.productId, dd.nextDue));

    // 组装结果
    const result = products.map((p: any) => ({
      ...p,
      quantity: quantityMap.get(p.id) || 0,
      nextDueDate: dueDateMap.get(p.id) || null,
    }));

    // 过滤过期产品
    let filtered = result;
    if (query?.expiring) {
      const deadline = Math.floor(daysFromNow(query.expiring) / 1000);
      filtered = result.filter((p: any) => p.nextDueDate && p.nextDueDate <= deadline && p.nextDueDate > Date.now() / 1000);
    }

    return new PaginationResponse(filtered as any, total, page, limit);
  }

  // ── 产品详情（含批次） ──

  async getProductById(productId: number, familyId: number) {
    const product = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
      .get();
    if (!product) throw new NotFoundException('产品不存在');

    const batches = await this.db.select().from(invBatches)
      .where(eq(invBatches.productId, productId))
      .orderBy(asc(sql`COALESCE(${invBatches.expiryDate}, 9999999999)`))
      .all();

    const totalQuantity = batches.reduce((sum: number, b: any) => sum + b.quantity, 0);

    return { ...product, quantity: totalQuantity, batches };
  }

  // ── 创建产品 ──

  async createProduct(familyId: number, dto: CreateProductDto): Promise<ProductSelect> {
    const result = await this.db.insert(invProducts).values({
      familyId,
      name: dto.name,
      barcode: dto.barcode,
      categoryId: dto.categoryId,
      unit: dto.unit || '个',
      brand: dto.brand,
      image: dto.image,
      locationId: dto.locationId,
      minStock: dto.minStock,
      shop: dto.shop,
      defaultPrice: dto.defaultPrice,
      defaultBestBeforeDays: dto.defaultBestBeforeDays,
      defaultBestBeforeDaysAfterOpen: dto.defaultBestBeforeDaysAfterOpen,
      moveOnOpenLocationId: dto.moveOnOpenLocationId,
      purchaseUnit: dto.purchaseUnit,
      stockUnit: dto.stockUnit,
      consumeUnit: dto.consumeUnit,
      purchaseToStockFactor: dto.purchaseToStockFactor,
      parentId: dto.parentId,
      caloriesPerUnit: dto.caloriesPerUnit,
      tareWeight: dto.tareWeight,
      spec: dto.spec,
      notes: dto.notes,
    }).run();

    const id = Number(result.lastInsertRowid);
    this.logger.log(`创建产品: ${dto.name} (ID: ${id})`);
    return this.db.select().from(invProducts).where(eq(invProducts.id, id)).get() as ProductSelect;
  }

  // ── 更新产品 ──

  async updateProduct(productId: number, familyId: number, dto: UpdateProductDto): Promise<ProductSelect> {
    const product = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
      .get();
    if (!product) throw new NotFoundException('产品不存在');

    const updates = pickDefined(dto as Record<string, unknown>, [
      'name', 'barcode', 'categoryId', 'unit', 'brand', 'image',
      'locationId', 'minStock', 'shop', 'defaultPrice',
      'defaultBestBeforeDays', 'defaultBestBeforeDaysAfterOpen', 'moveOnOpenLocationId',
      'purchaseUnit', 'stockUnit', 'consumeUnit', 'purchaseToStockFactor',
      'parentId', 'caloriesPerUnit', 'tareWeight', 'spec', 'notes',
    ]);

    updates.updatedAt = new Date();

    await this.db.update(invProducts).set(updates as any).where(eq(invProducts.id, productId)).run();
    return this.db.select().from(invProducts).where(eq(invProducts.id, productId)).get() as ProductSelect;
  }

  // ── 删除产品 ──

  async deleteProduct(productId: number, familyId: number) {
    const product = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
      .get();
    if (!product) throw new NotFoundException('产品不存在');

    return this.db.transaction((tx: TransactionContext) => {
      // 级联删除：批次、流水、标签、文档
      tx.delete(invBatches).where(eq(invBatches.productId, productId)).run();
      tx.delete(invStockLog).where(eq(invStockLog.productId, productId)).run();
      tx.delete(invProducts).where(eq(invProducts.id, productId)).run();

      this.logger.log(`删除产品: ${product.name} (ID: ${productId})`);
      return { success: true };
    });
  }

  // ── 合并产品 ──

  async mergeProducts(keepId: number, removeId: number, familyId: number) {
    if (keepId === removeId) throw new BadRequestException('不能合并同一个产品');

    const keep = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, keepId), eq(invProducts.familyId, familyId)))
      .get();
    if (!keep) throw new NotFoundException('保留产品不存在');

    const remove = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, removeId), eq(invProducts.familyId, familyId)))
      .get();
    if (!remove) throw new NotFoundException('被合并产品不存在');

    return this.db.transaction((tx: TransactionContext) => {
      // 转移批次
      tx.update(invBatches).set({ productId: keepId })
        .where(eq(invBatches.productId, removeId)).run();
      // 转移流水
      tx.update(invStockLog).set({ productId: keepId })
        .where(eq(invStockLog.productId, removeId)).run();
      // 删除被合并产品
      tx.delete(invProducts).where(eq(invProducts.id, removeId)).run();

      this.logger.log(`合并产品: ${remove.name} → ${keep.name}`);
      return { success: true };
    });
  }

  // ── 入库（创建批次） ──

  async stockIn(productId: number, familyId: number, userId: number, dto: StockInDto): Promise<any> {
    return this.db.transaction((tx: TransactionContext) => {
      const product = tx.select().from(invProducts)
        .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
        .get();
      if (!product) throw new NotFoundException('产品不存在');

      // 自动计算过期日
      let expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
      if (!expiryDate && product.defaultBestBeforeDays) {
        const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();
        expiryDate = new Date(purchaseDate.getTime() + product.defaultBestBeforeDays * 86400000);
      }

      // 创建批次
      const batchResult = tx.insert(invBatches).values({
        productId,
        batchNumber: dto.batchNumber || null,
        quantity: dto.quantity,
        unit: product.stockUnit || product.unit,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        expiryDate,
        locationId: dto.locationId || product.locationId,
        shop: dto.shop || product.shop,
        price: dto.price,
      }).run();

      const batchId = Number(batchResult.lastInsertRowid);

      // 记录流水
      tx.insert(invStockLog).values({
        productId,
        batchId,
        type: 'purchase',
        quantity: dto.quantity,
        unit: product.stockUnit || product.unit,
        toLocationId: dto.locationId || product.locationId,
        userId,
        source: 'manual',
        note: dto.note,
        price: dto.price ?? null,
        shop: dto.shop || product.shop,
      }).run();

      this.logger.log(`入库: ${product.name} × ${dto.quantity}`);
      return tx.select().from(invProducts).where(eq(invProducts.id, productId)).get();
    });
  }

  // ── 消费（从批次扣减） ──

  async consume(productId: number, familyId: number, userId: number, dto: ConsumeDto): Promise<any> {
    return this.db.transaction((tx: TransactionContext) => {
      const product = tx.select().from(invProducts)
        .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
        .get();
      if (!product) throw new NotFoundException('产品不存在');

      // 检查库存
      const totalStock = tx.select({ total: sql<number>`COALESCE(SUM(${invBatches.quantity}), 0)` })
        .from(invBatches)
        .where(eq(invBatches.productId, productId))
        .get();
      if (totalStock.total < dto.quantity) {
        throw new BadRequestException(`库存不足：当前 ${totalStock.total}，无法消费 ${dto.quantity}`);
      }

      let remaining = dto.quantity;

      if (dto.batchId) {
        // 指定批次消费
        const batch = tx.select().from(invBatches)
          .where(eq(invBatches.id, dto.batchId))
          .get();
        if (!batch || batch.productId !== productId) {
          throw new BadRequestException('批次不存在或不属于该产品');
        }
        if (batch.quantity < dto.quantity) {
          throw new BadRequestException(`批次库存不足：${batch.quantity}`);
        }
        tx.update(invBatches).set({ quantity: batch.quantity - dto.quantity })
          .where(eq(invBatches.id, dto.batchId)).run();
        remaining = 0;
      } else {
        // FIFO：从最早过期的批次扣减
        const batches = tx.select().from(invBatches)
          .where(and(eq(invBatches.productId, productId), sql`${invBatches.quantity} > 0`))
          .orderBy(
            asc(sql`COALESCE(${invBatches.expiryDate}, 9999999999)`),
            asc(invBatches.createdAt),
          )
          .all();

        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(batch.quantity, remaining);
          tx.update(invBatches).set({ quantity: batch.quantity - take })
            .where(eq(invBatches.id, batch.id)).run();
          remaining -= take;
        }
      }

      // 记录流水
      tx.insert(invStockLog).values({
        productId,
        type: 'consume',
        quantity: dto.quantity,
        unit: product.stockUnit || product.unit,
        userId,
        source: 'manual',
        note: dto.note,
        spoiled: dto.spoiled || 0,
      }).run();

      this.logger.log(`消费: ${product.name} × ${dto.quantity}`);
      return tx.select().from(invProducts).where(eq(invProducts.id, productId)).get();
    });
  }

  // ── 转移 ──

  async transfer(productId: number, familyId: number, userId: number, dto: TransferDto): Promise<any> {
    return this.db.transaction((tx: TransactionContext) => {
      const product = tx.select().from(invProducts)
        .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
        .get();
      if (!product) throw new NotFoundException('产品不存在');

      // 更新产品默认位置
      tx.update(invProducts).set({ locationId: dto.toLocationId, updatedAt: new Date() })
        .where(eq(invProducts.id, productId)).run();

      // 记录流水
      tx.insert(invStockLog).values({
        productId,
        type: 'transfer',
        quantity: dto.quantity || 0,
        unit: product.stockUnit || product.unit,
        fromLocationId: product.locationId,
        toLocationId: dto.toLocationId,
        userId,
        source: 'manual',
      }).run();

      return tx.select().from(invProducts).where(eq(invProducts.id, productId)).get();
    });
  }

  // ── 调整 ──

  async adjust(productId: number, familyId: number, userId: number, dto: AdjustDto): Promise<any> {
    return this.db.transaction((tx: TransactionContext) => {
      const product = tx.select().from(invProducts)
        .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
        .get();
      if (!product) throw new NotFoundException('产品不存在');

      // 获取当前库存
      const totalStock = tx.select({ total: sql<number>`COALESCE(SUM(${invBatches.quantity}), 0)` })
        .from(invBatches)
        .where(eq(invBatches.productId, productId))
        .get();

      // 记录流水
      tx.insert(invStockLog).values({
        productId,
        type: 'adjust',
        quantity: Math.abs(dto.quantity - totalStock.total),
        unit: product.stockUnit || product.unit,
        userId,
        source: 'manual',
        note: dto.note,
      }).run();

      // 调整：直接修改第一个批次的数量
      const firstBatch = tx.select().from(invBatches)
        .where(eq(invBatches.productId, productId))
        .orderBy(asc(invBatches.createdAt))
        .get();

      if (firstBatch) {
        tx.update(invBatches).set({ quantity: dto.quantity })
          .where(eq(invBatches.id, firstBatch.id)).run();
      }

      return tx.select().from(invProducts).where(eq(invProducts.id, productId)).get();
    });
  }

  // ── 标记开封 ──

  async openProduct(productId: number, familyId: number, userId: number): Promise<any> {
    return this.db.transaction((tx: TransactionContext) => {
      const product = tx.select().from(invProducts)
        .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
        .get();
      if (!product) throw new NotFoundException('产品不存在');

      // 标记最早过期的未开封批次为已开封
      const batch = tx.select().from(invBatches)
        .where(and(eq(invBatches.productId, productId), eq(invBatches.open, 0)))
        .orderBy(asc(sql`COALESCE(${invBatches.expiryDate}, 9999999999)`))
        .get();

      if (batch) {
        tx.update(invBatches).set({ open: 1, openedDate: new Date() })
          .where(eq(invBatches.id, batch.id)).run();
      }

      // 记录流水
      tx.insert(invStockLog).values({
        productId,
        type: 'open',
        quantity: 0,
        unit: product.stockUnit || product.unit,
        userId,
        source: 'manual',
      }).run();

      return tx.select().from(invProducts).where(eq(invProducts.id, productId)).get();
    });
  }

  // ── 批次管理 ──

  async listBatches(productId: number, familyId: number) {
    const product = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
      .get();
    if (!product) throw new NotFoundException('产品不存在');

    return this.db.select().from(invBatches)
      .where(eq(invBatches.productId, productId))
      .orderBy(asc(sql`COALESCE(${invBatches.expiryDate}, 9999999999)`))
      .all();
  }

  async getBatchSummary(productId: number, familyId: number) {
    const product = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
      .get();
    if (!product) throw new NotFoundException('产品不存在');

    const nowSeconds = Math.floor(Date.now() / 1000);
    const batches = await this.db.select().from(invBatches)
      .where(and(eq(invBatches.productId, productId), sql`${invBatches.quantity} > 0`))
      .orderBy(asc(sql`COALESCE(${invBatches.expiryDate}, 9999999999)`))
      .all();

    return batches.map((b: any) => ({
      ...b,
      isExpired: b.expiryDate ? b.expiryDate.getTime() < nowSeconds * 1000 : false,
      daysUntilExpiry: b.expiryDate
        ? Math.ceil((b.expiryDate.getTime() - nowSeconds * 1000) / (1000 * 60 * 60 * 24))
        : null,
    }));
  }

  async updateBatch(batchId: number, familyId: number, dto: UpdateBatchDto): Promise<BatchSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const batch = tx.select().from(invBatches)
        .where(eq(invBatches.id, batchId))
        .get();
      if (!batch) throw new NotFoundException('批次不存在');

      const updates: Record<string, any> = {};
      if (dto.batchNumber !== undefined) updates.batchNumber = dto.batchNumber;
      if (dto.quantity !== undefined) updates.quantity = dto.quantity;
      if (dto.expiryDate !== undefined) updates.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
      if (dto.purchaseDate !== undefined) updates.purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : null;
      if (dto.locationId !== undefined) updates.locationId = dto.locationId;
      if (dto.shop !== undefined) updates.shop = dto.shop;
      if (dto.price !== undefined) updates.price = dto.price;

      if (Object.keys(updates).length > 0) {
        tx.update(invBatches).set(updates).where(eq(invBatches.id, batchId)).run();
      }

      return tx.select().from(invBatches).where(eq(invBatches.id, batchId)).get() as BatchSelect;
    });
  }

  async deleteBatch(batchId: number, familyId: number) {
    return this.db.transaction((tx: TransactionContext) => {
      const batch = tx.select().from(invBatches)
        .where(eq(invBatches.id, batchId))
        .get();
      if (!batch) throw new NotFoundException('批次不存在');

      tx.delete(invBatches).where(eq(invBatches.id, batchId)).run();
      return { success: true };
    });
  }

  // ── 价格历史 ──

  async getPriceHistory(productId: number, familyId: number) {
    const product = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, productId), eq(invProducts.familyId, familyId)))
      .get();
    if (!product) throw new NotFoundException('产品不存在');

    const transactions = await this.db.select().from(invStockLog)
      .where(and(
        eq(invStockLog.productId, productId),
        eq(invStockLog.type, 'purchase'),
      ))
      .orderBy(desc(invStockLog.createdAt))
      .all();

    const history = transactions.map((t: any) => ({
      date: t.createdAt,
      price: t.price,
      quantity: t.quantity,
      unit: t.unit,
      note: t.note,
      store: t.shop,
    }));

    return {
      currentPrice: product.defaultPrice,
      history,
    };
  }

  // ── 统计 ──

  async getSummary(familyId: number) {
    const totalProducts = await this.db.select({ count: sql<number>`count(*)` })
      .from(invProducts)
      .where(eq(invProducts.familyId, familyId))
      .get();

    const totalQuantity = await this.db.select({ total: sql<number>`COALESCE(SUM(b.quantity), 0)` })
      .from(invBatches)
      .innerJoin(invProducts, eq(invBatches.productId, invProducts.id))
      .where(eq(invProducts.familyId, familyId))
      .get();

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiringCount = await this.db.select({ count: sql<number>`count(DISTINCT b.product_id)` })
      .from(invBatches as any)
      .innerJoin(invProducts as any, sql`${(invBatches as any).productId} = ${invProducts as any}.id`)
      .where(and(
        sql`${(invProducts as any).familyId} = ${familyId}`,
        sql`${(invBatches as any).expiryDate} <= ${Math.floor(daysFromNow(7) / 1000)}`,
        sql`${(invBatches as any).expiryDate} > ${nowSeconds}`,
      ))
      .get();

    return {
      totalProducts: totalProducts?.count || 0,
      totalQuantity: totalQuantity?.total || 0,
      expiringCount: expiringCount?.count || 0,
    };
  }

  // ── 搜索 ──

  async searchProducts(
    familyId: number,
    query: string,
    pagination?: PaginationQuery,
  ): Promise<PaginationResponse<any>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;
    const searchPattern = `%${query}%`;

    const conditions = [
      eq(invProducts.familyId, familyId),
      sql`${invProducts.name} LIKE ${searchPattern}`,
    ];

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(invProducts)
      .where(and(...conditions));

    const data = await this.db
      .select()
      .from(invProducts)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return new PaginationResponse(data as any, total, page, limit);
  }

  // ── 插件集成 ──

  getItemTypeConfig(typeName: string) {
    return this.registry.getPluginByType<any>('item-type', typeName);
  }
}
