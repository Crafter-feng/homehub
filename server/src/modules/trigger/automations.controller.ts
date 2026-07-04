import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { CreateAutomationDto } from './dto/trigger.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationsController {
  constructor(private readonly triggerService: TriggerService) {}

  @Get()
  listAutomations(@Request() req: any) {
    return this.triggerService.listAutomations(req.user.familyId);
  }

  @Post()
  createAutomation(@Request() req: any, @Body() dto: CreateAutomationDto) {
    return this.triggerService.createAutomation(req.user.familyId, dto);
  }

  @Put(':id')
  updateAutomation(@Param('id') id: string, @Request() req: any, @Body() updates: Record<string, any>) {
    return this.triggerService.updateAutomation(parseInt(id), req.user.familyId, updates);
  }

  @Delete(':id')
  deleteAutomation(@Param('id') id: string, @Request() req: any) {
    return this.triggerService.deleteAutomation(parseInt(id), req.user.familyId);
  }

  @Post(':id/toggle')
  toggleAutomation(@Param('id') id: string, @Request() req: any) {
    return this.triggerService.toggleAutomation(parseInt(id), req.user.familyId);
  }

  @Post('presets')
  installPresetScenes(@Request() req: any) {
    return this.triggerService.installPresetScenes(req.user.familyId);
  }
}
