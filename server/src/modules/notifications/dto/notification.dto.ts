import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, MinLength } from 'class-validator';

export class CreateNotificationRuleDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(['expiry', 'low_stock', 'chore_due', 'custom'])
  triggerType: 'expiry' | 'low_stock' | 'chore_due' | 'custom';

  @IsOptional()
  config?: {
    daysBeforeExpiry?: number;
    minStockLevel?: number;
    choreId?: number;
    customCondition?: string;
  };

  @IsEnum(['in_app', 'email', 'webhook'])
  channel: 'in_app' | 'email' | 'webhook';

  @IsOptional()
  channelConfig?: {
    email?: string;
    webhookUrl?: string;
  };

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateNotificationRuleDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsOptional()
  config?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class MarkAsReadDto {
  @IsNumber()
  notificationId: number;
}
