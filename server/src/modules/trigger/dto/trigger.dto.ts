import { IsString, IsNumber, IsOptional, IsEnum, IsArray, MinLength } from 'class-validator';

export class CreateBindingDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsEnum(['nfc', 'qr', 'barcode', 'rfid'])
  codeType: 'nfc' | 'qr' | 'barcode' | 'rfid';

  @IsEnum(['item', 'location', 'recipe', 'action'])
  targetType: 'item' | 'location' | 'recipe' | 'action';

  @IsNumber()
  targetId: number;

  @IsString()
  @IsOptional()
  actionOverride?: string;

  @IsString()
  @IsOptional()
  label?: string;
}

export class UpdateBindingDto {
  @IsNumber()
  @IsOptional()
  targetId?: number;

  @IsEnum(['item', 'location', 'recipe', 'action'])
  @IsOptional()
  targetType?: 'item' | 'location' | 'recipe' | 'action';

  @IsString()
  @IsOptional()
  actionOverride?: string;

  @IsString()
  @IsOptional()
  label?: string;
}

/**
 * ScanEventDto — incoming scan event from frontend scanner adapter.
 *
 * P-T03 extension: Added optional context fields (pagePath, locationId,
 * recentActions) that the frontend sends alongside the scan code. These
 * are used by TriggerResolverService.resolve() for context-aware action
 * inference (§8.6 Scanner 前端上报约定).
 */
export class ScanEventDto {
  @IsString()
  code: string;

  @IsEnum(['nfc', 'qr', 'barcode', 'rfid'])
  codeType: 'nfc' | 'qr' | 'barcode' | 'rfid';

  @IsOptional()
  metadata?: Record<string, any>;

  /** Current page path of the user (e.g., "/stock/invItems", "/shopping") */
  @IsString()
  @IsOptional()
  pagePath?: string;

  /** Known location ID of the user/device */
  @IsNumber()
  @IsOptional()
  locationId?: number;

  /** Recent action types performed by the user (for pattern inference) */
  @IsArray()
  @IsOptional()
  recentActions?: string[];
}

export class CreateAutomationDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(['nfc_tap', 'qr_scan', 'barcode_scan', 'rfid_enter', 'rfid_exit', 'scheduled', 'custom'])
  triggerType: string;

  @IsOptional()
  triggerConfig?: Record<string, any>;

  @IsEnum(['open_page', 'run_notification', 'call_mcp_tool', 'run_workflow'])
  actionType: string;

  @IsOptional()
  actionConfig?: Record<string, any>;

  @IsOptional()
  enabled?: boolean;
}
