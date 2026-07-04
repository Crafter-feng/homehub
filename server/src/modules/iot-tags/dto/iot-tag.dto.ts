import { IsString, IsNumber, IsOptional, IsEnum, MinLength, MaxLength, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReaderConfigDto {
  @IsString()
  @IsOptional()
  mqttTopic?: string;

  @IsNumber()
  @IsOptional()
  power?: number;
}

export class CreateReaderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsEnum(['hf', 'uhf'])
  @IsOptional()
  readerType?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  deviceId: string;

  @IsNumber()
  @IsOptional()
  hardwareDeviceId?: number;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ReaderConfigDto)
  config?: ReaderConfigDto;
}

export class UpdateReaderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsEnum(['hf', 'uhf'])
  @IsOptional()
  readerType?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ReaderConfigDto)
  config?: ReaderConfigDto;
}

export class CreateZoneDto {
  @IsNumber()
  readerId: number;

  @IsString()
  @IsOptional()
  tagPattern?: string;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateZoneDto {
  @IsString()
  @IsOptional()
  tagPattern?: string;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
