import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { CreateNotificationRuleDto, UpdateNotificationRuleDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // === 通知规则 ===
  @Get('rules')
  listRules(@Request() req: any) {
    return this.notificationsService.listRules(req.user.familyId);
  }

  @Post('rules')
  createRule(@Request() req: any, @Body() dto: CreateNotificationRuleDto) {
    return this.notificationsService.createRule(req.user.familyId, dto);
  }

  @Put('rules/:id')
  updateRule(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateNotificationRuleDto) {
    return this.notificationsService.updateRule(parseInt(id), req.user.familyId, dto);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.deleteRule(parseInt(id), req.user.familyId);
  }

  @Post('rules/:id/toggle')
  toggleRule(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.toggleRule(parseInt(id), req.user.familyId);
  }

  // === 通知列表 ===
  @Get()
  listNotifications(@Request() req: any, @Query('unread') unread?: string) {
    return this.notificationsService.listNotifications(req.user.id, req.user.familyId, unread === 'true');
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id, req.user.familyId);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markAsRead(parseInt(id), req.user.id);
  }

  @Post('read-all')
  markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id, req.user.familyId);
  }

  @Post('check-expiring')
  checkExpiringItems(@Request() req: any) {
    return this.notificationsService.checkExpiringItems(req.user.familyId);
  }

  @Post('send-webhook')
  async sendTestWebhook(
    @Request() req: any,
    @Body() body: { title: string; message: string; webhookUrl: string }
  ) {
    const success = await this.notificationsService.sendWebhook(body.webhookUrl, {
      title: body.title,
      message: body.message,
      type: 'test',
      timestamp: new Date().toISOString(),
    });
    return { success, message: success ? 'Webhook 发送成功' : 'Webhook 发送失败' };
  }
}
