import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateMealPlanDto {
  @IsNumber()
  weekStart: number;

  @IsNumber()
  weekEnd: number;
}

export class AddMealPlanItemDto {
  @IsNumber()
  @Min(0)
  @Min(6)
  dayOfWeek: number;

  @IsEnum(['breakfast', 'lunch', 'dinner', 'snack'])
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';

  @IsNumber()
  recipeId: number;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateMealPlanItemDto {
  @IsNumber()
  @IsOptional()
  recipeId?: number;

  @IsString()
  @IsOptional()
  note?: string;
}
