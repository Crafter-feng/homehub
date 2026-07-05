import { IsString, IsNumber, IsOptional, IsEnum, MinLength, MaxLength, Min } from 'class-validator';

export class CreateListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsEnum(['shopping', 'todo', 'chore', 'holiday', 'meal_plan'])
  type: 'shopping' | 'todo' | 'chore' | 'holiday' | 'meal_plan';

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  config?: {
    autoReset?: string;
    autoResetDays?: number;
    template?: string;
    autoPurchase?: boolean;
    autoConsume?: boolean;
  };
}

export class UpdateListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  config?: Record<string, any>;

  @IsOptional()
  isArchived?: boolean;
}

export class AddListItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  content: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  assigneeId?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  linkedProductId?: number;

  @IsNumber()
  @IsOptional()
  linkedRecipeId?: number;

  @IsNumber()
  @IsOptional()
  dueAt?: number;
}

export class UpdateListItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  dueAt?: number;
}

export class AssignListItemDto {
  @IsNumber()
  assigneeId: number;
}

export class AddCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}
