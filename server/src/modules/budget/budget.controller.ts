import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BudgetService } from './budget.service';
import {
  CreateBudgetEntryDto,
  UpdateBudgetEntryDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreateBudgetCategoryDto,
} from './dto/budget.dto';

@Controller('budget')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  // ═══════════════════════════════════════
  // 条目
  // ═══════════════════════════════════════

  @Get('entries')
  listEntries(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.budgetService.listEntries(req.user.familyId, {
      type,
      category,
      startDate: startDate ? parseInt(startDate) : undefined,
      endDate: endDate ? parseInt(endDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('entries/recent')
  getRecentEntries(@Request() req: any, @Query('limit') limit?: string) {
    return this.budgetService.getRecentEntries(req.user.familyId, limit ? parseInt(limit) : 10);
  }

  @Get('entries/:id')
  getEntry(@Param('id') id: string, @Request() req: any) {
    return this.budgetService.getEntryById(parseInt(id), req.user.familyId);
  }

  @Post('entries')
  createEntry(@Request() req: any, @Body() dto: CreateBudgetEntryDto) {
    return this.budgetService.createEntry(req.user.familyId, dto);
  }

  @Put('entries/:id')
  updateEntry(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateBudgetEntryDto) {
    return this.budgetService.updateEntry(parseInt(id), req.user.familyId, dto);
  }

  @Delete('entries/:id')
  deleteEntry(@Param('id') id: string, @Request() req: any) {
    return this.budgetService.deleteEntry(parseInt(id), req.user.familyId);
  }

  // ═══════════════════════════════════════
  // 统计
  // ═══════════════════════════════════════

  @Get('summary')
  getSummary(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.budgetService.getSummary(
      req.user.familyId,
      startDate ? new Date(parseInt(startDate)) : undefined,
      endDate ? new Date(parseInt(endDate)) : undefined,
    );
  }

  // ═══════════════════════════════════════
  // 分类
  // ═══════════════════════════════════════

  @Get('categories')
  listCategories(@Request() req: any, @Query('type') type?: string) {
    return this.budgetService.listCategories(req.user.familyId, type);
  }

  @Post('categories')
  createCategory(@Request() req: any, @Body() dto: CreateBudgetCategoryDto) {
    return this.budgetService.createCategory(req.user.familyId, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string, @Request() req: any) {
    return this.budgetService.deleteCategory(parseInt(id), req.user.familyId);
  }

  // ═══════════════════════════════════════
  // 订阅
  // ═══════════════════════════════════════

  @Get('subscriptions')
  listSubscriptions(@Request() req: any) {
    return this.budgetService.listSubscriptions(req.user.familyId);
  }

  @Get('subscriptions/monthly-cost')
  getMonthlyCost(@Request() req: any) {
    return this.budgetService.getMonthlySubscriptionCost(req.user.familyId);
  }

  @Post('subscriptions')
  createSubscription(@Request() req: any, @Body() dto: CreateSubscriptionDto) {
    return this.budgetService.createSubscription(req.user.familyId, dto);
  }

  @Put('subscriptions/:id')
  updateSubscription(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateSubscriptionDto) {
    return this.budgetService.updateSubscription(parseInt(id), req.user.familyId, dto);
  }

  @Delete('subscriptions/:id')
  deleteSubscription(@Param('id') id: string, @Request() req: any) {
    return this.budgetService.deleteSubscription(parseInt(id), req.user.familyId);
  }
}
