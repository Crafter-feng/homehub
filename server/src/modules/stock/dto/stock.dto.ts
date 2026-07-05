import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @IsString()
  @IsOptional()
  shop?: string;

  @IsNumber()
  @IsOptional()
  defaultPrice?: number;

  @IsNumber()
  @IsOptional()
  defaultBestBeforeDays?: number;

  @IsNumber()
  @IsOptional()
  defaultBestBeforeDaysAfterOpen?: number;

  @IsNumber()
  @IsOptional()
  moveOnOpenLocationId?: number;

  @IsString()
  @IsOptional()
  purchaseUnit?: string;

  @IsString()
  @IsOptional()
  stockUnit?: string;

  @IsString()
  @IsOptional()
  consumeUnit?: string;

  @IsNumber()
  @IsOptional()
  purchaseToStockFactor?: number;

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsNumber()
  @IsOptional()
  caloriesPerUnit?: number;

  @IsNumber()
  @IsOptional()
  tareWeight?: number;

  @IsString()
  @IsOptional()
  spec?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateProductDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @IsString()
  @IsOptional()
  shop?: string;

  @IsNumber()
  @IsOptional()
  defaultPrice?: number;

  @IsNumber()
  @IsOptional()
  defaultBestBeforeDays?: number;

  @IsNumber()
  @IsOptional()
  defaultBestBeforeDaysAfterOpen?: number;

  @IsNumber()
  @IsOptional()
  moveOnOpenLocationId?: number;

  @IsString()
  @IsOptional()
  purchaseUnit?: string;

  @IsString()
  @IsOptional()
  stockUnit?: string;

  @IsString()
  @IsOptional()
  consumeUnit?: string;

  @IsNumber()
  @IsOptional()
  purchaseToStockFactor?: number;

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsNumber()
  @IsOptional()
  caloriesPerUnit?: number;

  @IsNumber()
  @IsOptional()
  tareWeight?: number;

  @IsString()
  @IsOptional()
  spec?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class StockInDto {
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
}

export class ConsumeDto {
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

export class TransferDto {
  @IsNumber()
  toLocationId: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  quantity?: number;
}

export class AdjustDto {
  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  note?: string;
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

  @IsString()
  @IsOptional()
  shop?: string;

  @IsNumber()
  @IsOptional()
  price?: number;
}
