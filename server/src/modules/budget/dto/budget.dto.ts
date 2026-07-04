import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, Min, MaxLength } from 'class-validator';

export class CreateBudgetEntryDto {
  @IsEnum(['income', 'expense'])
  type: 'income' | 'expense';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @MaxLength(50)
  category: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @IsNumber()
  date: number;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsOptional()
  recurringConfig?: {
    frequency?: string;
    interval?: number;
    endDate?: number;
  };

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @IsOptional()
  relatedItemId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class UpdateBudgetEntryDto {
  @IsEnum(['income', 'expense'])
  @IsOptional()
  type?: 'income' | 'expense';

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @IsNumber()
  @IsOptional()
  date?: number;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsOptional()
  recurringConfig?: Record<string, any>;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class CreateSubscriptionDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @MaxLength(50)
  category: string;

  @IsEnum(['monthly', 'yearly', 'weekly', 'quarterly'])
  billingCycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly';

  @IsNumber()
  nextBillingDate: number;

  @IsNumber()
  startDate: number;

  @IsNumber()
  @IsOptional()
  endDate?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class UpdateSubscriptionDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @IsEnum(['monthly', 'yearly', 'weekly', 'quarterly'])
  @IsOptional()
  billingCycle?: 'monthly' | 'yearly' | 'weekly' | 'quarterly';

  @IsNumber()
  @IsOptional()
  nextBillingDate?: number;

  @IsNumber()
  @IsOptional()
  endDate?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

export class CreateBudgetCategoryDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsEnum(['income', 'expense'])
  type: 'income' | 'expense';

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  parentId?: number;
}
