import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HistoryService } from './history.service';
import { TimelineQueryDto } from './dto/history.dto';
import { PaginationQuery } from '../../common/dto/pagination.dto';

/**
 * ItemHistoryController — REMOVED.
 *
 * This was a duplicate of StockController's GET /stock/items/:id/history.
 * All item history access should go through the stock module.
 * The HistoryController (GET /history/timeline) remains for family-level timeline queries.
 */
// ItemHistoryController removed — use StockController.getItemHistory instead

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('timeline')
  getFamilyTimeline(@Request() req: any, @Query() filters: TimelineQueryDto) {
    const pagination = new PaginationQuery();
    pagination.page = filters.page ?? 1;
    pagination.limit = filters.limit ?? 20;
    pagination.sortBy = filters.sortBy;
    pagination.sortOrder = filters.sortOrder ?? 'desc';
    return this.historyService.getFamilyTimeline(req.user.familyId, filters, pagination);
  }

  @Get('scan-logs')
  getScanLogs(@Request() req: any, @Query('limit') limit?: string) {
    return this.historyService.getScanLogs(req.user.familyId, limit ? parseInt(limit) : undefined);
  }
}
