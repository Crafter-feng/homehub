import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { hhLists, hhListItems, hhListItemComments, hhHolidayTemplates } from '../../db/schema';
import { invProducts, invBatches, invStockLog } from '../../db/schema';
import { CreateListDto, UpdateListDto, AddListItemDto, UpdateListItemDto, AssignListItemDto, AddCommentDto } from './dto/list.dto';

@Injectable()
export class ListsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  // === 清单管理 ===
  async list(familyId: number, type?: string) {
    let condition = eq(hhLists.familyId, familyId);
    if (type) {
      condition = and(condition, eq(hhLists.type, type as any))!;
    }
    return this.db.select().from(hhLists).where(condition).all();
  }

  async getById(listId: number, familyId: number) {
    const list = await this.db.select().from(hhLists)
      .where(and(eq(hhLists.id, listId), eq(hhLists.familyId, familyId)))
      .get();
    if (!list) throw new NotFoundException('清单不存在');

    const items = await this.db.select().from(hhListItems)
      .where(eq(hhListItems.listId, listId))
      .orderBy(hhListItems.sortOrder)
      .all();

    return { ...list, items };
  }

  async create(familyId: number, userId: number, dto: CreateListDto) {
    return this.db.insert(hhLists).values({
      familyId,
      name: dto.name,
      type: dto.type,
      config: dto.config,
      createdBy: userId,
    }).returning().get();
  }

  async update(listId: number, familyId: number, dto: UpdateListDto) {
    const list = await this.db.select().from(hhLists)
      .where(and(eq(hhLists.id, listId), eq(hhLists.familyId, familyId)))
      .get();
    if (!list) throw new NotFoundException('清单不存在');

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (dto.name) updates.name = dto.name;
    if (dto.config) updates.config = dto.config;
    if (dto.isArchived !== undefined) updates.isArchived = dto.isArchived;

    await this.db.update(hhLists).set(updates).where(eq(hhLists.id, listId)).run();
    return this.getById(listId, familyId);
  }

  async delete(listId: number, familyId: number) {
    await this.db.delete(hhLists)
      .where(and(eq(hhLists.id, listId), eq(hhLists.familyId, familyId)))
      .run();
    return { success: true };
  }

  async getMyTasks(userId: number, familyId: number) {
    return this.db.select({
      id: hhListItems.id,
      content: hhListItems.content,
      status: hhListItems.status,
      dueAt: hhListItems.dueAt,
      listName: hhLists.name,
      listType: hhLists.type,
    }).from(hhListItems)
      .innerJoin(hhLists, eq(hhListItems.listId, hhLists.id))
      .where(and(
        eq(hhListItems.assigneeId, userId),
        eq(hhListItems.status, 'pending'),
        eq(hhLists.familyId, familyId),
      ))
      .all();
  }

  // === 清单条目管理 ===
  async addItem(listId: number, familyId: number, dto: AddListItemDto) {
    const list = await this.db.select().from(hhLists)
      .where(and(eq(hhLists.id, listId), eq(hhLists.familyId, familyId)))
      .get();
    if (!list) throw new NotFoundException('清单不存在');

    return this.db.insert(hhListItems).values({
      listId,
      content: dto.content,
      notes: dto.notes,
      assigneeId: dto.assigneeId,
      quantity: dto.quantity,
      unit: dto.unit,
      linkedProductId: dto.linkedProductId,
      linkedRecipeId: dto.linkedRecipeId,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
    }).returning().get();
  }

  async updateItem(itemId: number, familyId: number, dto: UpdateListItemDto) {
    const item = await this.db.select().from(hhListItems)
      .where(eq(hhListItems.id, itemId))
      .get();
    if (!item) throw new NotFoundException('条目不存在');
    const list = await this.db.select().from(hhLists)
      .where(and(eq(hhLists.id, item.listId), eq(hhLists.familyId, familyId)))
      .get();
    if (!list) throw new NotFoundException('清单不存在');

    const updates: Record<string, any> = {};
    if (dto.content) updates.content = dto.content;
    if (dto.notes !== undefined) updates.notes = dto.notes;
    if (dto.quantity !== undefined) updates.quantity = dto.quantity;
    if (dto.unit) updates.unit = dto.unit;
    if (dto.dueAt !== undefined) updates.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;

    await this.db.update(hhListItems).set(updates).where(eq(hhListItems.id, itemId)).run();
    return this.db.select().from(hhListItems).where(eq(hhListItems.id, itemId)).get();
  }

  async deleteItem(itemId: number, familyId: number) {
    const item = await this.db.select().from(hhListItems)
      .where(eq(hhListItems.id, itemId))
      .get();
    if (!item) throw new NotFoundException('条目不存在');
    const list = await this.db.select().from(hhLists)
      .where(and(eq(hhLists.id, item.listId), eq(hhLists.familyId, familyId)))
      .get();
    if (!list) throw new NotFoundException('清单不存在');

    await this.db.delete(hhListItems).where(eq(hhListItems.id, itemId)).run();
    return { success: true };
  }

  async checkItem(itemId: number, userId: number, familyId: number) {
    const item = await this.db.select().from(hhListItems)
      .where(eq(hhListItems.id, itemId))
      .get();
    if (!item) throw new NotFoundException('条目不存在');

    const list = await this.db.select().from(hhLists)
      .where(and(eq(hhLists.id, item.listId), eq(hhLists.familyId, familyId)))
      .get();
    if (!list) throw new NotFoundException('清单不存在');

    return this.db.transaction((tx: any) => {
      tx.update(hhListItems).set({
        status: 'completed',
        completedBy: userId,
        completedAt: new Date(),
      }).where(eq(hhListItems.id, itemId)).run();

      // 购物清单：打勾自动入库
      if (list?.type === 'shopping' && item.linkedProductId) {
        const stockItem = tx.select().from(invProducts)
          .where(eq(invProducts.id, item.linkedProductId))
          .get();
        if (stockItem) {
          tx.update(invProducts).set({
            quantity: stockItem.quantity + (item.quantity || 1),
            updatedAt: new Date(),
          }).where(eq(invProducts.id, item.linkedProductId)).run();

          tx.insert(invStockLog).values({
            itemId: item.linkedProductId,
            type: 'add',
            quantity: item.quantity || 1,
            unit: stockItem.unit || '个',
            userId,
            source: 'manual',
            note: '购物清单自动入库',
          }).run();
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

          tx.update(hhListItems).set({
            status: 'pending',
            completedBy: null,
            completedAt: null,
            dueAt: resetDate,
            lastResetAt: now,
          }).where(eq(hhListItems.id, itemId)).run();
        }
      }

      return tx.select().from(hhListItems).where(eq(hhListItems.id, itemId)).get();
    });
  }

  async uncheckItem(itemId: number, familyId: number) {
    const item = await this.db.select().from(hhListItems)
      .where(eq(hhListItems.id, itemId)).get();
    if (!item) throw new NotFoundException('条目不存在');
    const list = await this.db.select().from(hhLists)
      .where(and(eq(hhLists.id, item.listId), eq(hhLists.familyId, familyId))).get();
    if (!list) throw new NotFoundException('清单不存在');

    await this.db.update(hhListItems).set({
      status: 'pending',
      completedBy: null,
      completedAt: null,
    }).where(eq(hhListItems.id, itemId)).run();

    return this.db.select().from(hhListItems).where(eq(hhListItems.id, itemId)).get();
  }

  async assignItem(itemId: number, familyId: number, dto: AssignListItemDto) {
    const item = await this.db.select().from(hhListItems)
      .where(eq(hhListItems.id, itemId)).get();
    if (!item) throw new NotFoundException('条目不存在');
    const list = await this.db.select().from(hhLists)
      .where(and(eq(hhLists.id, item.listId), eq(hhLists.familyId, familyId))).get();
    if (!list) throw new NotFoundException('清单不存在');

    await this.db.update(hhListItems).set({
      assigneeId: dto.assigneeId,
    }).where(eq(hhListItems.id, itemId)).run();

    return this.db.select().from(hhListItems).where(eq(hhListItems.id, itemId)).get();
  }

  // === 评论 ===
  async addComment(itemId: number, userId: number, dto: AddCommentDto) {
    return this.db.insert(hhListItemComments).values({
      listItemId: itemId,
      userId,
      content: dto.content,
    }).returning().get();
  }

  async getComments(itemId: number) {
    return this.db.select().from(hhListItemComments)
      .where(eq(hhListItemComments.listItemId, itemId))
      .orderBy(hhListItemComments.createdAt)
      .all();
  }

  // === 节日模板 ===
  async listHolidayTemplates() {
    return this.db.select().from(hhHolidayTemplates)
      .where(eq(hhHolidayTemplates.isPreset, true))
      .all();
  }

  async createFromTemplate(familyId: number, userId: number, templateId: number) {
    const template = await this.db.select().from(hhHolidayTemplates)
      .where(eq(hhHolidayTemplates.id, templateId))
      .get();
    if (!template) throw new NotFoundException('模板不存在');

    const list = await this.create(familyId, userId, {
      name: `${template.name}备货清单`,
      type: 'holiday',
      config: { template: template.name },
    });

    // 从模板创建条目
    if (template.invProducts) {
      for (const item of template.invProducts as any[]) {
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
  async autoReplenish(familyId: number, userId: number) {
    // 查询低于阈值的产品（通过批次聚合数量）
    const lowStockProducts = await this.db.select({
      productId: invBatches.productId,
      totalQuantity: sql<number>`COALESCE(SUM(${invBatches.quantity}), 0)`,
    })
      .from(invBatches)
      .innerJoin(invProducts, eq(invBatches.productId, invProducts.id))
      .where(and(
        eq(invProducts.familyId, familyId),
        sql`${invProducts.minStock} > 0`,
      ))
      .groupBy(invBatches.productId);

    const filtered = lowStockProducts.filter((p: any) => p.totalQuantity <= 0);

    if (filtered.length === 0) {
      return { added: 0, message: '没有需要补货的物品' };
    }

    // 查找或创建购物清单
    let shoppingList = await this.db.select().from(hhLists)
      .where(and(
        eq(hhLists.familyId, familyId),
        eq(hhLists.type, 'shopping'),
      ))
      .get();

    if (!shoppingList) {
      shoppingList = await this.create(familyId, userId, {
        name: '自动补货清单',
        type: 'shopping',
      });
    }

    // 批量查询已在清单中的低库存物品，避免 N+1
    const lowStockIds = filtered.map((i: any) => i.id);
    let existingItems: any[];
    if (lowStockIds.length > 0) {
      existingItems = await this.db.select()
        .from(hhListItems)
        .where(and(
          eq(hhListItems.listId, shoppingList.id),
          eq(hhListItems.status, 'pending'),
          inArray(hhListItems.linkedProductId, lowStockIds),
        ))
        .all();
    } else {
      existingItems = [];
    }
    const existingIds = new Set(existingItems.map(e => e.linkedProductId));

    let addedCount = 0;
    for (const item of filtered) {
      if (existingIds.has(item.id)) continue;

      const needed = item.minStock - item.quantity;
      await this.addItem(shoppingList.id, familyId, {
        content: item.name,
        quantity: needed,
        unit: item.unit,
        linkedProductId: item.id,
        notes: `库存 ${item.quantity}${item.unit}，低于阈值 ${item.minStock}${item.unit}`,
      });
      addedCount++;
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
    const todoLists = await this.db.select().from(hhLists)
      .where(and(eq(hhLists.familyId, familyId), eq(hhLists.type, 'todo')))
      .all();

    if (todoLists.length === 0) return { today: [], overdue: [], upcoming: [], total: 0 };

    const listIds = todoLists.map((l: any) => l.id);
    const pendingItems = await this.db.select({
      item: hhListItems,
      listName: hhLists.name,
    }).from(hhListItems)
      .innerJoin(hhLists, eq(hhListItems.listId, hhLists.id))
      .where(
        and(
          eq(hhListItems.status, 'pending'),
          sql`${hhListItems.listId} IN ${listIds}`,
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
