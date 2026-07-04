import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MealPlansService } from './meal-plans.service';

@Controller('meal-plans')
@UseGuards(JwtAuthGuard)
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  @Get()
  listPlans(@Request() req: any) {
    return this.mealPlansService.list(req.user.familyId);
  }

  @Get(':id')
  getPlan(@Param('id') id: string, @Request() req: any) {
    return this.mealPlansService.getById(parseInt(id), req.user.familyId);
  }

  @Post()
  createPlan(@Request() req: any, @Body() body: { weekStart: number; weekEnd: number }) {
    return this.mealPlansService.create(req.user.familyId, req.user.id, body);
  }

  @Post(':id/items')
  addItem(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { dayOfWeek: number; mealType: string; recipeId: number; note?: string }
  ) {
    return this.mealPlansService.addItem(parseInt(id), req.user.familyId, body);
  }

  @Put(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Request() req: any,
    @Body() body: { recipeId?: number; mealType?: string; dayOfWeek?: number; note?: string }
  ) {
    return this.mealPlansService.updateItem(
      parseInt(id), req.user.familyId, parseInt(itemId), body
    );
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Request() req: any,
  ) {
    return this.mealPlansService.removeItem(
      parseInt(id), req.user.familyId, parseInt(itemId)
    );
  }

  @Post(':id/generate-shopping')
  generateShoppingList(@Param('id') id: string, @Request() req: any) {
    return this.mealPlansService.generateShoppingList(parseInt(id), req.user.familyId);
  }

  @Delete(':id')
  deletePlan(@Param('id') id: string, @Request() req: any) {
    return this.mealPlansService.delete(parseInt(id), req.user.familyId);
  }
}