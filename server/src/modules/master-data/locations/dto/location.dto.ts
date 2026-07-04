import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsNumber()
  @IsOptional()
  level?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateLocationDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsNumber()
  @IsOptional()
  level?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
