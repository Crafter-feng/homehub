import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { invStockLog, invProducts, users } from '../../db/schema';
import { PaginationQuery, PaginationResponse } from '../../common';

@Injectable()
export class HistoryService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async getItemHistory(itemId: number, familyId: number) {
    const item = await this.db.select().from(invProducts)
      .where(and(eq(invProducts.id, itemId), eq(invProducts.familyId, familyId)))
      .get();
    if (!item) return [];

    return this.db.select({
      id: invStockLog.id,
      productId: invStockLog.productId,
      batchId: invStockLog.batchId,
      type: invStockLog.type,
      quantity: invStockLog.quantity,
      unit: invStockLog.unit,
      fromLocationId: invStockLog.fromLocationId,
      toLocationId: invStockLog.toLocationId,
      userId: invStockLog.userId,
      source: invStockLog.source,
      note: invStockLog.note,
      createdAt: invStockLog.createdAt,
      userName: users.name,
    })
      .from(invStockLog)
      .leftJoin(users, eq(invStockLog.userId, users.id))
      .where(eq(invStockLog.productId, itemId))
      .orderBy(desc(invStockLog.createdAt))
      .all();
  }

  async getFamilyTimeline(familyId: number, filters: any, pagination: PaginationQuery) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(invProducts.familyId, familyId)];

    if (filters?.type) {
      conditions.push(eq(invStockLog.type, filters.type));
    }
    if (filters?.source) {
      conditions.push(eq(invStockLog.source, filters.source));
    }
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      conditions.push(gte(invStockLog.createdAt, startDate));
    }
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      conditions.push(lte(invStockLog.createdAt, endDate));
    }
    if (filters?.userId) {
      conditions.push(eq(invStockLog.userId, filters.userId));
    }

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .where(and(...conditions));

    const data = await this.db.select({
      id: invStockLog.id,
      productId: invStockLog.productId,
      batchId: invStockLog.batchId,
      type: invStockLog.type,
      quantity: invStockLog.quantity,
      unit: invStockLog.unit,
      fromLocationId: invStockLog.fromLocationId,
      toLocationId: invStockLog.toLocationId,
      userId: invStockLog.userId,
      source: invStockLog.source,
      note: invStockLog.note,
      createdAt: invStockLog.createdAt,
      productName: invProducts.name,
      userName: users.name,
    })
      .from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .leftJoin(users, eq(invStockLog.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(invStockLog.createdAt))
      .offset(offset)
      .limit(limit);

    return new PaginationResponse(data, total, page, limit);
  }

  async getStats(familyId: number) {
    const byType = await this.db.select({
      type: invStockLog.type,
      totalQuantity: sql<number>`sum(${invStockLog.quantity})`,
    })
      .from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .where(eq(invProducts.familyId, familyId))
      .groupBy(invStockLog.type);

    const byUser = await this.db.select({
      userId: invStockLog.userId,
      userName: users.name,
      totalQuantity: sql<number>`sum(${invStockLog.quantity})`,
    })
      .from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .leftJoin(users, eq(invStockLog.userId, users.id))
      .where(eq(invProducts.familyId, familyId))
      .groupBy(invStockLog.userId);

    const byProduct = await this.db.select({
      productId: invStockLog.productId,
      productName: invProducts.name,
      totalQuantity: sql<number>`sum(${invStockLog.quantity})`,
    })
      .from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .where(eq(invProducts.familyId, familyId))
      .groupBy(invStockLog.productId);

    return { byType, byUser, byProduct };
  }
}
