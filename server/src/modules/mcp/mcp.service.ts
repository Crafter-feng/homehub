import { Injectable, Inject, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { apiTokens } from '../../db/schema';
import { DATABASE_TOKEN } from '../../db/database.module';
import { StockService } from '../stock/stock.service';
import { ListsService } from '../lists/lists.service';
import { RecipesService } from '../recipes/recipes.service';
import { TriggerService } from '../trigger/trigger.service';
import { ScannerService } from '../scanner/scanner.service';
import { LocationsService } from '../master-data/locations/locations.service';
import { CategoriesService } from '../master-data/categories/categories.service';
import { TagsService } from '../master-data/tags/tags.service';
import { BrandsService } from '../master-data/brands/brands.service';
import { UnitsService } from '../master-data/units/units.service';
import { MealPlansService } from '../meal-plans/meal-plans.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { NotificationsService } from '../notifications/notifications.service';
import { HistoryService } from '../history/history.service';

/**
 * McpService — MCP tool execution backend.
 *
 * Generic callApi() proxy method dispatches to real Service methods
 * based on the apiPath pattern. No tool-name hardcoding — any MCP tool
 * registered to the 'mcp-tool' extension point with an apiPath will work
 * automatically if the path matches a known internal service route.
 */
@Injectable()
export class McpService {
  private readonly logger = new Logger('McpService');

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
    private readonly stockService: StockService,
    private readonly listsService: ListsService,
    private readonly recipesService: RecipesService,
    private readonly triggerService: TriggerService,
    private readonly scannerService: ScannerService,
    private readonly locationsService: LocationsService,
    private readonly categoriesService: CategoriesService,
    private readonly tagsService: TagsService,
    private readonly brandsService: BrandsService,
    private readonly unitsService: UnitsService,
    private readonly mealPlansService: MealPlansService,
    private readonly dashboardService: DashboardService,
    private readonly notificationsService: NotificationsService,
    private readonly historyService: HistoryService,
  ) {}

  // === Authentication ===

  /** Validate an MCP API token and return the associated user context. */
  async validateToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.db.select().from(apiTokens)
      .where(and(eq(apiTokens.tokenHash, tokenHash), eq(apiTokens.isRevoked, false)))
      .get();

    if (!record) return null;
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) return null;

    await this.db.update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, record.id))
      .run();

    return { userId: record.userId, familyId: record.familyId, permissions: record.permissions };
  }

  // === Generic API Proxy ===

  /**
   * Generic proxy method for MCP tool execution.
   *
   * Flow:
   * 1. Extract path parameters from apiPath template (e.g., {item_id} from
   *    /v1/stock/invItems/{item_id}/consume) and replace with actual values from params.
   * 2. Separate path params from body/query params.
   * 3. Dispatch to the appropriate internal Service based on resolved path prefix.
   *
   * This method does NOT hardcode tool names — it routes by REST-like path patterns.
   * Third-party MCP tools with apiPaths matching internal service routes work automatically.
   * Unknown paths throw an error (Phase 1+ will add HTTP dispatch for external APIs).
   *
   * @param method   - HTTP method (GET/POST/PUT/DELETE) from McpToolExports
   * @param apiPath  - REST-like path template, may contain {param} placeholders
   * @param params   - All parameters from the MCP tool call arguments
   * @param familyId - Family ID from the authenticated user's token
   * @param userId   - User ID from the authenticated user's token
   */
  async callApi(
    method: string,
    apiPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // Step 1: Extract path parameter keys from the apiPath template
    const pathParamKeys = this.extractPathParamKeys(apiPath);

    // Step 2: Replace path params in the apiPath with actual values
    let resolvedPath = apiPath;
    for (const key of pathParamKeys) {
      const value = params[key];
      if (value !== undefined) {
        resolvedPath = resolvedPath.replace(`{${key}}`, String(value));
      }
    }

    // Step 3: Separate body/query params (exclude path params that were consumed)
    const bodyParams: Record<string, any> = {};
    for (const [k, v] of Object.entries(params)) {
      if (!pathParamKeys.includes(k)) {
        bodyParams[k] = v;
      }
    }

    // Step 4: Dispatch to the appropriate internal service
    this.logger.log(`callApi: ${method} ${resolvedPath} (familyId=${familyId}, userId=${userId})`);
    return this.internalDispatch(method, resolvedPath, bodyParams, familyId, userId);
  }

  // === Internal Dispatch ===

  /**
   * Route the resolved apiPath + method to the appropriate service.
   * Organized by REST resource prefix for clarity and extensibility.
   */
  private async internalDispatch(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // ── Stock ──
    if (resolvedPath.startsWith('/v1/stock/')) {
      return this.dispatchStock(method, resolvedPath, params, familyId, userId);
    }
    // ── Lists ──
    if (resolvedPath.startsWith('/v1/hhLists/') || resolvedPath === '/v1/hhLists') {
      return this.dispatchLists(method, resolvedPath, params, familyId, userId);
    }
    // ── Recipes ──
    if (resolvedPath.startsWith('/v1/hhRecipes/')) {
      return this.dispatchRecipes(method, resolvedPath, params, familyId, userId);
    }
    // ── Meal Plans ──
    if (resolvedPath.startsWith('/v1/meal-plans')) {
      return this.dispatchMealPlans(method, resolvedPath, params, familyId, userId);
    }
    // ── Bindings ──
    if (resolvedPath.startsWith('/v1/bindings')) {
      return this.dispatchBindings(method, resolvedPath, params, familyId, userId);
    }
    // ── Automations ──
    if (resolvedPath.startsWith('/v1/automations')) {
      return this.dispatchAutomations(method, resolvedPath, params, familyId, userId);
    }
    // ── Scanner ──
    if (resolvedPath.startsWith('/v1/scanner/')) {
      return this.dispatchScanner(method, resolvedPath, params, familyId, userId);
    }
    // ── Locations ──
    if (resolvedPath.startsWith('/v1/mdLocations')) {
      return this.dispatchLocations(method, resolvedPath, params, familyId, userId);
    }
    // ── Categories ──
    if (resolvedPath.startsWith('/v1/mdCategories')) {
      return this.dispatchCategories(method, resolvedPath, params, familyId, userId);
    }
    // ── Tags / Brands / Units ──
    if (resolvedPath.startsWith('/v1/mdTags') && method === 'GET') {
      return { mdTags: await this.tagsService.list(familyId) };
    }
    if (resolvedPath.startsWith('/v1/mdBrands') && method === 'GET') {
      return { mdBrands: await this.brandsService.list(familyId) };
    }
    if (resolvedPath.startsWith('/v1/mdUnits') && method === 'GET') {
      return { mdUnits: await this.unitsService.list(familyId) };
    }
    // ── Dashboard ──
    if (resolvedPath.startsWith('/v1/dashboard/')) {
      return this.dispatchDashboard(method, resolvedPath, params, familyId, userId);
    }
    // ── Notifications ──
    if (resolvedPath.startsWith('/v1/sysNotifications')) {
      return this.dispatchNotifications(method, resolvedPath, params, familyId, userId);
    }
    // ── History ──
    if (resolvedPath.startsWith('/v1/history/')) {
      return this.dispatchHistory(method, resolvedPath, params, familyId, userId);
    }

    this.logger.warn(`未知的 API 路径: ${resolvedPath} (${method})`);
    throw new Error(`未知的 API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Stock Dispatch
  // ═══════════════════════════════════════════

  private async dispatchStock(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/stock/invItems → search_items
    if (resolvedPath === '/v1/stock/invItems' && method === 'GET') {
      if (params.query) {
        return this.stockService.search(familyId, params.query, {
          page: 1,
          limit: params.limit || 20,
        });
      }
      return this.stockService.list(familyId, {
        category: params.category,
        location: params.location,
        expiring: params.expiring_in_days,
      }, {
        page: 1,
        limit: params.limit || 20,
      });
    }

    // POST /v1/stock/invItems → add_item
    if (resolvedPath === '/v1/stock/invItems' && method === 'POST') {
      return this.stockService.create(familyId, {
        name: params.name,
        type: params.type || 'generic',
        barcode: params.barcode,
        locationId: params.location_id ? parseInt(params.location_id, 10) : undefined,
        quantity: params.quantity ?? 1,
        unit: params.unit || '个',
        notes: params.notes,
        expiryDate: params.expiry_date,
      }, userId);
    }

    // GET /v1/stock/invItems/{id} → get_item
    const getItemMatch = resolvedPath.match(/^\/v1\/stock\/invItems\/(\d+)$/);
    if (getItemMatch && method === 'GET') {
      const itemId = parseInt(getItemMatch[1], 10);
      return this.stockService.getById(itemId, familyId);
    }

    // PUT /v1/stock/invItems/{id} → update_item
    const updateMatch = resolvedPath.match(/^\/v1\/stock\/invItems\/(\d+)$/);
    if (updateMatch && method === 'PUT') {
      const itemId = parseInt(updateMatch[1], 10);
      return this.stockService.update(itemId, familyId, {
        name: params.name,
        quantity: params.quantity,
        expiryDate: params.expiry_date,
        notes: params.notes,
      });
    }

    // DELETE /v1/stock/invItems/{id} → delete_item
    const deleteMatch = resolvedPath.match(/^\/v1\/stock\/invItems\/(\d+)$/);
    if (deleteMatch && method === 'DELETE') {
      const itemId = parseInt(deleteMatch[1], 10);
      return this.stockService.delete(itemId, familyId);
    }

    // POST /v1/stock/invItems/{id}/consume → consume_item
    const consumeMatch = resolvedPath.match(/^\/v1\/stock\/invItems\/(\d+)\/consume$/);
    if (consumeMatch && method === 'POST') {
      const itemId = parseInt(consumeMatch[1], 10);
      return this.stockService.consume(itemId, familyId, userId, {
        quantity: params.quantity,
        note: params.note,
      });
    }

    // POST /v1/stock/invItems/{id}/adjust → adjust_item
    const adjustMatch = resolvedPath.match(/^\/v1\/stock\/invItems\/(\d+)\/adjust$/);
    if (adjustMatch && method === 'POST') {
      const itemId = parseInt(adjustMatch[1], 10);
      return this.stockService.adjust(itemId, familyId, userId, {
        quantity: params.quantity,
        note: params.note,
      });
    }

    // POST /v1/stock/invItems/{id}/transfer → move_item
    const transferMatch = resolvedPath.match(/^\/v1\/stock\/invItems\/(\d+)\/transfer$/);
    if (transferMatch && method === 'POST') {
      const itemId = parseInt(transferMatch[1], 10);
      const toLocationId = parseInt(params.to_location_id, 10);
      if (!toLocationId || isNaN(toLocationId)) {
        throw new Error('缺少目标位置ID (to_location_id)');
      }
      return this.stockService.transfer(itemId, familyId, userId, {
        toLocationId,
      });
    }

    // GET /v1/stock/invItems/{id}/history → get_item_history
    const historyMatch = resolvedPath.match(/^\/v1\/stock\/invItems\/(\d+)\/history$/);
    if (historyMatch && method === 'GET') {
      const itemId = parseInt(historyMatch[1], 10);
      return this.stockService.getHistory(itemId, familyId);
    }

    // GET /v1/stock/summary → get_stock_summary
    if (resolvedPath === '/v1/stock/summary' && method === 'GET') {
      return this.stockService.getSummary(familyId);
    }

    // GET /v1/stock/expiring → get_expiring_items
    if (resolvedPath === '/v1/stock/expiring' && method === 'GET') {
      return this.stockService.getExpiring(familyId, params.days || 7);
    }

    throw new Error(`未知的 Stock API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Lists Dispatch
  // ═══════════════════════════════════════════

  private async dispatchLists(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/hhLists → get_lists
    if (resolvedPath === '/v1/hhLists' && method === 'GET') {
      return this.listsService.list(familyId, params.type);
    }

    // POST /v1/hhLists → create_list
    if (resolvedPath === '/v1/hhLists' && method === 'POST') {
      return this.listsService.create(familyId, userId, {
        name: params.name,
        type: params.type,
      });
    }

    // GET /v1/hhLists/{id} → get_list
    const getListMatch = resolvedPath.match(/^\/v1\/hhLists\/(\d+)$/);
    if (getListMatch && method === 'GET') {
      const listId = parseInt(getListMatch[1], 10);
      return this.listsService.getById(listId, familyId);
    }

    // PUT /v1/hhLists/{id} → update_list
    const updateListMatch = resolvedPath.match(/^\/v1\/hhLists\/(\d+)$/);
    if (updateListMatch && method === 'PUT') {
      const listId = parseInt(updateListMatch[1], 10);
      return this.listsService.update(listId, familyId, {
        name: params.name,
        notes: params.notes,
      });
    }

    // DELETE /v1/hhLists/{id} → delete_list
    const deleteListMatch = resolvedPath.match(/^\/v1\/hhLists\/(\d+)$/);
    if (deleteListMatch && method === 'DELETE') {
      const listId = parseInt(deleteListMatch[1], 10);
      return this.listsService.delete(listId, familyId);
    }

    // POST /v1/hhLists/{id}/invItems → add_to_list
    const addToListMatch = resolvedPath.match(/^\/v1\/hhLists\/(\d+)\/invItems$/);
    if (addToListMatch && method === 'POST') {
      const listId = parseInt(addToListMatch[1], 10);
      return this.listsService.addItem(listId, familyId, {
        content: params.content,
        quantity: params.quantity,
        assigneeId: params.assignee_id ? parseInt(params.assignee_id, 10) : undefined,
        notes: params.notes,
      });
    }

    // PUT /v1/hhLists/invItems/{id} → update_list_item
    const updateListItemMatch = resolvedPath.match(/^\/v1\/hhLists\/invItems\/(\d+)$/);
    if (updateListItemMatch && method === 'PUT') {
      const itemId = parseInt(updateListItemMatch[1], 10);
      return this.listsService.updateItem(itemId, familyId, {
        content: params.content,
        quantity: params.quantity,
        notes: params.notes,
      });
    }

    // DELETE /v1/hhLists/invItems/{id} → delete_list_item
    const deleteListItemMatch = resolvedPath.match(/^\/v1\/hhLists\/invItems\/(\d+)$/);
    if (deleteListItemMatch && method === 'DELETE') {
      const itemId = parseInt(deleteListItemMatch[1], 10);
      return this.listsService.deleteItem(itemId, familyId);
    }

    // POST /v1/hhLists/invItems/{id}/check → check_list_item
    const checkMatch = resolvedPath.match(/^\/v1\/hhLists\/invItems\/(\d+)\/check$/);
    if (checkMatch && method === 'POST') {
      const itemId = parseInt(checkMatch[1], 10);
      return this.listsService.checkItem(itemId, userId, familyId);
    }

    // POST /v1/hhLists/invItems/{id}/uncheck → uncheck_list_item
    const uncheckMatch = resolvedPath.match(/^\/v1\/hhLists\/invItems\/(\d+)\/uncheck$/);
    if (uncheckMatch && method === 'POST') {
      const itemId = parseInt(uncheckMatch[1], 10);
      return this.listsService.uncheckItem(itemId, familyId);
    }

    // POST /v1/hhLists/invItems/{id}/assign → assign_list_item
    const assignMatch = resolvedPath.match(/^\/v1\/hhLists\/invItems\/(\d+)\/assign$/);
    if (assignMatch && method === 'POST') {
      const itemId = parseInt(assignMatch[1], 10);
      return this.listsService.assignItem(itemId, familyId, {
        assigneeId: parseInt(params.assignee_id, 10),
      });
    }

    // GET /v1/hhLists/my-tasks → get_my_tasks
    if (resolvedPath === '/v1/hhLists/my-tasks' && method === 'GET') {
      return this.listsService.getMyTasks(userId, familyId);
    }

    // POST /v1/hhLists/auto-replenish → auto_replenish
    if (resolvedPath === '/v1/hhLists/auto-replenish' && method === 'POST') {
      return this.listsService.autoReplenish(familyId, userId);
    }

    throw new Error(`未知的 Lists API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Recipes Dispatch
  // ═══════════════════════════════════════════

  private async dispatchRecipes(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/hhRecipes/recommendations → get_recipe_recommendations
    if (resolvedPath === '/v1/hhRecipes/recommendations' && method === 'GET') {
      return this.recipesService.getRecommendations(familyId, params.recipe_count || 5);
    }

    // GET /v1/hhRecipes → search_recipes
    if (resolvedPath === '/v1/hhRecipes' && method === 'GET') {
      return this.recipesService.list(familyId, params.query);
    }

    // POST /v1/hhRecipes → create_recipe
    if (resolvedPath === '/v1/hhRecipes' && method === 'POST') {
      return this.recipesService.create(familyId, {
        name: params.name,
        description: params.description,
        ingredients: params.ingredients,
        steps: params.steps,
        prepTime: params.prepTime,
        cookTime: params.cookTime,
        servings: params.servings,
      });
    }

    // GET /v1/hhRecipes/{id} → get_recipe
    const getRecipeMatch = resolvedPath.match(/^\/v1\/hhRecipes\/(\d+)$/);
    if (getRecipeMatch && method === 'GET') {
      const recipeId = parseInt(getRecipeMatch[1], 10);
      return this.recipesService.getById(recipeId, familyId);
    }

    // PUT /v1/hhRecipes/{id} → update_recipe
    const updateRecipeMatch = resolvedPath.match(/^\/v1\/hhRecipes\/(\d+)$/);
    if (updateRecipeMatch && method === 'PUT') {
      const recipeId = parseInt(updateRecipeMatch[1], 10);
      return this.recipesService.update(recipeId, familyId, {
        name: params.name,
        description: params.description,
        ingredients: params.ingredients,
        steps: params.steps,
      });
    }

    // DELETE /v1/hhRecipes/{id} → delete_recipe
    const deleteRecipeMatch = resolvedPath.match(/^\/v1\/hhRecipes\/(\d+)$/);
    if (deleteRecipeMatch && method === 'DELETE') {
      const recipeId = parseInt(deleteRecipeMatch[1], 10);
      return this.recipesService.delete(recipeId, familyId);
    }

    throw new Error(`未知的 Recipes API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Meal Plans Dispatch
  // ═══════════════════════════════════════════

  private async dispatchMealPlans(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/meal-plans → get_meal_plans
    if (resolvedPath === '/v1/meal-plans' && method === 'GET') {
      return this.mealPlansService.list(familyId);
    }

    // POST /v1/meal-plans → create_meal_plan
    if (resolvedPath === '/v1/meal-plans' && method === 'POST') {
      return this.mealPlansService.create(familyId, userId, {
        weekStart: params.weekStart,
        weekEnd: params.weekEnd,
      });
    }

    // GET /v1/meal-plans/{id} → get_meal_plan
    const getPlanMatch = resolvedPath.match(/^\/v1\/meal-plans\/(\d+)$/);
    if (getPlanMatch && method === 'GET') {
      const planId = parseInt(getPlanMatch[1], 10);
      return this.mealPlansService.getById(planId, familyId);
    }

    // DELETE /v1/meal-plans/{id} → delete_meal_plan
    const deletePlanMatch = resolvedPath.match(/^\/v1\/meal-plans\/(\d+)$/);
    if (deletePlanMatch && method === 'DELETE') {
      const planId = parseInt(deletePlanMatch[1], 10);
      return this.mealPlansService.delete(planId, familyId);
    }

    // POST /v1/meal-plans/{id}/invItems → add_meal_plan_item
    const addItemMatch = resolvedPath.match(/^\/v1\/meal-plans\/(\d+)\/invItems$/);
    if (addItemMatch && method === 'POST') {
      const planId = parseInt(addItemMatch[1], 10);
      return this.mealPlansService.addItem(planId, familyId, {
        dayOfWeek: params.dayOfWeek,
        mealType: params.mealType,
        recipeId: params.recipeId,
        note: params.note,
      });
    }

    // POST /v1/meal-plans/{id}/generate-shopping → generate_shopping_from_meal_plan
    const genShopMatch = resolvedPath.match(/^\/v1\/meal-plans\/(\d+)\/generate-shopping$/);
    if (genShopMatch && method === 'POST') {
      const planId = parseInt(genShopMatch[1], 10);
      return this.mealPlansService.generateShoppingList(planId, familyId);
    }

    throw new Error(`未知的 Meal Plans API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Bindings Dispatch
  // ═══════════════════════════════════════════

  private async dispatchBindings(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/bindings → get_bindings
    if (resolvedPath === '/v1/bindings' && method === 'GET') {
      return this.triggerService.listBindings(familyId, params.location_id);
    }

    // POST /v1/bindings → create_binding
    if (resolvedPath === '/v1/bindings' && method === 'POST') {
      return this.triggerService.createBinding(familyId, {
        code: params.code,
        codeType: params.codeType,
        targetType: params.targetType,
        targetId: params.targetId,
        label: params.label,
      });
    }

    // GET /v1/bindings/lookup → lookup_binding
    if (resolvedPath === '/v1/bindings/lookup' && method === 'GET') {
      return this.triggerService.lookupBinding(params.code, params.codeType);
    }

    // PUT /v1/bindings/{id} → update_binding
    const updateBindingMatch = resolvedPath.match(/^\/v1\/bindings\/(\d+)$/);
    if (updateBindingMatch && method === 'PUT') {
      const bindingId = parseInt(updateBindingMatch[1], 10);
      return this.triggerService.updateBinding(bindingId, {
        targetId: params.targetId,
        targetType: params.targetType,
        label: params.label,
      });
    }

    // DELETE /v1/bindings/{id} → delete_binding
    const deleteBindingMatch = resolvedPath.match(/^\/v1\/bindings\/(\d+)$/);
    if (deleteBindingMatch && method === 'DELETE') {
      const bindingId = parseInt(deleteBindingMatch[1], 10);
      return this.triggerService.deleteBinding(bindingId);
    }

    throw new Error(`未知的 Bindings API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Automations Dispatch
  // ═══════════════════════════════════════════

  private async dispatchAutomations(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/automations → list_automations
    if (resolvedPath === '/v1/automations' && method === 'GET') {
      return this.triggerService.listAutomations(familyId);
    }

    // POST /v1/automations → create_automation
    if (resolvedPath === '/v1/automations' && method === 'POST') {
      return this.triggerService.createAutomation(familyId, {
        name: `MCP创建的自动化-${Date.now()}`,
        triggerType: params.trigger_type,
        actionType: params.action_type,
        actionConfig: params.action_config,
      });
    }

    // PUT /v1/automations/{id} → update_automation
    const updateAutoMatch = resolvedPath.match(/^\/v1\/automations\/(\d+)$/);
    if (updateAutoMatch && method === 'PUT') {
      const automationId = parseInt(updateAutoMatch[1], 10);
      return this.triggerService.updateAutomation(automationId, familyId, params);
    }

    // DELETE /v1/automations/{id} → delete_automation
    const deleteAutoMatch = resolvedPath.match(/^\/v1\/automations\/(\d+)$/);
    if (deleteAutoMatch && method === 'DELETE') {
      const automationId = parseInt(deleteAutoMatch[1], 10);
      return this.triggerService.deleteAutomation(automationId, familyId);
    }

    // POST /v1/automations/{id}/toggle → toggle_automation
    const toggleAutoMatch = resolvedPath.match(/^\/v1\/automations\/(\d+)\/toggle$/);
    if (toggleAutoMatch && method === 'POST') {
      const automationId = parseInt(toggleAutoMatch[1], 10);
      return this.triggerService.toggleAutomation(automationId, familyId);
    }

    throw new Error(`未知的 Automations API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Scanner Dispatch
  // ═══════════════════════════════════════════

  private async dispatchScanner(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/scanner/lookup → lookup_barcode
    if (resolvedPath === '/v1/scanner/lookup' && method === 'GET') {
      return this.scannerService.lookup(familyId, params.code);
    }

    throw new Error(`未知的 Scanner API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Locations Dispatch
  // ═══════════════════════════════════════════

  private async dispatchLocations(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/mdLocations → get_locations
    if (resolvedPath === '/v1/mdLocations' && method === 'GET') {
      return this.locationsService.list(familyId);
    }

    // POST /v1/mdLocations → create_location
    if (resolvedPath === '/v1/mdLocations' && method === 'POST') {
      return this.locationsService.create(familyId, {
        name: params.name,
        parentId: params.parentId,
        notes: params.notes,
      });
    }

    throw new Error(`未知的 Locations API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Categories Dispatch
  // ═══════════════════════════════════════════

  private async dispatchCategories(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/mdCategories → get_categories
    if (resolvedPath === '/v1/mdCategories' && method === 'GET') {
      return this.categoriesService.list(familyId);
    }

    // POST /v1/mdCategories → create_category
    if (resolvedPath === '/v1/mdCategories' && method === 'POST') {
      return this.categoriesService.create(familyId, {
        name: params.name,
      });
    }

    throw new Error(`未知的 Categories API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Dashboard Dispatch
  // ═══════════════════════════════════════════

  private async dispatchDashboard(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/dashboard/summary → get_dashboard_summary
    if (resolvedPath === '/v1/dashboard/summary' && method === 'GET') {
      return this.dashboardService.getStockSummary(familyId);
    }

    // GET /v1/dashboard/waste-analysis → get_waste_analysis
    if (resolvedPath === '/v1/dashboard/waste-analysis' && method === 'GET') {
      return this.dashboardService.getWasteAnalysis(familyId);
    }

    // GET /v1/dashboard/activities → get_recent_activities
    if (resolvedPath === '/v1/dashboard/activities' && method === 'GET') {
      return this.dashboardService.getRecentActivities(familyId, params.limit || 20);
    }

    throw new Error(`未知的 Dashboard API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // Notifications Dispatch
  // ═══════════════════════════════════════════

  private async dispatchNotifications(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/sysNotifications → get_notifications
    if (resolvedPath === '/v1/sysNotifications' && method === 'GET') {
      const unreadOnly = params.unread === 'true';
      return this.notificationsService.listNotifications(userId, familyId, unreadOnly);
    }

    // GET /v1/sysNotifications/unread-count → get_unread_notification_count
    if (resolvedPath === '/v1/sysNotifications/unread-count' && method === 'GET') {
      return this.notificationsService.getUnreadCount(userId, familyId);
    }

    // POST /v1/sysNotifications/{id}/read → mark_notification_read
    const markReadMatch = resolvedPath.match(/^\/v1\/sysNotifications\/(\d+)\/read$/);
    if (markReadMatch && method === 'POST') {
      const notificationId = parseInt(markReadMatch[1], 10);
      return this.notificationsService.markAsRead(notificationId, userId);
    }

    // POST /v1/sysNotifications/read-all → mark_all_notifications_read
    if (resolvedPath === '/v1/sysNotifications/read-all' && method === 'POST') {
      return this.notificationsService.markAllAsRead(userId, familyId);
    }

    throw new Error(`未知的 Notifications API 路径: ${resolvedPath} (${method})`);
  }

  // ═══════════════════════════════════════════
  // History Dispatch
  // ═══════════════════════════════════════════

  private async dispatchHistory(
    method: string,
    resolvedPath: string,
    params: Record<string, any>,
    familyId: number,
    userId: number,
  ): Promise<any> {
    // GET /v1/history/timeline → get_timeline
    if (resolvedPath === '/v1/history/timeline' && method === 'GET') {
      const pagination = { page: params.page || 1, limit: params.limit || 50 };
      return this.historyService.getFamilyTimeline(familyId, {
        type: params.type,
        source: params.source,
        startDate: params.startDate,
        endDate: params.endDate,
        page: pagination.page,
        limit: pagination.limit,
      }, pagination);
    }

    throw new Error(`未知的 History API 路径: ${resolvedPath} (${method})`);
  }

  // === Path Parameter Helpers ===

  /** Extract parameter keys from an apiPath template (e.g., {item_id}, {list_id}). */
  private extractPathParamKeys(apiPath: string): string[] {
    const matches = apiPath.matchAll(/\{(\w+)\}/g);
    return Array.from(matches, m => m[1]);
  }
}
