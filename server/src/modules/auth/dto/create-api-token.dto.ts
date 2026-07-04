import { IsString, IsArray, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  name: string;

  @IsArray()
  @IsOptional()
  permissions?: string[];

  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  expiresInDays?: number;
}
