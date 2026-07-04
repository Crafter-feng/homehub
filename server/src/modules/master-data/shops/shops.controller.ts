import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ShopsService } from './shops.service';

@Controller('shops')
@UseGuards(JwtAuthGuard)
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  list(@Request() req: any) {
    return this.shopsService.list(req.user.familyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: { name: string; icon?: string; address?: string; notes?: string }) {
    return this.shopsService.create(req.user.familyId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: { name?: string; icon?: string; address?: string; notes?: string }) {
    return this.shopsService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.shopsService.delete(parseInt(id), req.user.familyId);
  }
}
