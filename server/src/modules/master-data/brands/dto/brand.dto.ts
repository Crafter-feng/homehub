import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateBrandDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
