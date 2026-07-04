import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { eq, and, sql, desc, count, asc } from 'drizzle-orm';
import { invItems, invItemBatches, invStockTransactions, invProducts, mdUnits, mdLocations } from '../../db/schema';
import { CreateItemDto, UpdateItemDto, ConsumeItemDto, TransferItemDto, AdjustItemDto, StockInItemDto, CreateBatchDto, UpdateBatchDto } from './dto/stock.dto';
import { DATABASE_TOKEN } from '../../db/database.module';
import type { Database, TransactionContext } from '../../db/types';
import { PaginationQuery, PaginationResponse, pickDefined, daysFromNow } from '../../common';
import { ItemSelect, ItemBatchSelect } from '../../db/types';
import { PluginRegistryService } from '../../plugins/registry/plugin-registry.service';
import { ItemTypePluginExports } from '../../plugins/types/plugin.types';
import { ListsService } from '../lists/lists.service';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly registry: PluginRegistryService,
    private readonly listsService: ListsService,
  ) {}

  async list(
    familyId: number,
    query?: { category?: string; location?: string; expiring?: number },
    pagination?: PaginationQuery,
  ): Promise<PaginationResponse<ItemSelect>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(invItems.familyId, familyId)];
    if (query?.category) {
      conditions.push(eq(invItems.type, query.category));
    }
    if (query?.location) {
      conditions.push(eq(invItems.locationId, parseInt(query.location)));
    }
    if (query?.expiring) {
      const deadline = Math.floor(daysFromNow(query.expiring) / 1000);
      conditions.push(sql`${invItems.expiryDate} <= ${deadline}`);
    }

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(invItems)
      .where(and(...conditions));

    const data = await this.db
      .select()
      .from(invItems)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return new PaginationResponse(data as ItemSelect[], total, page, limit);
  }

  async getById(itemId: number): Promise<ItemSelect> {
    const item = await this.db.select().from(invItems).where(eq(invItems.id, itemId)).get();
    if (!item) throw new NotFoundException('物品不存在');
    return item as ItemSelect;
  }

  async create(familyId: number, dto: CreateItemDto, userId: number): Promise<ItemSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const insertResult = tx.insert(invItems).values({
        familyId,
        name: dto.name,
        type: dto.type || 'generic',
        barcode: dto.barcode,
        categoryId: dto.categoryId,
        locationId: dto.locationId,
        quantity: dto.quantity ?? 1,
        unit: dto.unit || '个',
        minStock: dto.minStock ?? 0,
        brand: dto.brand,
        notes: dto.notes,
        image: dto.image,
        purchasePrice: dto.purchasePrice,
        currency: dto.currency || 'CNY',
        lastPrice: dto.purchasePrice,
        avgPrice: dto.purchasePrice,
        minPrice: dto.purchasePrice,
        maxPrice: dto.purchasePrice,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        customFields: dto.customFields,
      }).run();

      const itemId = Number(insertResult.lastInsertRowid);
      const initialQty = dto.quantity ?? 1;

      // Create initial batch record
      const batchResult = tx.insert(invItemBatches).values({
        itemId,
        quantity: initialQty,
        unit: dto.unit || '个',
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        locationId: dto.locationId,
      }).run();

      const batchId = Number(batchResult.lastInsertRowid);

      tx.insert(invStockTransactions).values({
        itemId,
        batchId,
        type: 'add',
        quantity: initialQty,
        unit: dto.unit || '个',
        toLocationId: dto.locationId,
        userId,
        source: 'manual',
      }).run();

      this.logger.log(`创建物品: ${dto.name} (ID: ${itemId}, 家庭: ${familyId})`);
      return tx.select().from(invItems).where(eq(invItems.id, itemId)).get();
    });
  }

  async update(itemId: number, familyId: number, dto: UpdateItemDto): Promise<ItemSelect> {
    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('物品不存在');

    const updates = pickDefined(dto as Record<string, unknown>, [
      'name', 'type', 'barcode', 'categoryId', 'locationId',
      'quantity', 'unit', 'minStock', 'brand', 'notes', 'image',
      'purchasePrice', 'currency', 'customFields',
    ]);

    if (dto.expiryDate !== undefined) {
      (updates as Record<string, unknown>).expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    }

    // Handle "opened" state change — auto-adjust expiry + auto-transfer
    if (dto.currentState === 'opened' && item.currentState !== 'opened') {
      (updates as Record<string, unknown>).currentState = 'opened';
      (updates as Record<string, unknown>).stateChangedAt = new Date();

      // Auto-adjust expiry if product has defaultBestBeforeDaysAfterOpen
      if (!item.expiryDate && item.productId) {
        const product = await this.db.select().from(invProducts)
          .where(eq(invProducts.id, item.productId))
          .get();
        if (product?.defaultBestBeforeDaysAfterOpen) {
          const newExpiry = new Date(Date.now() + product.defaultBestBeforeDaysAfterOpen * 86400000);
          (updates as Record<string, unknown>).expiryDate = newExpiry;
          this.logger.log(`自动调整到期日: ${item.name} → ${newExpiry.toISOString()}`);
        }
        // Auto-transfer to moveOnOpenLocationId
        if (product?.moveOnOpenLocationId && product.moveOnOpenLocationId !== item.locationId) {
          (updates as Record<string, unknown>).locationId = product.moveOnOpenLocationId;
          this.logger.log(`自动转移: ${item.name} → 位置 ${product.moveOnOpenLocationId}`);
        }
      }
    } else if (dto.currentState !== undefined) {
      (updates as Record<string, unknown>).currentState = dto.currentState;
      (updates as Record<string, unknown>).stateChangedAt = new Date();
    }

    (updates as Record<string, unknown>).updatedAt = new Date();

    await this.db.update(invItems).set(updates as Partial<typeof invItems.$inferInsert>).where(eq(invItems.id, itemId)).run();
    return this.getById(itemId);
  }

  async delete(itemId: number, familyId: number) {
    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('物品不存在');
    await this.db.delete(invStockTransactions).where(eq(invStockTransactions.itemId, itemId)).run();
    await this.db.delete(invItems).where(eq(invItems.id, itemId)).run();
    this.logger.log(`删除物品: ${item.name} (ID: ${itemId})`);
    return { success: true };
  }

  async consume(itemId: number, familyId: number, userId: number, dto: ConsumeItemDto): Promise<ItemSelect> {
    const result = await this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(invItems)
        .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      if (dto.quantity > item.quantity) {
        throw new BadRequestException(`库存不足：当前 ${item.quantity}，无法消费 ${dto.quantity}`);
      }

      let remaining = dto.quantity;
      const consumedBatches: Array<{ batchId: number; quantity: number }> = [];

      if (dto.batchId) {
        // Specific batch requested
        const batch = tx.select().from(invItemBatches)
          .where(eq(invItemBatches.id, dto.batchId))
          .get();
        if (!batch || batch.itemId !== itemId) {
          throw new BadRequestException('批次不存在或不属于该物品');
        }
        if (batch.quantity < dto.quantity) {
          throw new BadRequestException(`批次库存不足：批次 ${batch.batchNumber || batch.id} 当前 ${batch.quantity}，无法消费 ${dto.quantity}`);
        }
        tx.update(invItemBatches)
          .set({ quantity: batch.quantity - dto.quantity })
          .where(eq(invItemBatches.id, dto.batchId))
          .run();
        consumedBatches.push({ batchId: dto.batchId, quantity: dto.quantity });
        remaining = 0;
      } else {
        // FIFO: consume from earliest expiry first, then earliest created
        const batches = tx.select().from(invItemBatches)
          .where(and(
            eq(invItemBatches.itemId, itemId),
            sql`${invItemBatches.quantity} > 0`,
          ))
          .orderBy(
            asc(sql`COALESCE(${invItemBatches.expiryDate}, 9999999999)`),
            asc(invItemBatches.createdAt),
          )
          .all();

        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(batch.quantity, remaining);
          tx.update(invItemBatches)
            .set({ quantity: batch.quantity - take })
            .where(eq(invItemBatches.id, batch.id))
            .run();
          consumedBatches.push({ batchId: batch.id, quantity: take });
          remaining -= take;
        }

        if (remaining > 0) {
          throw new BadRequestException(`库存不足：批次总量不足以消费 ${dto.quantity}`);
        }
      }

      const newQty = item.quantity - dto.quantity;
      tx.update(invItems).set({ quantity: newQty, updatedAt: new Date(), lastUsedAt: new Date() }).where(eq(invItems.id, itemId)).run();

      // Record transaction for each consumed batch
      for (const cb of consumedBatches) {
        tx.insert(invStockTransactions).values({
          itemId,
          batchId: cb.batchId,
          type: 'consume',
          quantity: cb.quantity,
          unit: item.unit,
          spoiled: cb.batchId === consumedBatches[consumedBatches.length - 1]?.batchId ? (dto.spoiled || 0) : 0,
          fromLocationId: item.locationId,
          userId,
          source: 'manual',
          note: dto.note,
        }).run();
      }

      this.logger.log(`消费物品: ${item.name} (ID: ${itemId}, 数量: ${dto.quantity}, 批次: ${consumedBatches.map(b => b.batchId).join(',')})`);
      return tx.select().from(invItems).where(eq(invItems.id, itemId)).get();
    });

    // Auto-replenish: if below minStock, add to shopping list (outside transaction)
    if (result && result.minStock && result.quantity <= result.minStock) {
      try {
        await this.listsService.autoReplenish(familyId, userId);
        this.logger.log(`自动补货: ${result.name} 已低于最低库存 ${result.minStock}`);
      } catch (e) {
        this.logger.warn(`自动补货失败: ${(e as Error).message}`);
      }
    }

    return result;
  }

  async stockIn(itemId: number, familyId: number, userId: number, dto: StockInItemDto): Promise<ItemSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(invItems)
        .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      // Auto-calculate expiry date from product defaults if not provided
      let expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
      if (!expiryDate && item.productId) {
        const product = tx.select().from(invProducts)
          .where(eq(invProducts.id, item.productId))
          .get();
        if (product?.defaultBestBeforeDays) {
          const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();
          expiryDate = new Date(purchaseDate.getTime() + product.defaultBestBeforeDays * 86400000);
        }
      }

      const newQty = item.quantity + dto.quantity;

      // Create batch record for this stock-in
      const batchResult = tx.insert(invItemBatches).values({
        itemId,
        batchNumber: dto.batchNumber || null,
        quantity: dto.quantity,
        unit: item.unit,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        expiryDate,
        locationId: dto.locationId || item.locationId,
      }).run();

      const batchId = Number(batchResult.lastInsertRowid);

      // Update price statistics if price is provided
      const priceUpdates: Record<string, any> = { quantity: newQty, updatedAt: new Date() };
      if (dto.price !== undefined && dto.price !== null) {
        priceUpdates.purchasePrice = dto.price;
        priceUpdates.lastPrice = dto.price;

        const currentAvg = item.avgPrice || item.purchasePrice || dto.price;
        const currentMin = item.minPrice || item.purchasePrice || dto.price;
        const currentMax = item.maxPrice || item.purchasePrice || dto.price;
        const totalQuantity = item.quantity + dto.quantity;

        const oldTotalValue = item.quantity * currentAvg;
        const newTotalValue = dto.quantity * dto.price;
        priceUpdates.avgPrice = totalQuantity > 0 ? (oldTotalValue + newTotalValue) / totalQuantity : dto.price;
        priceUpdates.minPrice = Math.min(currentMin, dto.price);
        priceUpdates.maxPrice = Math.max(currentMax, dto.price);
      }

      tx.update(invItems).set(priceUpdates).where(eq(invItems.id, itemId)).run();

      tx.insert(invStockTransactions).values({
        itemId,
        batchId,
        type: 'add',
        quantity: dto.quantity,
        unit: item.unit,
        toLocationId: dto.locationId || item.locationId,
        userId,
        source: 'manual',
        note: dto.note,
      }).run();

      this.logger.log(`入库物品: ${item.name} (ID: ${itemId}, 入库数量: ${dto.quantity}, 批次: ${batchId})`);
      return tx.select().from(invItems).where(eq(invItems.id, itemId)).get();
    });
  }

  async transfer(itemId: number, familyId: number, userId: number, dto: TransferItemDto): Promise<ItemSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(invItems)
        .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      const quantity = dto.quantity ?? item.quantity;

      // Check if target location is freezer — extend expiry
      const targetLoc = tx.select().from(mdLocations)
        .where(eq(mdLocations.id, dto.toLocationId))
        .get();
      const updates: Record<string, any> = { locationId: dto.toLocationId, updatedAt: new Date() };
      if (targetLoc?.type === 'freezer' && item.expiryDate) {
        // Extend expiry by 30 days for freezer
        const extended = new Date(item.expiryDate.getTime() + 30 * 86400000);
        updates.expiryDate = extended;
        this.logger.log(`冷冻转移: ${item.name} 到期日延长至 ${extended.toISOString()}`);
      }

      tx.update(invItems).set(updates).where(eq(invItems.id, itemId)).run();

      tx.insert(invStockTransactions).values({
        itemId,
        type: 'transfer',
        quantity,
        unit: item.unit,
        fromLocationId: item.locationId,
        toLocationId: dto.toLocationId,
        userId,
        source: 'manual',
      }).run();

      return tx.select().from(invItems).where(eq(invItems.id, itemId)).get();
    });
  }

  async adjust(itemId: number, familyId: number, userId: number, dto: AdjustItemDto): Promise<ItemSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(invItems)
        .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      tx.update(invItems)
        .set({ quantity: dto.quantity, updatedAt: new Date() })
        .where(eq(invItems.id, itemId))
        .run();

      tx.insert(invStockTransactions).values({
        itemId,
        type: 'adjust',
        quantity: Math.abs(dto.quantity - item.quantity),
        unit: item.unit,
        userId,
        source: 'manual',
        note: dto.note,
      }).run();

      return tx.select().from(invItems).where(eq(invItems.id, itemId)).get();
    });
  }

  async getHistory(itemId: number, familyId: number) {
    // Verify item belongs to family (prevent cross-family access)
    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('物品不存在');

    return this.db.select().from(invStockTransactions)
      .where(eq(invStockTransactions.itemId, itemId))
      .orderBy(desc(invStockTransactions.createdAt))
      .all();
  }

  async getExpiring(familyId: number, days: number = 7) {
    const deadline = Math.floor(daysFromNow(days) / 1000);
    const now = Math.floor(Date.now() / 1000);
    return this.db.select().from(invItems)
      .where(and(
        eq(invItems.familyId, familyId),
        sql`${invItems.expiryDate} <= ${deadline}`,
        sql`${invItems.expiryDate} > ${now}`,
      ))
      .all();
  }

  async getSummary(familyId: number) {
    const totalItems = await this.db.select({ count: sql<number>`count(*)` })
      .from(invItems).where(eq(invItems.familyId, familyId)).get();

    const expiringCount = await this.db.select({ count: sql<number>`count(*)` })
      .from(invItems)
      .where(and(
        eq(invItems.familyId, familyId),
        sql`${invItems.expiryDate} <= ${daysFromNow(7)}`,
        sql`${invItems.expiryDate} > ${Date.now()}`,
      )).get();

    const expiredCount = await this.db.select({ count: sql<number>`count(*)` })
      .from(invItems)
      .where(and(
        eq(invItems.familyId, familyId),
        sql`${invItems.expiryDate} <= ${Date.now()}`,
      )).get();

    return {
      totalItems: totalItems?.count || 0,
      expiringCount: expiringCount?.count || 0,
      expiredCount: expiredCount?.count || 0,
    };
  }

  async search(
    familyId: number,
    query: string,
    pagination?: PaginationQuery,
  ): Promise<PaginationResponse<ItemSelect>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;
    const searchPattern = `%${query}%`;

    const conditions = [
      eq(invItems.familyId, familyId),
      sql`${invItems.name} LIKE ${searchPattern}`,
    ];

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(invItems)
      .where(and(...conditions));

    const data = await this.db
      .select()
      .from(invItems)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return new PaginationResponse(data as ItemSelect[], total, page, limit);
  }

  async createBatch(itemId: number, familyId: number, dto: CreateBatchDto): Promise<ItemBatchSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(invItems)
        .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      const batchResult = tx.insert(invItemBatches).values({
        itemId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        unit: dto.unit,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        locationId: dto.locationId || item.locationId,
      }).run();

      tx.update(invItems)
        .set({ quantity: item.quantity + dto.quantity, updatedAt: new Date() })
        .where(eq(invItems.id, itemId))
        .run();

      const batchId = Number(batchResult.lastInsertRowid);
      return tx.select().from(invItemBatches).where(eq(invItemBatches.id, batchId)).get();
    });
  }

  async listBatches(itemId: number) {
    return this.db.select().from(invItemBatches)
      .where(eq(invItemBatches.itemId, itemId))
      .orderBy(asc(sql`COALESCE(${invItemBatches.expiryDate}, 9999999999)`))
      .all();
  }

  async getBatchSummary(itemId: number) {
    const batches = await this.db.select().from(invItemBatches)
      .where(and(eq(invItemBatches.itemId, itemId), sql`${invItemBatches.quantity} > 0`))
      .orderBy(asc(sql`COALESCE(${invItemBatches.expiryDate}, 9999999999)`))
      .all();

    return batches.map((b: ItemBatchSelect) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      quantity: b.quantity,
      unit: b.unit,
      expiryDate: b.expiryDate,
      purchaseDate: b.purchaseDate,
      locationId: b.locationId,
      createdAt: b.createdAt,
      isExpired: b.expiryDate ? b.expiryDate.getTime() < Date.now() : false,
      daysUntilExpiry: b.expiryDate
        ? Math.ceil((b.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  }

  async editBatch(batchId: number, familyId: number, dto: UpdateBatchDto): Promise<ItemBatchSelect> {
    const batch = await this.db.select().from(invItemBatches)
      .where(eq(invItemBatches.id, batchId))
      .get();
    if (!batch) throw new NotFoundException('批次不存在');

    // Verify the batch belongs to an item in the family
    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, batch.itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('批次不存在');

    const updates: Record<string, any> = {};
    if (dto.batchNumber !== undefined) updates.batchNumber = dto.batchNumber;
    if (dto.quantity !== undefined) {
      const diff = dto.quantity - batch.quantity;
      updates.quantity = dto.quantity;
      // Also update item total quantity
      await this.db.update(invItems)
        .set({ quantity: item.quantity + diff, updatedAt: new Date() })
        .where(eq(invItems.id, batch.itemId))
        .run();
    }
    if (dto.expiryDate !== undefined) {
      updates.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    }
    if (dto.purchaseDate !== undefined) {
      updates.purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : null;
    }
    if (dto.locationId !== undefined) {
      updates.locationId = dto.locationId;
    }

    if (Object.keys(updates).length > 0) {
      await this.db.update(invItemBatches).set(updates).where(eq(invItemBatches.id, batchId)).run();
    }

    return this.db.select().from(invItemBatches).where(eq(invItemBatches.id, batchId)).get() as Promise<ItemBatchSelect>;
  }

  async deleteBatch(batchId: number, familyId: number) {
    const batch = await this.db.select().from(invItemBatches)
      .where(eq(invItemBatches.id, batchId))
      .get();
    if (!batch) throw new NotFoundException('批次不存在');

    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, batch.itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('批次不存在');

    // Reduce item quantity by batch quantity
    const newQty = Math.max(0, item.quantity - batch.quantity);
    await this.db.update(invItems)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(invItems.id, batch.itemId))
      .run();

    await this.db.delete(invItemBatches).where(eq(invItemBatches.id, batchId)).run();
    return { success: true };
  }

  /**
   * Compact batches: merge batches with same expiry date and location
   */
  async compactBatches(itemId: number, familyId: number) {
    // Verify item exists and belongs to family
    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('物品不存在');

    // Get all batches with quantity > 0
    const batches = await this.db.select().from(invItemBatches)
      .where(and(eq(invItemBatches.itemId, itemId), sql`${invItemBatches.quantity} > 0`))
      .orderBy(invItemBatches.createdAt)
      .all();

    // Group by expiryDate + locationId
    const groups = new Map<string, typeof batches>();
    for (const batch of batches) {
      const key = `${batch.expiryDate?.getTime() || 0}_${batch.locationId || 0}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(batch);
    }

    let mergedCount = 0;
    for (const [, groupBatches] of groups) {
      if (groupBatches.length <= 1) continue;

      // Keep the first batch, merge others into it
      const primary = groupBatches[0];
      let totalQty = primary.quantity;
      const batchIdsToDelete: number[] = [];

      for (let i = 1; i < groupBatches.length; i++) {
        totalQty += groupBatches[i].quantity;
        batchIdsToDelete.push(groupBatches[i].id);
      }

      // Update primary batch quantity
      await this.db.update(invItemBatches)
        .set({ quantity: totalQty })
        .where(eq(invItemBatches.id, primary.id))
        .run();

      // Delete merged batches
      for (const id of batchIdsToDelete) {
        await this.db.delete(invItemBatches).where(eq(invItemBatches.id, id)).run();
      }

      mergedCount += batchIdsToDelete.length;
    }

    return { merged: mergedCount, message: `合并了 ${mergedCount} 个批次` };
  }

  /**
   * Get child products of a parent product
   */
  async getChildProducts(productId: number) {
    return this.db.select().from(invProducts)
      .where(eq(invProducts.parentId, productId))
      .all();
  }

  /**
   * Get aggregated stock for a parent product (including children)
   */
  async getAggregatedStock(productId: number, familyId: number) {
    const parent = await this.db.select().from(invProducts)
      .where(eq(invProducts.id, productId))
      .get();
    if (!parent) return null;

    const children = await this.getChildProducts(productId);
    const childIds = children.map((c: any) => c.id);

    // Get stock for parent item
    const parentItem = await this.db.select().from(invItems)
      .where(and(eq(invItems.productId, productId), eq(invItems.familyId, familyId)))
      .get();

    // Get stock for child items
    let childTotalQty = 0;
    for (const childId of childIds) {
      const childItem = await this.db.select().from(invItems)
        .where(and(eq(invItems.productId, childId), eq(invItems.familyId, familyId)))
        .get();
      if (childItem) childTotalQty += childItem.quantity;
    }

    return {
      productId,
      name: parent.name,
      unit: parent.unit,
      parentQuantity: parentItem?.quantity || 0,
      childQuantity: childTotalQty,
      totalQuantity: (parentItem?.quantity || 0) + childTotalQty,
      childCount: children.length,
    };
  }

  // === ItemType Plugin Integration ===

  getItemTypeConfig(typeName: string): ItemTypePluginExports | null {
    return this.registry.getPluginByType<ItemTypePluginExports>('item-type', typeName);
  }

  /**
   * Convert quantity from one unit to another using mdUnits conversion factors.
   * Returns the converted quantity and the target unit name.
   */
  private convertUnit(quantity: number, fromUnit: string, toUnit: string): { quantity: number; unit: string } {
    if (fromUnit === toUnit) return { quantity, unit: toUnit };

    // Find the units in mdUnits
    const fromUnitRow = this.db.select().from(mdUnits)
      .where(eq(mdUnits.name, fromUnit))
      .get();
    const toUnitRow = this.db.select().from(mdUnits)
      .where(eq(mdUnits.name, toUnit))
      .get();

    // Both units must have the same parent to be convertible
    if (fromUnitRow && toUnitRow && fromUnitRow.parentId && fromUnitRow.parentId === toUnitRow.parentId) {
      const converted = quantity * (fromUnitRow.conversionFactor / toUnitRow.conversionFactor);
      return { quantity: Math.round(converted * 100) / 100, unit: toUnit };
    }

    // If same parent group not found, return original
    return { quantity, unit: fromUnit };
  }
}
