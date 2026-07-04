import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, MinLength, MaxLength } from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  date: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsEnum(['reminder', 'birthday', 'appointment', 'chore', 'custom'])
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsEnum(['none', 'daily', 'weekly', 'monthly', 'yearly'])
  @IsOptional()
  recurrence?: string;

  @IsNumber()
  @IsOptional()
  reminderMinutes?: number;

  @IsString()
  @IsOptional()
  relatedType?: string;

  @IsNumber()
  @IsOptional()
  relatedId?: number;
}

export class UpdateCalendarEventDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsEnum(['reminder', 'birthday', 'appointment', 'chore', 'custom'])
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsEnum(['none', 'daily', 'weekly', 'monthly', 'yearly'])
  @IsOptional()
  recurrence?: string;

  @IsNumber()
  @IsOptional()
  reminderMinutes?: number;
}
