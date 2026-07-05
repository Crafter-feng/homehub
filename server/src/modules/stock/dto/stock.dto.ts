import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateItemDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  shop?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  purchaseDate?: number;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  expiryDate?: number;

  @IsNumber()
  @IsOptional()
  productId?: number;

  @IsNumber()
  @IsOptional()
  caloriesPerUnit?: number;

  @IsNumber()
  @IsOptional()
  tareWeight?: number;

  @IsOptional()
  customFields?: Record<string, unknown>;
}

// UpdateItemDto — independent definition, all fields optional (no inheritance from CreateItemDto)
export class UpdateItemDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  shop?: string;

  @IsString()
  @IsOptional()
  spec?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  purchaseDate?: number;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  expiryDate?: number;

  @IsString()
  @IsOptional()
  currentState?: string;

  @IsOptional()
  customFields?: Record<string, unknown>;
}

export class ConsumeItemDto {
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsNumber()
  @IsOptional()
  batchId?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  spoiled?: number;

  @IsNumber()
  @IsOptional()
  recipeId?: number;
}

export class UpdateBatchDto {
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  expiryDate?: number;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  purchaseDate?: number;

  @IsNumber()
  @IsOptional()
  locationId?: number;
}

export class TransferItemDto {
  @IsNumber()
  toLocationId: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  quantity?: number;
}

export class AdjustItemDto {
  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  note?: string;
}

export class StockInItemDto {
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  shop?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  expiryDate?: number;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  purchaseDate?: number;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsNumber()
  @IsOptional()
  productId?: number;
}

export class CreateBatchDto {
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsString()
  unit: string;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  purchaseDate?: number;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value;
  })
  @IsNumber()
  @IsOptional()
  expiryDate?: number;

  @IsNumber()
  @IsOptional()
  locationId?: number;
}
