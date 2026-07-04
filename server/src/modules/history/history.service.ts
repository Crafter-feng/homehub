import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { invStockTransactions, invItems, users } from '../../db/schema';
import { PaginationQuery, PaginationResponse } from '../../common/dto/pagination.dto';
import { TimelineQueryDto } from './dto/history.dto';

@Injectable()
export class HistoryService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  /**
   * 获取单物品完整变更记录（需验证 familyId 归属）
   */
  async getItemHistory(itemId: number, familyId: number) {
    // Verify item belongs to family (prevent cross-family access)
    const item = await this.db.select().from(invItems)
      .where(and(eq(invItems.id, itemId), eq(invItems.familyId, familyId)))
      .get();
    if (!item) return [];

    return this.db.select({
      id: invStockTransactions.id,
      itemId: invStockTransactions.itemId,
      batchId: invStockTransactions.batchId,
      type: invStockTransactions.type,
      quantity: invStockTransactions.quantity,
      unit: invStockTransactions.unit,
      fromLocationId: invStockTransactions.fromLocationId,
      toLocationId: invStockTransactions.toLocationId,
      userId: invStockTransactions.userId,
      source: invStockTransactions.source,
      note: invStockTransactions.note,
      createdAt: invStockTransactions.createdAt,
      userName: users.name,
    })
      .from(invStockTransactions)
      .leftJoin(users, eq(invStockTransactions.userId, users.id))
      .where(eq(invStockTransactions.itemId, itemId))
      .orderBy(desc(invStockTransactions.createdAt))
      .all();
  }

  /**
   * 家庭级时间线：join invItems + users 过滤 familyId + 条件过滤 + 分页
   */
  async getFamilyTimeline(familyId: number, filters: TimelineQueryDto, pagination: PaginationQuery) {
    const conditions: any[] = [eq(invItems.familyId, familyId)];

    if (filters.type) {
      conditions.push(eq(invStockTransactions.type, filters.type as any));
    }
    if (filters.source) {
      conditions.push(eq(invStockTransactions.source, filters.source as any));
    }
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      conditions.push(gte(invStockTransactions.createdAt, startDate));
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      conditions.push(lte(invStockTransactions.createdAt, endDate));
    }
    if (filters.itemId) {
      conditions.push(eq(invStockTransactions.itemId, filters.itemId));
    }
    if (filters.userId) {
      conditions.push(eq(invStockTransactions.userId, filters.userId));
    }

    const whereClause = and(...conditions);

    // 查询总数
    const countResult = await this.db.select({ count: sql<number>`count(*)` })
      .from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .where(whereClause)
      .get();
    const total = countResult?.count ?? 0;

    // 分页查询数据（含 userName）
    const offset = (pagination.page - 1) * pagination.limit;
    const data = await this.db.select({
      id: invStockTransactions.id,
      itemId: invStockTransactions.itemId,
      batchId: invStockTransactions.batchId,
      type: invStockTransactions.type,
      quantity: invStockTransactions.quantity,
      unit: invStockTransactions.unit,
      fromLocationId: invStockTransactions.fromLocationId,
      toLocationId: invStockTransactions.toLocationId,
      userId: invStockTransactions.userId,
      source: invStockTransactions.source,
      note: invStockTransactions.note,
      createdAt: invStockTransactions.createdAt,
      itemName: invItems.name,
      userName: users.name,
    })
      .from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .leftJoin(users, eq(invStockTransactions.userId, users.id))
      .where(whereClause)
      .orderBy(desc(invStockTransactions.createdAt))
      .limit(pagination.limit)
      .offset(offset)
      .all();

    return new PaginationResponse(data, total, pagination.page, pagination.limit);
  }

  /**
   * 日志汇总统计
   */
  async getJournalSummary(familyId: number) {
    // 按类型统计
    const byType = await this.db.select({
      type: invStockTransactions.type,
      count: sql<number>`count(*)`,
      totalQuantity: sql<number>`sum(${invStockTransactions.quantity})`,
    })
      .from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .where(eq(invItems.familyId, familyId))
      .groupBy(invStockTransactions.type)
      .all();

    // 按用户统计
    const byUser = await this.db.select({
      userId: invStockTransactions.userId,
      userName: users.name,
      count: sql<number>`count(*)`,
    })
      .from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .leftJoin(users, eq(invStockTransactions.userId, users.id))
      .where(eq(invItems.familyId, familyId))
      .groupBy(invStockTransactions.userId)
      .all();

    // 按物品统计（Top 10）
    const byItem = await this.db.select({
      itemId: invStockTransactions.itemId,
      itemName: invItems.name,
      count: sql<number>`count(*)`,
      totalQuantity: sql<number>`sum(${invStockTransactions.quantity})`,
    })
      .from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .where(eq(invItems.familyId, familyId))
      .groupBy(invStockTransactions.itemId)
      .orderBy(desc(sql`count(*)`))
      .limit(10)
      .all();

    return { byType, byUser, byItem };
  }

  /** 扫描日志 */
  async getScanLogs(_familyId: number, _limit?: number) {
    return [];
  }
}
