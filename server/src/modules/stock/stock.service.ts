import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { items, itemBatches, stockTransactions } from '../../db/schema';
import { CreateItemDto, UpdateItemDto, ConsumeItemDto, TransferItemDto, AdjustItemDto, StockInItemDto, CreateBatchDto } from './dto/stock.dto';
import { DATABASE_TOKEN } from '../../db/database.module';
import type { Database, TransactionContext } from '../../db/types';
import { PaginationQuery, PaginationResponse, pickDefined, daysFromNow } from '../../common';
import { ItemSelect, ItemBatchSelect } from '../../db/types';
import { PluginRegistryService } from '../../plugins/registry/plugin-registry.service';
import { ItemTypePluginExports } from '../../plugins/types/plugin.types';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly registry: PluginRegistryService,
  ) {}

  async list(
    familyId: number,
    query?: { category?: string; location?: string; expiring?: number },
    pagination?: PaginationQuery,
  ): Promise<PaginationResponse<ItemSelect>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(items.familyId, familyId)];
    if (query?.category) {
      conditions.push(eq(items.type, query.category));
    }
    if (query?.location) {
      conditions.push(eq(items.locationId, parseInt(query.location)));
    }
    if (query?.expiring) {
      const deadline = daysFromNow(query.expiring);
      conditions.push(sql`${items.expiryDate} <= ${deadline}`);
    }

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(items)
      .where(and(...conditions));

    const data = await this.db
      .select()
      .from(items)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return new PaginationResponse(data as ItemSelect[], total, page, limit);
  }

  async getById(itemId: number): Promise<ItemSelect> {
    const item = await this.db.select().from(items).where(eq(items.id, itemId)).get();
    if (!item) throw new NotFoundException('物品不存在');
    return item as ItemSelect;
  }

  async create(familyId: number, dto: CreateItemDto, userId: number): Promise<ItemSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const insertResult = tx.insert(items).values({
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

      tx.insert(stockTransactions).values({
        itemId,
        type: 'add',
        quantity: dto.quantity ?? 1,
        unit: dto.unit || '个',
        toLocationId: dto.locationId,
        userId,
        source: 'manual',
      });

      this.logger.log(`创建物品: ${dto.name} (ID: ${itemId}, 家庭: ${familyId})`);
      return tx.select().from(items).where(eq(items.id, itemId)).get();
    });
  }

  async update(itemId: number, familyId: number, dto: UpdateItemDto): Promise<ItemSelect> {
    const item = await this.db.select().from(items)
      .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
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
    (updates as Record<string, unknown>).updatedAt = new Date();

    await this.db.update(items).set(updates as Partial<typeof items.$inferInsert>).where(eq(items.id, itemId)).run();
    return this.getById(itemId);
  }

  async delete(itemId: number, familyId: number) {
    const item = await this.db.select().from(items)
      .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
      .get();
    if (!item) throw new NotFoundException('物品不存在');
    await this.db.delete(items).where(eq(items.id, itemId)).run();
    this.logger.log(`删除物品: ${item.name} (ID: ${itemId})`);
    return { success: true };
  }

  async consume(itemId: number, familyId: number, userId: number, dto: ConsumeItemDto): Promise<ItemSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(items)
        .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      if (dto.quantity > item.quantity) {
        throw new BadRequestException(`库存不足：当前 ${item.quantity}，无法消费 ${dto.quantity}`);
      }

      const newQty = item.quantity - dto.quantity;
      tx.update(items).set({ quantity: newQty, updatedAt: new Date() }).where(eq(items.id, itemId)).run();

      tx.insert(stockTransactions).values({
        itemId,
        type: 'consume',
        quantity: dto.quantity,
        unit: item.unit,
        fromLocationId: item.locationId,
        userId,
        source: 'manual',
        note: dto.note,
      });

      this.logger.log(`消费物品: ${item.name} (ID: ${itemId}, 数量: ${dto.quantity})`);
      return tx.select().from(items).where(eq(items.id, itemId)).get();
    });
  }

  async stockIn(itemId: number, familyId: number, userId: number, dto: StockInItemDto): Promise<ItemSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(items)
        .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      const newQty = item.quantity + dto.quantity;

      // Update price statistics if price is provided
      const priceUpdates: Record<string, any> = { quantity: newQty, updatedAt: new Date() };
      if (dto.price !== undefined && dto.price !== null) {
        priceUpdates.purchasePrice = dto.price;
        priceUpdates.lastPrice = dto.price;

        // Update avg, min, max prices
        const currentAvg = item.avgPrice || item.purchasePrice || dto.price;
        const currentMin = item.minPrice || item.purchasePrice || dto.price;
        const currentMax = item.maxPrice || item.purchasePrice || dto.price;
        const totalQuantity = item.quantity + dto.quantity;

        // Weighted average: (oldTotal + newTotal) / newTotalQuantity
        const oldTotalValue = item.quantity * currentAvg;
        const newTotalValue = dto.quantity * dto.price;
        priceUpdates.avgPrice = totalQuantity > 0 ? (oldTotalValue + newTotalValue) / totalQuantity : dto.price;

        priceUpdates.minPrice = Math.min(currentMin, dto.price);
        priceUpdates.maxPrice = Math.max(currentMax, dto.price);
      }

      tx.update(items).set(priceUpdates).where(eq(items.id, itemId)).run();

      tx.insert(stockTransactions).values({
        itemId,
        type: 'stock-in',
        quantity: dto.quantity,
        unit: item.unit,
        toLocationId: item.locationId,
        userId,
        source: 'manual',
        note: dto.note,
      });

      this.logger.log(`入库物品: ${item.name} (ID: ${itemId}, 入库数量: ${dto.quantity})`);
      return tx.select().from(items).where(eq(items.id, itemId)).get();
    });
  }

  async transfer(itemId: number, familyId: number, userId: number, dto: TransferItemDto): Promise<ItemSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(items)
        .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      const quantity = dto.quantity ?? item.quantity;
      tx.update(items)
        .set({ locationId: dto.toLocationId, updatedAt: new Date() })
        .where(eq(items.id, itemId))
        .run();

      tx.insert(stockTransactions).values({
        itemId,
        type: 'transfer',
        quantity,
        unit: item.unit,
        fromLocationId: item.locationId,
        toLocationId: dto.toLocationId,
        userId,
        source: 'manual',
      });

      return tx.select().from(items).where(eq(items.id, itemId)).get();
    });
  }

  async adjust(itemId: number, familyId: number, userId: number, dto: AdjustItemDto): Promise<ItemSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(items)
        .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      tx.update(items)
        .set({ quantity: dto.quantity, updatedAt: new Date() })
        .where(eq(items.id, itemId))
        .run();

      tx.insert(stockTransactions).values({
        itemId,
        type: 'adjust',
        quantity: Math.abs(dto.quantity - item.quantity),
        unit: item.unit,
        userId,
        source: 'manual',
        note: dto.note,
      });

      return tx.select().from(items).where(eq(items.id, itemId)).get();
    });
  }

  async getHistory(itemId: number) {
    return this.db.select().from(stockTransactions)
      .where(eq(stockTransactions.itemId, itemId))
      .orderBy(desc(stockTransactions.createdAt))
      .all();
  }

  async getExpiring(familyId: number, days: number = 7) {
    const deadline = daysFromNow(days);
    return this.db.select().from(items)
      .where(and(
        eq(items.familyId, familyId),
        sql`${items.expiryDate} <= ${deadline}`,
        sql`${items.expiryDate} > ${Date.now()}`,
      ))
      .all();
  }

  async getSummary(familyId: number) {
    const totalItems = await this.db.select({ count: sql<number>`count(*)` })
      .from(items).where(eq(items.familyId, familyId)).get();

    const expiringCount = await this.db.select({ count: sql<number>`count(*)` })
      .from(items)
      .where(and(
        eq(items.familyId, familyId),
        sql`${items.expiryDate} <= ${daysFromNow(7)}`,
        sql`${items.expiryDate} > ${Date.now()}`,
      )).get();

    const expiredCount = await this.db.select({ count: sql<number>`count(*)` })
      .from(items)
      .where(and(
        eq(items.familyId, familyId),
        sql`${items.expiryDate} <= ${Date.now()}`,
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
      eq(items.familyId, familyId),
      sql`${items.name} LIKE ${searchPattern}`,
    ];

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(items)
      .where(and(...conditions));

    const data = await this.db
      .select()
      .from(items)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return new PaginationResponse(data as ItemSelect[], total, page, limit);
  }

  async createBatch(itemId: number, familyId: number, dto: CreateBatchDto): Promise<ItemBatchSelect> {
    return this.db.transaction((tx: TransactionContext) => {
      const item = tx.select().from(items)
        .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException('物品不存在');

      const batchResult = tx.insert(itemBatches).values({
        itemId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        unit: dto.unit,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        locationId: dto.locationId || item.locationId,
      }).run();

      tx.update(items)
        .set({ quantity: item.quantity + dto.quantity, updatedAt: new Date() })
        .where(eq(items.id, itemId))
        .run();

      const batchId = Number(batchResult.lastInsertRowid);
      return tx.select().from(itemBatches).where(eq(itemBatches.id, batchId)).get();
    });
  }

  async listBatches(itemId: number) {
    return this.db.select().from(itemBatches)
      .where(eq(itemBatches.itemId, itemId))
      .all();
  }

  // === ItemType Plugin Integration ===

  /**
   * Query the Plugin Registry for an ItemType's configuration.
   *
   * P-T03 addition: StockService can now retrieve ItemType-specific
   * configuration (field definitions, state machine, default unit, etc.)
   * from the plugin system instead of hardcoding type knowledge.
   *
   * Usage: getItemTypeConfig('rechargeable_battery') → returns the battery
   * ItemTypePluginExports with state machine transitions, custom fields, etc.
   *
   * @param typeName - The ItemType type key (e.g., "food", "rechargeable_battery")
   * @returns ItemTypePluginExports if found, null otherwise
   */
  getItemTypeConfig(typeName: string): ItemTypePluginExports | null {
    return this.registry.getPluginByType<ItemTypePluginExports>('item-type', typeName);
  }
}
