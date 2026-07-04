import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql } from 'drizzle-orm';
import { recipes, items } from '../../db/schema';
import { CreateRecipeDto, UpdateRecipeDto, CreateMealPlanDto, AddMealPlanItemDto } from './dto/recipe.dto';

@Injectable()
export class RecipesService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number, query?: string) {
    if (query) {
      const searchPattern = `%${query}%`;
      return this.db.select().from(recipes)
        .where(and(
          eq(recipes.familyId, familyId),
          sql`${recipes.name} LIKE ${searchPattern}`,
        )).all();
    }
    return this.db.select().from(recipes)
      .where(eq(recipes.familyId, familyId))
      .all();
  }

  async getById(recipeId: number) {
    const recipe = await this.db.select().from(recipes)
      .where(eq(recipes.id, recipeId))
      .get();
    if (!recipe) throw new NotFoundException('食谱不存在');
    return recipe;
  }

  async create(familyId: number, dto: CreateRecipeDto) {
    return this.db.insert(recipes).values({
      familyId,
      name: dto.name,
      description: dto.description,
      ingredients: dto.ingredients,
      steps: dto.steps,
      prepTime: dto.prepTime,
      cookTime: dto.cookTime,
      servings: dto.servings,
      image: dto.image,
      source: dto.source,
    }).returning().get();
  }

  async update(recipeId: number, familyId: number, dto: UpdateRecipeDto) {
    const recipe = await this.db.select().from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.familyId, familyId)))
      .get();
    if (!recipe) throw new NotFoundException('食谱不存在');

    await this.db.update(recipes).set({
      name: dto.name,
      description: dto.description,
      ingredients: dto.ingredients,
      steps: dto.steps,
      prepTime: dto.prepTime,
      cookTime: dto.cookTime,
      servings: dto.servings,
      image: dto.image,
      source: dto.source,
    }).where(eq(recipes.id, recipeId)).run();

    return this.getById(recipeId);
  }

  async delete(recipeId: number, familyId: number) {
    await this.db.delete(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.familyId, familyId)))
      .run();
    return { success: true };
  }

  async getRecommendations(familyId: number, limit: number = 5) {
    // 获取家庭库存的物品名称
    const stockItems = await this.db.select({ name: items.name })
      .from(items)
      .where(eq(items.familyId, familyId))
      .all();

    const stockNames = stockItems.map((i: any) => i.name.toLowerCase());

    // 获取所有食谱
    const allRecipes = await this.db.select().from(recipes)
      .where(eq(recipes.familyId, familyId))
      .all();

    // 计算匹配度
    const scored = allRecipes.map((recipe: any) => {
      const ingredients = (recipe.ingredients as any[]) || [];
      const matches = ingredients.filter((ing: any) =>
        stockNames.some((name: string) => name.includes(ing.itemName.toLowerCase()) || ing.itemName.toLowerCase().includes(name))
      ).length;
      return { ...recipe, matchCount: matches, totalIngredients: ingredients.length };
    });

    // 按匹配度排序
    scored.sort((a: any, b: any) => b.matchCount - a.matchCount);

    return scored.slice(0, limit);
  }

  /**
   * Export all recipes for a family as JSON (Grocy-compatible format).
   */
  async exportRecipes(familyId: number) {
    const allRecipes = await this.db.select().from(recipes)
      .where(eq(recipes.familyId, familyId))
      .all();

    return {
      format: 'homehub-recipe-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      recipes: allRecipes.map((r: any) => ({
        name: r.name,
        description: r.description || '',
        ingredients: r.ingredients || [],
        steps: r.steps || [],
        prepTime: r.prepTime,
        cookTime: r.cookTime,
        servings: r.servings,
        image: r.image,
        source: r.source,
        notes: r.notes,
      })),
    };
  }

  /**
   * Import recipes from JSON (compatible with Grocy format).
   *
   * Accepted format:
   * { recipes: [{ name, description, ingredients, steps, prepTime, cookTime, servings, image, source }] }
   * or Grocy format: array of { name, description, ingredients: [...], ... }
   */
  async importRecipes(familyId: number, data: any) {
    let recipeList: any[] = [];

    if (Array.isArray(data)) {
      // Grocy-compatible: plain array of recipes
      recipeList = data;
    } else if (data.recipes && Array.isArray(data.recipes)) {
      // HomeHub export format
      recipeList = data.recipes;
    } else {
      throw new Error('不支持的导入格式 — 需要 recipes 数组或 HomeHub/Grocy 导出格式');
    }

    const results: { name: string; success: boolean; id?: number; error?: string }[] = [];

    for (const item of recipeList) {
      try {
        if (!item.name) {
          results.push({ name: '(unnamed)', success: false, error: '缺少名称' });
          continue;
        }

        // Normalize ingredients
        const ingredients = Array.isArray(item.ingredients)
          ? item.ingredients.map((ing: any) => ({
              itemName: ing.itemName || ing.name || '未知',
              quantity: ing.quantity || 1,
              unit: ing.unit || '个',
              optional: ing.optional || false,
            }))
          : [];

        // Normalize steps
        const steps = Array.isArray(item.steps)
          ? item.steps.map((s: any, i: number) => ({
              stepNumber: s.stepNumber || s.number || (i + 1),
              instruction: s.instruction || s.description || String(s),
              duration: s.duration || undefined,
            }))
          : [];

        const result = await this.db.insert(recipes).values({
          familyId,
          name: item.name,
          description: item.description || '',
          ingredients,
          steps,
          prepTime: item.prepTime || null,
          cookTime: item.cookTime || null,
          servings: item.servings || null,
          image: item.image || null,
          source: item.source || 'import',
          notes: item.notes || '',
        }).returning().get();

        results.push({ name: item.name, success: true, id: result.id });
      } catch (e: any) {
        results.push({ name: item.name || '(unnamed)', success: false, error: e.message });
      }
    }

    return {
      total: recipeList.length,
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
}
