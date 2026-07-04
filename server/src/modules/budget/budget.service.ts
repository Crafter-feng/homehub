import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql, desc, gte, lte, between } from 'drizzle-orm';
import { budgetEntries, budgetCategories, budgetSubscriptions } from '../../db/schema/budget';
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
    let condition = eq(budgetEntries.familyId, familyId);
    if (params?.type) condition = and(condition, eq(budgetEntries.type, params.type as any))!;
    if (params?.category) condition = and(condition, eq(budgetEntries.category, params.category))!;
    if (params?.startDate && params?.endDate) {
      condition = and(condition, between(budgetEntries.date, new Date(params.startDate), new Date(params.endDate)))!;
    } else if (params?.startDate) {
      condition = and(condition, gte(budgetEntries.date, new Date(params.startDate)))!;
    } else if (params?.endDate) {
      condition = and(condition, lte(budgetEntries.date, new Date(params.endDate)))!;
    }

    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    const entries = await this.db.select().from(budgetEntries)
      .where(condition)
      .orderBy(desc(budgetEntries.date))
      .limit(limit)
      .offset(offset)
      .all();

    const countResult = await this.db.select({ count: sql<number>`count(*)` })
      .from(budgetEntries)
      .where(condition)
      .get();

    return { entries, total: countResult?.count || 0, page, limit };
  }

  async getEntryById(id: number, familyId: number) {
    const entry = await this.db.select().from(budgetEntries)
      .where(and(eq(budgetEntries.id, id), eq(budgetEntries.familyId, familyId)))
      .get();
    if (!entry) throw new NotFoundException('预算条目不存在');
    return entry;
  }

  async createEntry(familyId: number, dto: CreateBudgetEntryDto) {
    return this.db.insert(budgetEntries).values({
      familyId,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency || 'CNY',
      category: dto.category,
      description: dto.description,
      date: new Date(dto.date),
      isRecurring: dto.isRecurring || false,
      recurringConfig: dto.recurringConfig,
      tags: dto.tags,
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
    if (dto.tags) updates.tags = dto.tags;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    await this.db.update(budgetEntries).set(updates).where(eq(budgetEntries.id, id)).run();
    return this.getEntryById(id, familyId);
  }

  async deleteEntry(id: number, familyId: number) {
    const entry = await this.getEntryById(id, familyId);
    await this.db.delete(budgetEntries).where(eq(budgetEntries.id, id)).run();
    return { deleted: true };
  }

  // ═══════════════════════════════════════
  // 统计
  // ═══════════════════════════════════════

  async getSummary(familyId: number, startDate?: Date, endDate?: Date) {
    let condition = eq(budgetEntries.familyId, familyId);
    if (startDate && endDate) {
      condition = and(condition, between(budgetEntries.date, startDate, endDate))!;
    } else if (startDate) {
      condition = and(condition, gte(budgetEntries.date, startDate))!;
    } else if (endDate) {
      condition = and(condition, lte(budgetEntries.date, endDate))!;
    }

    const totalIncome = await this.db.select({
      total: sql<number>`coalesce(sum(${budgetEntries.amount}), 0)`,
    }).from(budgetEntries)
      .where(and(condition, eq(budgetEntries.type, 'income')))
      .get();

    const totalExpense = await this.db.select({
      total: sql<number>`coalesce(sum(${budgetEntries.amount}), 0)`,
    }).from(budgetEntries)
      .where(and(condition, eq(budgetEntries.type, 'expense')))
      .get();

    const byCategory = await this.db.select({
      category: budgetEntries.category,
      type: budgetEntries.type,
      total: sql<number>`sum(${budgetEntries.amount})`,
      count: sql<number>`count(*)`,
    }).from(budgetEntries)
      .where(condition)
      .groupBy(budgetEntries.category, budgetEntries.type)
      .all();

    const monthlyTrend = await this.db.select({
      month: sql<string>`strftime('%Y-%m', ${budgetEntries.date})`,
      income: sql<number>`coalesce(sum(case when ${budgetEntries.type} = 'income' then ${budgetEntries.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${budgetEntries.type} = 'expense' then ${budgetEntries.amount} else 0 end), 0)`,
    }).from(budgetEntries)
      .where(condition)
      .groupBy(sql`strftime('%Y-%m', ${budgetEntries.date})`)
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
    return this.db.select().from(budgetEntries)
      .where(eq(budgetEntries.familyId, familyId))
      .orderBy(desc(budgetEntries.date))
      .limit(limit)
      .all();
  }

  // ═══════════════════════════════════════
  // 分类 CRUD
  // ═══════════════════════════════════════

  async listCategories(familyId: number, type?: string) {
    let condition = eq(budgetCategories.familyId, familyId);
    if (type) condition = and(condition, eq(budgetCategories.type, type as any))!;
    return this.db.select().from(budgetCategories)
      .where(condition)
      .orderBy(budgetCategories.sortOrder)
      .all();
  }

  async createCategory(familyId: number, dto: CreateBudgetCategoryDto) {
    return this.db.insert(budgetCategories).values({
      familyId,
      name: dto.name,
      type: dto.type,
      icon: dto.icon,
      color: dto.color,
      parentId: dto.parentId,
    }).returning().get();
  }

  async deleteCategory(id: number, familyId: number) {
    const cat = await this.db.select().from(budgetCategories)
      .where(and(eq(budgetCategories.id, id), eq(budgetCategories.familyId, familyId)))
      .get();
    if (!cat) throw new NotFoundException('分类不存在');
    await this.db.delete(budgetCategories).where(eq(budgetCategories.id, id)).run();
    return { deleted: true };
  }

  // ═══════════════════════════════════════
  // 订阅管理
  // ═══════════════════════════════════════

  async listSubscriptions(familyId: number) {
    return this.db.select().from(budgetSubscriptions)
      .where(eq(budgetSubscriptions.familyId, familyId))
      .orderBy(budgetSubscriptions.nextBillingDate)
      .all();
  }

  async createSubscription(familyId: number, dto: CreateSubscriptionDto) {
    return this.db.insert(budgetSubscriptions).values({
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
    const sub = await this.db.select().from(budgetSubscriptions)
      .where(and(eq(budgetSubscriptions.id, id), eq(budgetSubscriptions.familyId, familyId)))
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

    await this.db.update(budgetSubscriptions).set(updates).where(eq(budgetSubscriptions.id, id)).run();
    const updated = await this.db.select().from(budgetSubscriptions)
      .where(eq(budgetSubscriptions.id, id)).get();
    return updated;
  }

  async deleteSubscription(id: number, familyId: number) {
    const sub = await this.db.select().from(budgetSubscriptions)
      .where(and(eq(budgetSubscriptions.id, id), eq(budgetSubscriptions.familyId, familyId)))
      .get();
    if (!sub) throw new NotFoundException('订阅不存在');
    await this.db.delete(budgetSubscriptions).where(eq(budgetSubscriptions.id, id)).run();
    return { deleted: true };
  }

  async getMonthlySubscriptionCost(familyId: number) {
    const subs = await this.db.select().from(budgetSubscriptions)
      .where(and(eq(budgetSubscriptions.familyId, familyId), eq(budgetSubscriptions.isEnabled, true)))
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
