import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class FieldOptionDto {
  @IsString()
  label: string;

  @IsString()
  value: string;
}

export class CreateFieldDefDto {
  @IsString()
  entityType: string;

  @IsString()
  fieldName: string;

  @IsString()
  fieldLabel: string;

  @IsString()
  @IsIn(['text', 'number', 'boolean', 'date', 'select', 'multiselect'])
  fieldType: string;

  @IsOptional()
  fieldConfig?: {
    options?: FieldOptionDto[];
    min?: number;
    max?: number;
    pattern?: string;
    placeholder?: string;
    defaultValue?: any;
  };

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateFieldDefDto {
  @IsString()
  @IsOptional()
  fieldLabel?: string;

  @IsOptional()
  fieldConfig?: {
    options?: FieldOptionDto[];
    min?: number;
    max?: number;
    pattern?: string;
    placeholder?: string;
    defaultValue?: any;
  };

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class SetFieldValueDto {
  @IsString()
  fieldName: string;

  value: any;
}

export class BatchSetValuesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetFieldValueDto)
  values: SetFieldValueDto[];
}
