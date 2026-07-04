import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql } from 'drizzle-orm';
import { hhMealPlans, hhMealPlanItems, hhRecipes, invItems, hhLists, hhListItems } from '../../db/schema';

export interface MealPlanResponse {
  id: number;
  familyId: number;
  weekStart: Date;
  weekEnd: Date;
  invItems: (MealPlanItemResponse)[];
  createdAt: Date;
}

export interface MealPlanItemResponse {
  id: number;
  dayOfWeek: number;
  mealType: string;
  recipeId: number;
  note: string | null;
  recipe?: any;
  createdAt: Date;
}

@Injectable()
export class MealPlansService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number): Promise<MealPlanResponse[]> {
    const plans = await this.db.select().from(hhMealPlans)
      .where(eq(hhMealPlans.familyId, familyId))
      .orderBy(sql`${hhMealPlans.weekStart} DESC`)
      .all();

    return Promise.all(plans.map((plan: any) => this.loadItems(plan)));
  }

  async getById(planId: number, familyId: number): Promise<MealPlanResponse> {
    const plan = await this.db.select().from(hhMealPlans)
      .where(and(eq(hhMealPlans.id, planId), eq(hhMealPlans.familyId, familyId)))
      .get();
    if (!plan) throw new NotFoundException('餐饮计划不存在');

    return this.loadItems(plan);
  }

  async create(familyId: number, userId: number | undefined, dto: { weekStart: number; weekEnd: number }): Promise<MealPlanResponse> {
    const result = await this.db.insert(hhMealPlans).values({
      familyId,
      weekStart: new Date(dto.weekStart),
      weekEnd: new Date(dto.weekEnd),
      createdBy: userId ?? null,
    }).returning().get();

    return { ...result, invItems: [] };
  }

  async addItem(planId: number, familyId: number, dto: {
    dayOfWeek: number;
    mealType: string;
    recipeId: number;
    note?: string;
  }): Promise<MealPlanResponse> {
    // Verify plan exists and belongs to family
    const plan = await this.db.select().from(hhMealPlans)
      .where(and(eq(hhMealPlans.id, planId), eq(hhMealPlans.familyId, familyId)))
      .get();
    if (!plan) throw new NotFoundException('餐饮计划不存在');

    // Check for duplicate (same day + mealType + recipe)
    const existing = await this.db.select().from(hhMealPlanItems)
      .where(and(
        eq(hhMealPlanItems.planId, planId),
        eq(hhMealPlanItems.dayOfWeek, dto.dayOfWeek),
        eq(hhMealPlanItems.mealType, dto.mealType as any),
        eq(hhMealPlanItems.recipeId, dto.recipeId),
      ))
      .get();

    if (existing) {
      // Update note if provided
      if (dto.note !== undefined) {
        await this.db.update(hhMealPlanItems)
          .set({ note: dto.note })
          .where(eq(hhMealPlanItems.id, existing.id))
          .run();
      }
    } else {
      await this.db.insert(hhMealPlanItems).values({
        planId,
        dayOfWeek: dto.dayOfWeek,
        mealType: dto.mealType as any,
        recipeId: dto.recipeId,
        note: dto.note ?? null,
      }).run();
    }

    return this.loadItems(plan);
  }

  async updateItem(planId: number, familyId: number, itemId: number, dto: {
    recipeId?: number;
    mealType?: string;
    dayOfWeek?: number;
    note?: string;
  }): Promise<MealPlanResponse> {
    const plan = await this.db.select().from(hhMealPlans)
      .where(and(eq(hhMealPlans.id, planId), eq(hhMealPlans.familyId, familyId)))
      .get();
    if (!plan) throw new NotFoundException('餐饮计划不存在');

    const item = await this.db.select().from(hhMealPlanItems)
      .where(and(eq(hhMealPlanItems.id, itemId), eq(hhMealPlanItems.planId, planId)))
      .get();
    if (!item) throw new NotFoundException('餐次不存在');

    const updates: Record<string, any> = {};
    if (dto.recipeId !== undefined) updates.recipeId = dto.recipeId;
    if (dto.mealType !== undefined) updates.mealType = dto.mealType;
    if (dto.dayOfWeek !== undefined) updates.dayOfWeek = dto.dayOfWeek;
    if (dto.note !== undefined) updates.note = dto.note;

    await this.db.update(hhMealPlanItems)
      .set(updates)
      .where(eq(hhMealPlanItems.id, itemId))
      .run();

    return this.loadItems(plan);
  }

  async removeItem(planId: number, familyId: number, itemId: number): Promise<MealPlanResponse> {
    const plan = await this.db.select().from(hhMealPlans)
      .where(and(eq(hhMealPlans.id, planId), eq(hhMealPlans.familyId, familyId)))
      .get();
    if (!plan) throw new NotFoundException('餐饮计划不存在');

    await this.db.delete(hhMealPlanItems)
      .where(and(eq(hhMealPlanItems.id, itemId), eq(hhMealPlanItems.planId, planId)))
      .run();

    return this.loadItems(plan);
  }

  async generateShoppingList(planId: number, familyId: number) {
    const plan = await this.db.select().from(hhMealPlans)
      .where(and(eq(hhMealPlans.id, planId), eq(hhMealPlans.familyId, familyId)))
      .get();
    if (!plan) throw new NotFoundException('餐饮计划不存在');

    // Collect all invItems with recipe details
    const planItems = await this.db.select().from(hhMealPlanItems)
      .where(eq(hhMealPlanItems.planId, planId))
      .all();

    // Aggregate ingredients across all meals
    const ingredients: Map<string, { name: string; quantity: number; unit: string }> = new Map();

    for (const item of planItems) {
      const recipe = await this.db.select().from(hhRecipes)
        .where(eq(hhRecipes.id, item.recipeId))
        .get();

      if (recipe?.ingredients) {
        for (const ing of recipe.ingredients as any[]) {
          const key = ing.itemName?.toLowerCase() || ing.name?.toLowerCase();
          if (!key) continue;
          const existing = ingredients.get(key);
          if (existing) {
            existing.quantity += (ing.quantity || 1);
          } else {
            ingredients.set(key, {
              name: ing.itemName || ing.name,
              quantity: ing.quantity || 1,
              unit: ing.unit || '个',
            });
          }
        }
      }
    }

    // Check stock
    const stockItems = await this.db.select().from(invItems)
      .where(eq(invItems.familyId, familyId))
      .all();

    const stockMap = new Map(stockItems.map((i: any) => [i.name.toLowerCase(), i]));

    // Find or create shopping list
    let shoppingList = await this.db.select().from(hhLists)
      .where(and(
        eq(hhLists.familyId, familyId),
        eq(hhLists.type, 'shopping' as any),
      ))
      .get();

    if (!shoppingList) {
      shoppingList = await this.db.insert(hhLists).values({
        familyId,
        name: '餐饮计划采购清单',
        type: 'shopping' as any,
        createdBy: plan.createdBy,
      }).returning().get();
    }

    let addedCount = 0;
    const addedItems: string[] = [];

    for (const ing of Array.from(ingredients.values())) {
      const stock: any = stockMap.get(ing.name.toLowerCase());
      const needed = stock ? Math.max(0, ing.quantity - (stock.quantity || 0)) : ing.quantity;

      if (needed > 0) {
        // Check if already in list
        const existingItem = await this.db.select().from(hhListItems)
          .where(and(
            eq(hhListItems.listId, shoppingList.id),
            eq(hhListItems.content, ing.name),
            eq(hhListItems.status, 'pending' as any),
          ))
          .get();

        if (!existingItem) {
          await this.db.insert(hhListItems).values({
            listId: shoppingList.id,
            content: ing.name,
            quantity: needed,
            unit: ing.unit,
            notes: stock ? `库存 ${stock.quantity}${stock.unit}，还需 ${needed}${ing.unit}` : '库存中无此物品',
          }).run();
          addedCount++;
          addedItems.push(ing.name);
        }
      }
    }

    return {
      listId: shoppingList.id,
      totalIngredients: ingredients.size,
      addedToShoppingList: addedCount,
      addedItems,
    };
  }

  async delete(planId: number, familyId: number) {
    const plan = await this.db.select().from(hhMealPlans)
      .where(and(eq(hhMealPlans.id, planId), eq(hhMealPlans.familyId, familyId)))
      .get();
    if (!plan) throw new NotFoundException('餐饮计划不存在');

    // Items are cascade-deleted by FK
    await this.db.delete(hhMealPlans)
      .where(eq(hhMealPlans.id, planId))
      .run();
    return { success: true };
  }

  private async loadItems(plan: any): Promise<MealPlanResponse> {
    const invItems = await this.db.select().from(hhMealPlanItems)
      .where(eq(hhMealPlanItems.planId, plan.id))
      .all();

    // Hydrate recipe details
    const withRecipes = await Promise.all(
      invItems.map(async (item: any) => {
        const recipe = await this.db.select().from(hhRecipes)
          .where(eq(hhRecipes.id, item.recipeId))
          .get();
        return { ...item, recipe: recipe || null };
      })
    );

    return {
      ...plan,
      invItems: withRecipes,
    };
  }
}