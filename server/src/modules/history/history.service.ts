import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { stockTransactions, scanLogs, items } from '../../db/schema';
import { PaginationQuery, PaginationResponse } from '../../common/dto/pagination.dto';
import { TimelineQueryDto } from './dto/history.dto';

@Injectable()
export class HistoryService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  /**
   * 获取单物品完整变更记录（stockTransactions WHERE itemId ORDER BY createdAt DESC）
   */
  async getItemHistory(itemId: number) {
    return this.db.select().from(stockTransactions)
      .where(eq(stockTransactions.itemId, itemId))
      .orderBy(desc(stockTransactions.createdAt))
      .all();
  }

  /**
   * 家庭级时间线：join items 过滤 familyId + 条件过滤 + 分页
   */
  async getFamilyTimeline(familyId: number, filters: TimelineQueryDto, pagination: PaginationQuery) {
    // 构建查询条件
    const conditions: any[] = [eq(items.familyId, familyId)];

    if (filters.type) {
      conditions.push(eq(stockTransactions.type, filters.type as any));
    }
    if (filters.source) {
      conditions.push(eq(stockTransactions.source, filters.source as any));
    }
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      conditions.push(gte(stockTransactions.createdAt, startDate));
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      conditions.push(lte(stockTransactions.createdAt, endDate));
    }

    const whereClause = and(...conditions);

    // 查询总数
    const countResult = await this.db.select({ count: sql<number>`count(*)` })
      .from(stockTransactions)
      .innerJoin(items, eq(stockTransactions.itemId, items.id))
      .where(whereClause)
      .get();
    const total = countResult?.count ?? 0;

    // 分页查询数据
    const offset = (pagination.page - 1) * pagination.limit;
    const data = await this.db.select({
      id: stockTransactions.id,
      itemId: stockTransactions.itemId,
      batchId: stockTransactions.batchId,
      type: stockTransactions.type,
      quantity: stockTransactions.quantity,
      unit: stockTransactions.unit,
      fromLocationId: stockTransactions.fromLocationId,
      toLocationId: stockTransactions.toLocationId,
      userId: stockTransactions.userId,
      source: stockTransactions.source,
      note: stockTransactions.note,
      createdAt: stockTransactions.createdAt,
      itemName: items.name,
    })
      .from(stockTransactions)
      .innerJoin(items, eq(stockTransactions.itemId, items.id))
      .where(whereClause)
      .orderBy(desc(stockTransactions.createdAt))
      .limit(pagination.limit)
      .offset(offset)
      .all();

    return new PaginationResponse(data, total, pagination.page, pagination.limit);
  }

  /**
   * 扫描日志列表
   */
  async getScanLogs(familyId: number, limit?: number) {
    return this.db.select().from(scanLogs)
      .where(eq(scanLogs.familyId, familyId))
      .orderBy(desc(scanLogs.createdAt))
      .limit(limit ?? 50)
      .all();
  }
}
