import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto, UpdateRecipeDto } from './dto/recipe.dto';

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  listRecipes(@Request() req: any, @Query('q') query?: string) {
    return this.recipesService.list(req.user.familyId, query);
  }

  @Get('recommendations')
  getRecommendations(@Request() req: any, @Query('limit') limit?: string) {
    return this.recipesService.getRecommendations(req.user.familyId, limit ? parseInt(limit) : 5);
  }

  @Get(':id/due-score')
  getDueScore(@Param('id') id: string, @Request() req: any) {
    return this.recipesService.getDueScore(parseInt(id), req.user.familyId);
  }

  @Get(':id')
  getRecipe(@Param('id') id: string) {
    return this.recipesService.getById(parseInt(id));
  }

  @Post()
  createRecipe(@Request() req: any, @Body() dto: CreateRecipeDto) {
    return this.recipesService.create(req.user.familyId, dto);
  }

  @Put(':id')
  updateRecipe(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  deleteRecipe(@Param('id') id: string, @Request() req: any) {
    return this.recipesService.delete(parseInt(id), req.user.familyId);
  }

  @Get('export')
  exportRecipes(@Request() req: any) {
    return this.recipesService.exportRecipes(req.user.familyId);
  }

  @Post('import')
  importRecipes(@Request() req: any, @Body() data: any) {
    return this.recipesService.importRecipes(req.user.familyId, data);
  }
}
