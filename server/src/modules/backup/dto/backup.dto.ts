import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateBackupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  includeDocuments?: boolean;
}

export class RestoreBackupDto {
  @IsString()
  filename: string;

  @IsBoolean()
  @IsOptional()
  createPreRestoreBackup?: boolean;
}

export class ScheduleBackupDto {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  @IsOptional()
  cronExpression?: string;

  @IsNumber()
  @IsOptional()
  retentionDays?: number;
}
