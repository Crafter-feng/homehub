import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('activities')
  getRecentActivities(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentActivities(
      req.user.familyId,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('summary')
  getSummary(@Request() req: any) {
    return this.dashboardService.getStockSummary(req.user.familyId);
  }

  @Get('waste-analysis')
  getWasteAnalysis(@Request() req: any) {
    return this.dashboardService.getWasteAnalysis(req.user.familyId);
  }
}
