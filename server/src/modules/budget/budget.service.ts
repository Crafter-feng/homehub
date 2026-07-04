import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql, desc, gte, lte, between } from 'drizzle-orm';
import { hhBudgetEntries, hhBudgetCategories, hhBudgetSubscriptions } from '../../db/schema';
import {
  CreateBudgetEntryDto,
  UpdateBudgetEntryDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreateBudgetCategoryDto,
} from './dto/budget.dto';

@Injectable()
export class BudgetService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  // ═══════════════════════════════════════
  // 条目 CRUD
  // ═══════════════════════════════════════

  async listEntries(familyId: number, params?: {
    type?: string;
    category?: string;
    startDate?: number;
    endDate?: number;
    page?: number;
    limit?: number;
  }) {
    let condition = eq(hhBudgetEntries.familyId, familyId);
    if (params?.type) condition = and(condition, eq(hhBudgetEntries.type, params.type as any))!;
    if (params?.category) condition = and(condition, eq(hhBudgetEntries.category, params.category))!;
    if (params?.startDate && params?.endDate) {
      condition = and(condition, between(hhBudgetEntries.date, new Date(params.startDate), new Date(params.endDate)))!;
    } else if (params?.startDate) {
      condition = and(condition, gte(hhBudgetEntries.date, new Date(params.startDate)))!;
    } else if (params?.endDate) {
      condition = and(condition, lte(hhBudgetEntries.date, new Date(params.endDate)))!;
    }

    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const entries = await this.db.select().from(hhBudgetEntries)
      .where(condition)
      .orderBy(desc(hhBudgetEntries.date))
      .limit(limit)
      .offset(offset)
      .all();

    const countResult = await this.db.select({ count: sql<number>`count(*)` })
      .from(hhBudgetEntries)
      .where(condition)
      .get();

    return { entries, total: countResult?.count || 0, page, limit };
  }

  async getEntryById(id: number, familyId: number) {
    const entry = await this.db.select().from(hhBudgetEntries)
      .where(and(eq(hhBudgetEntries.id, id), eq(hhBudgetEntries.familyId, familyId)))
      .get();
    if (!entry) throw new NotFoundException('预算条目不存在');
    return entry;
  }

  async createEntry(familyId: number, dto: CreateBudgetEntryDto) {
    return this.db.insert(hhBudgetEntries).values({
      familyId,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency || 'CNY',
      category: dto.category,
      description: dto.description,
      date: new Date(dto.date),
      isRecurring: dto.isRecurring || false,
      recurringConfig: dto.recurringConfig,
      mdTags: dto.mdTags,
      relatedItemId: dto.relatedItemId,
      notes: dto.notes,
    }).returning().get();
  }

  async updateEntry(id: number, familyId: number, dto: UpdateBudgetEntryDto) {
    const entry = await this.getEntryById(id, familyId);
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (dto.type) updates.type = dto.type;
    if (dto.amount !== undefined) updates.amount = dto.amount;
    if (dto.currency) updates.currency = dto.currency;
    if (dto.category) updates.category = dto.category;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.date) updates.date = new Date(dto.date);
    if (dto.isRecurring !== undefined) updates.isRecurring = dto.isRecurring;
    if (dto.recurringConfig) updates.recurringConfig = dto.recurringConfig;
    if (dto.mdTags) updates.mdTags = dto.mdTags;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    await this.db.update(hhBudgetEntries).set(updates).where(eq(hhBudgetEntries.id, id)).run();
    return this.getEntryById(id, familyId);
  }

  async deleteEntry(id: number, familyId: number) {
    const entry = await this.getEntryById(id, familyId);
    await this.db.delete(hhBudgetEntries).where(eq(hhBudgetEntries.id, id)).run();
    return { deleted: true };
  }

  // ═══════════════════════════════════════
  // 统计
  // ═══════════════════════════════════════

  async getSummary(familyId: number, startDate?: Date, endDate?: Date) {
    let condition = eq(hhBudgetEntries.familyId, familyId);
    if (startDate && endDate) {
      condition = and(condition, between(hhBudgetEntries.date, startDate, endDate))!;
    } else if (startDate) {
      condition = and(condition, gte(hhBudgetEntries.date, startDate))!;
    } else if (endDate) {
      condition = and(condition, lte(hhBudgetEntries.date, endDate))!;
    }

    const totalIncome = await this.db.select({
      total: sql<number>`coalesce(sum(${hhBudgetEntries.amount}), 0)`,
    }).from(hhBudgetEntries)
      .where(and(condition, eq(hhBudgetEntries.type, 'income')))
      .get();

    const totalExpense = await this.db.select({
      total: sql<number>`coalesce(sum(${hhBudgetEntries.amount}), 0)`,
    }).from(hhBudgetEntries)
      .where(and(condition, eq(hhBudgetEntries.type, 'expense')))
      .get();

    const byCategory = await this.db.select({
      category: hhBudgetEntries.category,
      type: hhBudgetEntries.type,
      total: sql<number>`sum(${hhBudgetEntries.amount})`,
      count: sql<number>`count(*)`,
    }).from(hhBudgetEntries)
      .where(condition)
      .groupBy(hhBudgetEntries.category, hhBudgetEntries.type)
      .all();

    const monthlyTrend = await this.db.select({
      month: sql<string>`strftime('%Y-%m', ${hhBudgetEntries.date})`,
      income: sql<number>`coalesce(sum(case when ${hhBudgetEntries.type} = 'income' then ${hhBudgetEntries.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${hhBudgetEntries.type} = 'expense' then ${hhBudgetEntries.amount} else 0 end), 0)`,
    }).from(hhBudgetEntries)
      .where(condition)
      .groupBy(sql`strftime('%Y-%m', ${hhBudgetEntries.date})`)
      .all();

    return {
      totalIncome: totalIncome?.total || 0,
      totalExpense: totalExpense?.total || 0,
      balance: (totalIncome?.total || 0) - (totalExpense?.total || 0),
      byCategory,
      monthlyTrend,
    };
  }

  async getRecentEntries(familyId: number, limit = 10) {
    return this.db.select().from(hhBudgetEntries)
      .where(eq(hhBudgetEntries.familyId, familyId))
      .orderBy(desc(hhBudgetEntries.date))
      .limit(limit)
      .all();
  }

  // ═══════════════════════════════════════
  // 分类 CRUD
  // ═══════════════════════════════════════

  async listCategories(familyId: number, type?: string) {
    let condition = eq(hhBudgetCategories.familyId, familyId);
    if (type) condition = and(condition, eq(hhBudgetCategories.type, type as any))!;
    return this.db.select().from(hhBudgetCategories)
      .where(condition)
      .orderBy(hhBudgetCategories.sortOrder)
      .all();
  }

  async createCategory(familyId: number, dto: CreateBudgetCategoryDto) {
    return this.db.insert(hhBudgetCategories).values({
      familyId,
      name: dto.name,
      type: dto.type,
      icon: dto.icon,
      color: dto.color,
      parentId: dto.parentId,
    }).returning().get();
  }

  async deleteCategory(id: number, familyId: number) {
    const cat = await this.db.select().from(hhBudgetCategories)
      .where(and(eq(hhBudgetCategories.id, id), eq(hhBudgetCategories.familyId, familyId)))
      .get();
    if (!cat) throw new NotFoundException('分类不存在');
    await this.db.delete(hhBudgetCategories).where(eq(hhBudgetCategories.id, id)).run();
    return { deleted: true };
  }

  // ═══════════════════════════════════════
  // 订阅管理
  // ═══════════════════════════════════════

  async listSubscriptions(familyId: number) {
    return this.db.select().from(hhBudgetSubscriptions)
      .where(eq(hhBudgetSubscriptions.familyId, familyId))
      .orderBy(hhBudgetSubscriptions.nextBillingDate)
      .all();
  }

  async createSubscription(familyId: number, dto: CreateSubscriptionDto) {
    return this.db.insert(hhBudgetSubscriptions).values({
      familyId,
      name: dto.name,
      amount: dto.amount,
      currency: dto.currency || 'CNY',
      category: dto.category,
      billingCycle: dto.billingCycle,
      nextBillingDate: new Date(dto.nextBillingDate),
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      notes: dto.notes,
    }).returning().get();
  }

  async updateSubscription(id: number, familyId: number, dto: UpdateSubscriptionDto) {
    const sub = await this.db.select().from(hhBudgetSubscriptions)
      .where(and(eq(hhBudgetSubscriptions.id, id), eq(hhBudgetSubscriptions.familyId, familyId)))
      .get();
    if (!sub) throw new NotFoundException('订阅不存在');

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (dto.name) updates.name = dto.name;
    if (dto.amount !== undefined) updates.amount = dto.amount;
    if (dto.currency) updates.currency = dto.currency;
    if (dto.category) updates.category = dto.category;
    if (dto.billingCycle) updates.billingCycle = dto.billingCycle;
    if (dto.nextBillingDate) updates.nextBillingDate = new Date(dto.nextBillingDate);
    if (dto.endDate !== undefined) updates.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.notes !== undefined) updates.notes = dto.notes;
    if (dto.isEnabled !== undefined) updates.isEnabled = dto.isEnabled;

    await this.db.update(hhBudgetSubscriptions).set(updates).where(eq(hhBudgetSubscriptions.id, id)).run();
    const updated = await this.db.select().from(hhBudgetSubscriptions)
      .where(eq(hhBudgetSubscriptions.id, id)).get();
    return updated;
  }

  async deleteSubscription(id: number, familyId: number) {
    const sub = await this.db.select().from(hhBudgetSubscriptions)
      .where(and(eq(hhBudgetSubscriptions.id, id), eq(hhBudgetSubscriptions.familyId, familyId)))
      .get();
    if (!sub) throw new NotFoundException('订阅不存在');
    await this.db.delete(hhBudgetSubscriptions).where(eq(hhBudgetSubscriptions.id, id)).run();
    return { deleted: true };
  }

  async getMonthlySubscriptionCost(familyId: number) {
    const subs = await this.db.select().from(hhBudgetSubscriptions)
      .where(and(eq(hhBudgetSubscriptions.familyId, familyId), eq(hhBudgetSubscriptions.isEnabled, true)))
      .all();

    let monthlyTotal = 0;
    for (const sub of subs) {
      switch (sub.billingCycle) {
        case 'monthly': monthlyTotal += sub.amount; break;
        case 'yearly': monthlyTotal += sub.amount / 12; break;
        case 'quarterly': monthlyTotal += sub.amount / 3; break;
        case 'weekly': monthlyTotal += sub.amount * 4.33; break;
      }
    }
    return { monthlyTotal, count: subs.length, subscriptions: subs };
  }
}
