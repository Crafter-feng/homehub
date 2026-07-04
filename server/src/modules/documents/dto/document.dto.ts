import { IsOptional, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadMetaDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  itemId?: number;

  @IsOptional()
  @IsIn(['warranty', 'manual', 'invoice', 'receipt', 'other'])
  category?: string;
}
