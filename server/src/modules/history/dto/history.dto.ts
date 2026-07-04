import { IsOptional, IsString, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../../common/dto/pagination.dto';

export class TimelineQueryDto extends PaginationQuery {
  @IsOptional()
  @IsIn(['add', 'consume', 'transfer', 'adjust'])
  type?: string;

  @IsOptional()
  @IsIn(['manual', 'barcode', 'nfc', 'rfid', 'voice', 'vision', 'mcp'])
  source?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
