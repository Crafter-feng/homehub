import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql, desc } from 'drizzle-orm';
import { lists, listItems, listItemComments, holidayTemplates } from '../../db/schema';
import { items } from '../../db/schema/stock';
import { CreateListDto, UpdateListDto, AddListItemDto, UpdateListItemDto, AssignListItemDto, AddCommentDto } from './dto/list.dto';

@Injectable()
export class ListsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  // === 清单管理 ===
  async list(familyId: number, type?: string) {
    let condition = eq(lists.familyId, familyId);
    if (type) {
      condition = and(condition, eq(lists.type, type as any))!;
    }
    return this.db.select().from(lists).where(condition).all();
  }

  async getById(listId: number, familyId: number) {
    const list = await this.db.select().from(lists)
      .where(and(eq(lists.id, listId), eq(lists.familyId, familyId)))
      .get();
    if (!list) throw new NotFoundException('清单不存在');

    const items = await this.db.select().from(listItems)
      .where(eq(listItems.listId, listId))
      .orderBy(listItems.sortOrder)
      .all();

    return { ...list, items };
  }

  async create(familyId: number, userId: number, dto: CreateListDto) {
    return this.db.insert(lists).values({
      familyId,
      name: dto.name,
      type: dto.type,
      config: dto.config,
      createdBy: userId,
    }).returning().get();
  }

  async update(listId: number, familyId: number, dto: UpdateListDto) {
    const list = await this.db.select().from(lists)
      .where(and(eq(lists.id, listId), eq(lists.familyId, familyId)))
      .get();
    if (!list) throw new NotFoundException('清单不存在');

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (dto.name) updates.name = dto.name;
    if (dto.config) updates.config = dto.config;
    if (dto.isArchived !== undefined) updates.isArchived = dto.isArchived;

    await this.db.update(lists).set(updates).where(eq(lists.id, listId)).run();
    return this.getById(listId, familyId);
  }

  async delete(listId: number, familyId: number) {
    await this.db.delete(lists)
      .where(and(eq(lists.id, listId), eq(lists.familyId, familyId)))
      .run();
    return { success: true };
  }

  async getMyTasks(userId: number, familyId: number) {
    return this.db.select({
      id: listItems.id,
      content: listItems.content,
      status: listItems.status,
      dueAt: listItems.dueAt,
      listName: lists.name,
      listType: lists.type,
    }).from(listItems)
      .innerJoin(lists, eq(listItems.listId, lists.id))
      .where(and(
        eq(listItems.assigneeId, userId),
        eq(listItems.status, 'pending'),
        eq(lists.familyId, familyId),
      ))
      .all();
  }

  // === 清单条目管理 ===
  async addItem(listId: number, familyId: number, dto: AddListItemDto) {
    const list = await this.db.select().from(lists)
      .where(and(eq(lists.id, listId), eq(lists.familyId, familyId)))
      .get();
    if (!list) throw new NotFoundException('清单不存在');

    return this.db.insert(listItems).values({
      listId,
      content: dto.content,
      notes: dto.notes,
      assigneeId: dto.assigneeId,
      quantity: dto.quantity,
      unit: dto.unit,
      linkedItemId: dto.linkedItemId,
      linkedRecipeId: dto.linkedRecipeId,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
    }).returning().get();
  }

  async updateItem(itemId: number, dto: UpdateListItemDto) {
    const item = await this.db.select().from(listItems)
      .where(eq(listItems.id, itemId))
      .get();
    if (!item) throw new NotFoundException('条目不存在');

    const updates: Record<string, any> = {};
    if (dto.content) updates.content = dto.content;
    if (dto.notes !== undefined) updates.notes = dto.notes;
    if (dto.quantity !== undefined) updates.quantity = dto.quantity;
    if (dto.unit) updates.unit = dto.unit;
    if (dto.dueAt !== undefined) updates.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;

    await this.db.update(listItems).set(updates).where(eq(listItems.id, itemId)).run();
    return this.db.select().from(listItems).where(eq(listItems.id, itemId)).get();
  }

  async deleteItem(itemId: number) {
    await this.db.delete(listItems).where(eq(listItems.id, itemId)).run();
    return { success: true };
  }

  async checkItem(itemId: number, userId: number) {
    const item = await this.db.select().from(listItems)
      .where(eq(listItems.id, itemId))
      .get();
    if (!item) throw new NotFoundException('条目不存在');

    const list = await this.db.select().from(lists)
      .where(eq(lists.id, item.listId))
      .get();

    // 更新条目状态
    await this.db.update(listItems).set({
      status: 'completed',
      completedBy: userId,
      completedAt: new Date(),
    }).where(eq(listItems.id, itemId)).run();

    // 购物清单：打勾自动入库
    if (list?.type === 'shopping' && item.linkedItemId) {
      const stockItem = await this.db.select().from(items)
        .where(eq(items.id, item.linkedItemId))
        .get();
      if (stockItem) {
        await this.db.update(items).set({
          quantity: stockItem.quantity + (item.quantity || 1),
          updatedAt: new Date(),
        }).where(eq(items.id, item.linkedItemId)).run();
      }
    }

    // 家务：完成自动重置
    if (list?.type === 'chore' && list.config) {
      const config = list.config as any;
      if (config.autoReset) {
        const now = new Date();
        let resetDate = new Date(now);
        if (config.autoReset === 'daily') resetDate.setDate(resetDate.getDate() + 1);
        else if (config.autoReset === 'weekly') resetDate.setDate(resetDate.getDate() + 7);
        else if (config.autoReset === 'monthly') resetDate.setMonth(resetDate.getMonth() + 1);

        await this.db.update(listItems).set({
          status: 'pending',
          completedBy: null,
          completedAt: null,
          dueAt: resetDate,
          lastResetAt: now,
        }).where(eq(listItems.id, itemId)).run();
      }
    }

    return this.db.select().from(listItems).where(eq(listItems.id, itemId)).get();
  }

  async uncheckItem(itemId: number) {
    await this.db.update(listItems).set({
      status: 'pending',
      completedBy: null,
      completedAt: null,
    }).where(eq(listItems.id, itemId)).run();

    return this.db.select().from(listItems).where(eq(listItems.id, itemId)).get();
  }

  async assignItem(itemId: number, dto: AssignListItemDto) {
    await this.db.update(listItems).set({
      assigneeId: dto.assigneeId,
    }).where(eq(listItems.id, itemId)).run();

    return this.db.select().from(listItems).where(eq(listItems.id, itemId)).get();
  }

  // === 评论 ===
  async addComment(itemId: number, userId: number, dto: AddCommentDto) {
    return this.db.insert(listItemComments).values({
      listItemId: itemId,
      userId,
      content: dto.content,
    }).returning().get();
  }

  async getComments(itemId: number) {
    return this.db.select().from(listItemComments)
      .where(eq(listItemComments.listItemId, itemId))
      .orderBy(listItemComments.createdAt)
      .all();
  }

  // === 节日模板 ===
  async listHolidayTemplates() {
    return this.db.select().from(holidayTemplates)
      .where(eq(holidayTemplates.isPreset, true))
      .all();
  }

  async createFromTemplate(familyId: number, userId: number, templateId: number) {
    const template = await this.db.select().from(holidayTemplates)
      .where(eq(holidayTemplates.id, templateId))
      .get();
    if (!template) throw new NotFoundException('模板不存在');

    const list = await this.create(familyId, userId, {
      name: `${template.name}备货清单`,
      type: 'holiday',
      config: { template: template.name },
    });

    // 从模板创建条目
    if (template.items) {
      for (const item of template.items as any[]) {
        await this.addItem(list.id, familyId, {
          content: item.name,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
        });
      }
    }

    return this.getById(list.id, familyId);
  }

  // === 自动补货 ===
  async autoReplenish(familyId: number) {
    // 查询低于阈值的物品
    const lowStockItems = await this.db.select().from(items)
      .where(and(
        eq(items.familyId, familyId),
        sql`${items.minStock} > 0`,
        sql`${items.quantity} <= ${items.minStock}`,
      ))
      .all();

    if (lowStockItems.length === 0) {
      return { added: 0, message: '没有需要补货的物品' };
    }

    // 查找或创建购物清单
    let shoppingList = await this.db.select().from(lists)
      .where(and(
        eq(lists.familyId, familyId),
        eq(lists.type, 'shopping'),
      ))
      .get();

    if (!shoppingList) {
      shoppingList = await this.create(familyId, 1, {
        name: '自动补货清单',
        type: 'shopping',
      });
    }

    let addedCount = 0;
    for (const item of lowStockItems) {
      // 检查是否已在清单中
      const existing = await this.db.select().from(listItems)
        .where(and(
          eq(listItems.listId, shoppingList.id),
          eq(listItems.linkedItemId, item.id),
          eq(listItems.status, 'pending'),
        ))
        .get();

      if (!existing) {
        const needed = item.minStock - item.quantity;
        await this.addItem(shoppingList.id, familyId, {
          content: item.name,
          quantity: needed,
          unit: item.unit,
          linkedItemId: item.id,
          notes: `库存 ${item.quantity}${item.unit}，低于阈值 ${item.minStock}${item.unit}`,
        });
        addedCount++;
      }
    }

    return {
      added: addedCount,
      message: `已将 ${addedCount} 个物品加入购物清单`,
      listId: shoppingList.id,
    };
  }

  // ═══════════════════════════════════════
  // 待办汇总（Dashboard 用）
  // ═══════════════════════════════════════

  async getPendingTodos(familyId: number) {
    const todoLists = await this.db.select().from(lists)
      .where(and(eq(lists.familyId, familyId), eq(lists.type, 'todo')))
      .all();

    if (todoLists.length === 0) return { today: [], overdue: [], upcoming: [], total: 0 };

    const listIds = todoLists.map((l: any) => l.id);
    const pendingItems = await this.db.select({
      item: listItems,
      listName: lists.name,
    }).from(listItems)
      .innerJoin(lists, eq(listItems.listId, lists.id))
      .where(
        and(
          eq(listItems.status, 'pending'),
          sql`${listItems.listId} IN ${listIds}`,
        )
      )
      .all();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const today: any[] = [];
    const overdue: any[] = [];
    const upcoming: any[] = [];

    for (const row of pendingItems) {
      const item = { ...row.item, listName: row.listName };
      if (!item.dueAt) {
        upcoming.push(item);
      } else {
        const due = new Date(item.dueAt);
        if (due < todayStart) overdue.push(item);
        else if (due < todayEnd) today.push(item);
        else upcoming.push(item);
      }
    }

    overdue.sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    today.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    upcoming.sort((a: any, b: any) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

    return { today, overdue, upcoming, total: pendingItems.length };
  }
}
