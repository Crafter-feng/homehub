import { IsString, IsEnum, IsArray, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EncoderTargetDto {
  @IsString()
  targetType: 'item' | 'location' | 'multi';

  @IsNumber()
  targetId: number;
}

export class GenerateDto {
  @IsEnum(['qr', 'nfc_ndef', 'barcode'])
  outputType: 'qr' | 'nfc_ndef' | 'barcode';

  @IsString()
  targetType: 'item' | 'location';

  @IsNumber()
  targetId: number;
}

export class BatchGenerateDto {
  @IsEnum(['qr', 'nfc_ndef', 'barcode'])
  outputType: 'qr' | 'nfc_ndef' | 'barcode';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EncoderTargetDto)
  targets: EncoderTargetDto[];
}