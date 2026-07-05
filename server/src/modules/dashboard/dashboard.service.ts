import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, desc, sql, like, gte, lte, inArray } from 'drizzle-orm';
import { invStockLog, invProducts, invBatches, hhLists, hhListItems, sysAutomationTriggers, mdCategories, mdLocations, users } from '../../db/schema';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async getRecentActivities(familyId: number, limit: number = 20) {
    const activities: any[] = [];

    // 库存变动记录
    const stockChanges = await this.db.select({
      id: invStockLog.id,
      type: invStockLog.type,
      quantity: invStockLog.quantity,
      unit: invStockLog.unit,
      note: invStockLog.note,
      source: invStockLog.source,
      userId: invStockLog.userId,
      createdAt: invStockLog.createdAt,
      productName: invProducts.name,
      userName: users.name,
    }).from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .leftJoin(users, eq(invStockLog.userId, users.id))
      .where(eq(invProducts.familyId, familyId))
      .orderBy(desc(invStockLog.createdAt))
      .limit(limit);

    for (const tx of stockChanges) {
      activities.push({
        id: tx.id,
        type: 'stock',
        action: tx.type,
        itemName: tx.productName,
        quantity: tx.quantity,
        unit: tx.unit,
        note: tx.note,
        userName: tx.userName,
        createdAt: tx.createdAt,
      });
    }

    return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }

  async getSummary(familyId: number) {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const totalItems = await this.db.select({ count: sql<number>`count(*)` })
      .from(invProducts)
      .where(eq(invProducts.familyId, familyId))
      .get();

    const totalBatches = await this.db.select({ count: sql<number>`count(*)` })
      .from(invBatches)
      .innerJoin(invProducts, eq(invBatches.productId, invProducts.id))
      .where(eq(invProducts.familyId, familyId))
      .get();

    // 获取所有批次的过期日
    const expiringBatches = await this.db.select({
      productId: invBatches.productId,
      nextDue: sql<number>`MIN(${invBatches.expiryDate})`,
    })
      .from(invBatches)
      .innerJoin(invProducts, eq(invBatches.productId, invProducts.id))
      .where(and(
        eq(invProducts.familyId, familyId),
        sql`${invBatches.expiryDate} > ${nowSeconds}`,
      ))
      .groupBy(invBatches.productId);

    const expiringCount = expiringBatches.filter((b: any) => b.nextDue && b.nextDue <= nowSeconds + 7 * 86400).length;

    const expiredBatches = await this.db.select({
      productId: invBatches.productId,
    })
      .from(invBatches)
      .innerJoin(invProducts, eq(invBatches.productId, invProducts.id))
      .where(and(
        eq(invProducts.familyId, familyId),
        sql`${invBatches.expiryDate} <= ${nowSeconds}`,
      ))
      .groupBy(invBatches.productId);

    return {
      totalItems: totalItems?.count || 0,
      totalBatches: totalBatches?.count || 0,
      expiringCount,
      expiredCount: expiredBatches.length,
    };
  }

  async getMonthlyConsumption(familyId: number) {
    const monthStartSeconds = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);

    const consumed = await this.db.select({
      total: sql<number>`coalesce(sum(${invStockLog.quantity}), 0)`,
    })
      .from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .where(and(
        eq(invProducts.familyId, familyId),
        eq(invStockLog.type, 'consume'),
        sql`${invStockLog.createdAt} >= ${monthStartSeconds}`,
      ))
      .get();

    return consumed?.total || 0;
  }

  async getWasteAnalysis(familyId: number) {
    const spoiled = await this.db.select({
      id: invStockLog.id,
      quantity: invStockLog.quantity,
      spoiled: invStockLog.spoiled,
      unit: invStockLog.unit,
      note: invStockLog.note,
      createdAt: invStockLog.createdAt,
      productId: invStockLog.productId,
      productName: invProducts.name,
      purchasePrice: invProducts.defaultPrice,
      categoryId: invProducts.categoryId,
    }).from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .where(and(
        eq(invProducts.familyId, familyId),
        eq(invStockLog.type, 'consume'),
        sql`${invStockLog.spoiled} > 0`,
      ))
      .orderBy(desc(invStockLog.createdAt));

    const totalConsumed = await this.db.select({ total: sql<number>`coalesce(sum(${invStockLog.quantity}), 0)` })
      .from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .where(and(
        eq(invProducts.familyId, familyId),
        eq(invStockLog.type, 'consume'),
      ))
      .get();

    const totalSpoiled = spoiled.reduce((sum: number, s: any) => sum + (s.spoiled || 0), 0);
    const spoilRate = totalConsumed?.total > 0 ? (totalSpoiled / totalConsumed.total * 100) : 0;

    return {
      totalWasted: totalSpoiled,
      spoilRate: spoilRate.toFixed(1),
      spoiled,
    };
  }

  async getSpendingReport(familyId: number) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartSeconds = Math.floor(monthStart.getTime() / 1000);

    const totalSpent = await this.db.select({ total: sql<number>`coalesce(sum(${invStockLog.quantity} * ${invStockLog.price}), 0)` })
      .from(invStockLog)
      .innerJoin(invProducts, eq(invStockLog.productId, invProducts.id))
      .where(and(
        eq(invProducts.familyId, familyId),
        eq(invStockLog.type, 'purchase'),
        sql`${invStockLog.price} > 0`,
      ))
      .get();

    return {
      totalSpent: totalSpent?.total || 0,
      currency: 'CNY',
    };
  }

  async getLocationReport(familyId: number) {
    const locations = await this.db.select().from(mdLocations)
      .where(eq(mdLocations.familyId, familyId))
      .all();

    const result = [];
    for (const loc of locations) {
      const batches = await this.db.select({
        quantity: sql<number>`coalesce(sum(${invBatches.quantity}), 0)`,
      })
        .from(invBatches)
        .where(eq(invBatches.locationId, loc.id))
        .get();

      result.push({
        locationId: loc.id,
        locationName: loc.name,
        totalQuantity: batches?.quantity || 0,
      });
    }

    return result;
  }
}
