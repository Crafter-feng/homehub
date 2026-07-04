import { IsString, IsNumber, IsOptional, IsArray, MinLength, MaxLength, Min } from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  ingredients: Array<{
    itemName: string;
    quantity: number;
    unit: string;
    optional?: boolean;
  }>;

  @IsArray()
  steps: Array<{
    stepNumber: number;
    instruction: string;
    duration?: string;
  }>;

  @IsNumber()
  @IsOptional()
  prepTime?: number;

  @IsNumber()
  @IsOptional()
  cookTime?: number;

  @IsNumber()
  @IsOptional()
  servings?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  source?: string;
}

export class UpdateRecipeDto extends CreateRecipeDto {}

export class CreateMealPlanDto {
  @IsNumber()
  weekStart: number;

  @IsNumber()
  weekEnd: number;
}

export class AddMealPlanItemDto {
  @IsNumber()
  dayOfWeek: number;

  @IsString()
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';

  @IsNumber()
  recipeId: number;

  @IsString()
  @IsOptional()
  note?: string;
}
