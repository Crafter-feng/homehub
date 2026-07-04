import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('families')
  listFamilies() {
    return this.adminService.listFamilies();
  }

  @Get('tokens')
  listApiTokens(@Request() req: any, @Query('familyId') familyId?: string) {
    // 默认按当前用户家庭过滤，支持 ?familyId= 覆盖
    const filterFamilyId = familyId ? parseInt(familyId) : req.user.familyId;
    return this.adminService.listApiTokens(filterFamilyId);
  }

  @Get('plugins')
  getPluginOverview() {
    return this.adminService.getPluginOverview();
  }
}
