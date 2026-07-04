import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, desc, sql, like, gte, lte } from 'drizzle-orm';
import { invStockTransactions, invItems, hhLists, hhListItems, sysScanLogs, sysAutomationTriggers, mdCategories } from '../../db/schema';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async getRecentActivities(familyId: number, limit: number = 20) {
    const activities: any[] = [];

    // 库存变动记录
    const stockChanges = await this.db.select({
      id: invStockTransactions.id,
      type: invStockTransactions.type,
      quantity: invStockTransactions.quantity,
      unit: invStockTransactions.unit,
      note: invStockTransactions.note,
      source: invStockTransactions.source,
      createdAt: invStockTransactions.createdAt,
      itemName: invItems.name,
    }).from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .where(eq(invItems.familyId, familyId))
      .orderBy(desc(invStockTransactions.createdAt))
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
      id: hhListItems.id,
      content: hhListItems.content,
      completedAt: hhListItems.completedAt,
      listName: hhLists.name,
      listType: hhLists.type,
    }).from(hhListItems)
      .innerJoin(hhLists, eq(hhListItems.listId, hhLists.id))
      .where(and(
        eq(hhLists.familyId, familyId),
        eq(hhListItems.status, 'completed'),
      ))
      .orderBy(desc(hhListItems.completedAt))
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
      id: sysScanLogs.id,
      scanType: sysScanLogs.scanType,
      code: sysScanLogs.code,
      action: sysScanLogs.action,
      createdAt: sysScanLogs.createdAt,
    }).from(sysScanLogs)
      .where(eq(sysScanLogs.familyId, familyId))
      .orderBy(desc(sysScanLogs.createdAt))
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
      .from(invItems).where(eq(invItems.familyId, familyId)).get();

    const expiring = await this.db.select({ count: sql<number>`count(*)` })
      .from(invItems).where(and(
        eq(invItems.familyId, familyId),
        sql`${invItems.expiryDate} <= ${Date.now() + 7 * 86400000}`,
        sql`${invItems.expiryDate} > ${Date.now()}`,
      )).get();

    const expired = await this.db.select({ count: sql<number>`count(*)` })
      .from(invItems).where(and(
        eq(invItems.familyId, familyId),
        sql`${invItems.expiryDate} <= ${Date.now()}`,
      )).get();

    // 本月消耗
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthConsumption = await this.db.select({ count: sql<number>`count(*)` })
      .from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .where(and(
        eq(invItems.familyId, familyId),
        eq(invStockTransactions.type, 'consume'),
        sql`${invStockTransactions.createdAt} >= ${monthStart.getTime()}`,
      )).get();

    // 待办任务
    const pendingTasks = await this.db.select({ count: sql<number>`count(*)` })
      .from(hhListItems)
      .innerJoin(hhLists, eq(hhListItems.listId, hhLists.id))
      .where(and(
        eq(hhLists.familyId, familyId),
        eq(hhListItems.status, 'pending'),
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
      like(invStockTransactions.note, `%${keyword}%`)
    );

    // Fetch waste transactions: type='consume' with waste-indicating notes
    const wasteTxs = await this.db.select({
      id: invStockTransactions.id,
      quantity: invStockTransactions.quantity,
      unit: invStockTransactions.unit,
      note: invStockTransactions.note,
      createdAt: invStockTransactions.createdAt,
      itemId: invStockTransactions.itemId,
      itemName: invItems.name,
      purchasePrice: invItems.purchasePrice,
      categoryId: invItems.categoryId,
    }).from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .where(and(
        eq(invItems.familyId, familyId),
        eq(invStockTransactions.type, 'consume'),
        ...wasteConditions,
      ))
      .orderBy(desc(invStockTransactions.createdAt));

    // totalWasted: sum of quantity
    const totalWasted = wasteTxs.reduce((sum: number, tx: any) => sum + Math.abs(tx.quantity), 0);

    // wastedByCategory: group by category
    // First get category names
    const categoryIdSet = new Set(wasteTxs.map((tx: any) => tx.categoryId).filter(Boolean));
    const categoryIds: number[] = Array.from(categoryIdSet) as number[];
    let categoryMap: Record<number, string> = {};
    if (categoryIds.length > 0) {
      const cats: any[] = await this.db.select({
        id: mdCategories.id,
        name: mdCategories.name,
      }).from(mdCategories)
        .where(sql`${mdCategories.id} IN (${sql.raw(categoryIds.join(','))})`)
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

    // estimatedLoss: total purchasePrice of wasted invItems
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
