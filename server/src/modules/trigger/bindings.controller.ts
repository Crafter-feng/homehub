import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { CreateBindingDto, UpdateBindingDto } from './dto/trigger.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('bindings')
@UseGuards(JwtAuthGuard)
export class BindingsController {
  constructor(private readonly triggerService: TriggerService) {}

  @Get()
  listBindings(@Request() req: any, @Query('codeType') codeType?: string) {
    return this.triggerService.listBindings(req.user.familyId, codeType);
  }

  @Get('lookup')
  lookupBinding(@Query('code') code: string, @Query('codeType') codeType: string) {
    return this.triggerService.lookupBinding(code, codeType);
  }

  @Get(':id')
  getBinding(@Param('id') id: string) {
    return this.triggerService.getBindingById(parseInt(id));
  }

  @Post()
  createBinding(@Request() req: any, @Body() dto: CreateBindingDto) {
    return this.triggerService.createBinding(req.user.familyId, dto);
  }

  @Put(':id')
  updateBinding(@Param('id') id: string, @Body() dto: UpdateBindingDto) {
    return this.triggerService.updateBinding(parseInt(id), dto);
  }

  @Delete(':id')
  deleteBinding(@Param('id') id: string) {
    return this.triggerService.deleteBinding(parseInt(id));
  }
}
