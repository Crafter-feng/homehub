import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, desc, sql, like, gte, lte } from 'drizzle-orm';
import { stockTransactions, items, lists, listItems, scanLogs, automationTriggers, categories } from '../../db/schema';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async getRecentActivities(familyId: number, limit: number = 20) {
    const activities: any[] = [];

    // 库存变动记录
    const stockChanges = await this.db.select({
      id: stockTransactions.id,
      type: stockTransactions.type,
      quantity: stockTransactions.quantity,
      unit: stockTransactions.unit,
      note: stockTransactions.note,
      source: stockTransactions.source,
      createdAt: stockTransactions.createdAt,
      itemName: items.name,
    }).from(stockTransactions)
      .innerJoin(items, eq(stockTransactions.itemId, items.id))
      .where(eq(items.familyId, familyId))
      .orderBy(desc(stockTransactions.createdAt))
      .limit(limit);

    for (const tx of stockChanges) {
      activities.push({
        id: `stock-${tx.id}`,
        type: 'stock',
        action: this.getStockActionLabel(tx.type),
        detail: `${tx.itemName} ${tx.type === 'add' ? '+' : tx.type === 'consume' ? '-' : ''}${tx.quantity}${tx.unit}`,
        note: tx.note,
        source: tx.source,
        createdAt: tx.createdAt,
      });
    }

    // 清单条目完成记录
    const completedItems = await this.db.select({
      id: listItems.id,
      content: listItems.content,
      completedAt: listItems.completedAt,
      listName: lists.name,
      listType: lists.type,
    }).from(listItems)
      .innerJoin(lists, eq(listItems.listId, lists.id))
      .where(and(
        eq(lists.familyId, familyId),
        eq(listItems.status, 'completed'),
      ))
      .orderBy(desc(listItems.completedAt))
      .limit(limit);

    for (const item of completedItems) {
      activities.push({
        id: `list-${item.id}`,
        type: 'list',
        action: '完成清单条目',
        detail: `${item.content} (${item.listName})`,
        source: item.listType,
        createdAt: item.completedAt,
      });
    }

    // 扫描记录
    const scans = await this.db.select({
      id: scanLogs.id,
      scanType: scanLogs.scanType,
      code: scanLogs.code,
      action: scanLogs.action,
      createdAt: scanLogs.createdAt,
    }).from(scanLogs)
      .where(eq(scanLogs.familyId, familyId))
      .orderBy(desc(scanLogs.createdAt))
      .limit(limit);

    for (const scan of scans) {
      activities.push({
        id: `scan-${scan.id}`,
        type: 'scan',
        action: `扫描${scan.scanType.toUpperCase()}`,
        detail: scan.action,
        createdAt: scan.createdAt,
      });
    }

    // 按时间排序
    activities.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return activities.slice(0, limit);
  }

  async getStockSummary(familyId: number) {
    const total = await this.db.select({ count: sql<number>`count(*)` })
      .from(items).where(eq(items.familyId, familyId)).get();

    const expiring = await this.db.select({ count: sql<number>`count(*)` })
      .from(items).where(and(
        eq(items.familyId, familyId),
        sql`${items.expiryDate} <= ${Date.now() + 7 * 86400000}`,
        sql`${items.expiryDate} > ${Date.now()}`,
      )).get();

    const expired = await this.db.select({ count: sql<number>`count(*)` })
      .from(items).where(and(
        eq(items.familyId, familyId),
        sql`${items.expiryDate} <= ${Date.now()}`,
      )).get();

    // 本月消耗
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthConsumption = await this.db.select({ count: sql<number>`count(*)` })
      .from(stockTransactions)
      .innerJoin(items, eq(stockTransactions.itemId, items.id))
      .where(and(
        eq(items.familyId, familyId),
        eq(stockTransactions.type, 'consume'),
        sql`${stockTransactions.createdAt} >= ${monthStart.getTime()}`,
      )).get();

    // 待办任务
    const pendingTasks = await this.db.select({ count: sql<number>`count(*)` })
      .from(listItems)
      .innerJoin(lists, eq(listItems.listId, lists.id))
      .where(and(
        eq(lists.familyId, familyId),
        eq(listItems.status, 'pending'),
      )).get();

    return {
      totalItems: total?.count || 0,
      expiringCount: expiring?.count || 0,
      expiredCount: expired?.count || 0,
      monthConsumption: monthConsumption?.count || 0,
      pendingTasks: pendingTasks?.count || 0,
    };
  }

  async getWasteAnalysis(familyId: number) {
    // Waste keywords to match in notes (Chinese + English)
    const wasteKeywords = ['过期', '浪费', '废弃', '损坏', '变质', 'expired', 'waste', 'spoiled', 'damaged'];

    // Build LIKE conditions for waste notes
    const wasteConditions = wasteKeywords.map(keyword =>
      like(stockTransactions.note, `%${keyword}%`)
    );

    // Fetch waste transactions: type='consume' with waste-indicating notes
    const wasteTxs = await this.db.select({
      id: stockTransactions.id,
      quantity: stockTransactions.quantity,
      unit: stockTransactions.unit,
      note: stockTransactions.note,
      createdAt: stockTransactions.createdAt,
      itemId: stockTransactions.itemId,
      itemName: items.name,
      purchasePrice: items.purchasePrice,
      categoryId: items.categoryId,
    }).from(stockTransactions)
      .innerJoin(items, eq(stockTransactions.itemId, items.id))
      .where(and(
        eq(items.familyId, familyId),
        eq(stockTransactions.type, 'consume'),
        ...wasteConditions,
      ))
      .orderBy(desc(stockTransactions.createdAt));

    // totalWasted: sum of quantity
    const totalWasted = wasteTxs.reduce((sum: number, tx: any) => sum + Math.abs(tx.quantity), 0);

    // wastedByCategory: group by category
    // First get category names
    const categoryIdSet = new Set(wasteTxs.map((tx: any) => tx.categoryId).filter(Boolean));
    const categoryIds: number[] = Array.from(categoryIdSet) as number[];
    let categoryMap: Record<number, string> = {};
    if (categoryIds.length > 0) {
      const cats: any[] = await this.db.select({
        id: categories.id,
        name: categories.name,
      }).from(categories)
        .where(sql`${categories.id} IN (${sql.raw(categoryIds.join(','))})`)
        .all();
      for (const c of cats) {
        categoryMap[c.id] = c.name;
      }
    }

    const wastedByCategoryMap: Record<string, number> = {};
    for (const tx of wasteTxs) {
      const catName = tx.categoryId ? (categoryMap[tx.categoryId] || '未分类') : '未分类';
      wastedByCategoryMap[catName] = (wastedByCategoryMap[catName] || 0) + Math.abs(tx.quantity);
    }

    // monthlyTrend: past 12 months
    const now = new Date();
    const monthlyTrend: Array<{ month: string; quantity: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = d.getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const monthQuantity = wasteTxs
        .filter((tx: any) => tx.createdAt && tx.createdAt.getTime() >= monthStart && tx.createdAt.getTime() < monthEnd)
        .reduce((sum: number, tx: any) => sum + Math.abs(tx.quantity), 0);
      monthlyTrend.push({ month: monthStr, quantity: Math.round(monthQuantity * 100) / 100 });
    }

    // topWastedItems: top 5 by quantity
    const itemMap: Record<number, { name: string; quantity: number; unit: string }> = {};
    for (const tx of wasteTxs) {
      if (!itemMap[tx.itemId]) {
        itemMap[tx.itemId] = { name: tx.itemName || '未知', quantity: 0, unit: tx.unit || '' };
      }
      itemMap[tx.itemId].quantity += Math.abs(tx.quantity);
    }
    const topWastedItems = Object.entries(itemMap)
      .sort(([, a], [, b]) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(([itemId, data]) => ({
        itemId: parseInt(itemId),
        name: data.name,
        quantity: Math.round(data.quantity * 100) / 100,
        unit: data.unit,
      }));

    // estimatedLoss: total purchasePrice of wasted items
    const estimatedLoss = wasteTxs.reduce((sum: number, tx: any) => {
      const price = tx.purchasePrice || 0;
      const qty = Math.abs(tx.quantity);
      return sum + price * qty;
    }, 0);

    return {
      totalWasted: Math.round(totalWasted * 100) / 100,
      wastedByCategory: Object.entries(wastedByCategoryMap).map(([category, quantity]) => ({
        category,
        quantity: Math.round(quantity * 100) / 100,
      })),
      monthlyTrend,
      topWastedItems,
      estimatedLoss: Math.round(estimatedLoss * 100) / 100,
    };
  }

  private getStockActionLabel(type: string): string {
    const labels: Record<string, string> = {
      add: '入库',
      consume: '消耗',
      transfer: '转移',
      adjust: '调整',
    };
    return labels[type] || type;
  }
}
