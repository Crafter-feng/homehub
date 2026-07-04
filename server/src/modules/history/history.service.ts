import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { invStockTransactions, invItems } from '../../db/schema';
import { PaginationQuery, PaginationResponse } from '../../common/dto/pagination.dto';
import { TimelineQueryDto } from './dto/history.dto';

@Injectable()
export class HistoryService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  /**
   * 获取单物品完整变更记录（invStockTransactions WHERE itemId ORDER BY createdAt DESC）
   */
  async getItemHistory(itemId: number) {
    return this.db.select().from(invStockTransactions)
      .where(eq(invStockTransactions.itemId, itemId))
      .orderBy(desc(invStockTransactions.createdAt))
      .all();
  }

  /**
   * 家庭级时间线：join invItems 过滤 familyId + 条件过滤 + 分页
   */
  async getFamilyTimeline(familyId: number, filters: TimelineQueryDto, pagination: PaginationQuery) {
    // 构建查询条件
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

    const whereClause = and(...conditions);

    // 查询总数
    const countResult = await this.db.select({ count: sql<number>`count(*)` })
      .from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .where(whereClause)
      .get();
    const total = countResult?.count ?? 0;

    // 分页查询数据
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
    })
      .from(invStockTransactions)
      .innerJoin(invItems, eq(invStockTransactions.itemId, invItems.id))
      .where(whereClause)
      .orderBy(desc(invStockTransactions.createdAt))
      .limit(pagination.limit)
      .offset(offset)
      .all();

    return new PaginationResponse(data, total, pagination.page, pagination.limit);
  }

  /** 扫描日志 — 已移除数据库存储，改为 Logger 输出 */
  async getScanLogs(_familyId: number, _limit?: number) {
    return [];
  }
}
