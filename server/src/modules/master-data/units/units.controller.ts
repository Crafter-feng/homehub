import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { UnitsService } from './units.service';

@Controller('units')
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  list(@Request() req: any) {
    return this.unitsService.list(req.user.familyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: { name: string; parentId?: number; conversionFactor?: number; notes?: string }) {
    return this.unitsService.create(req.user.familyId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: { name?: string; parentId?: number; conversionFactor?: number; notes?: string }) {
    return this.unitsService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.unitsService.delete(parseInt(id), req.user.familyId);
  }

  @Get('convert')
  convert(@Request() req: any, @Query('from') from: string, @Query('to') to: string, @Query('value') value: string) {
    return this.unitsService.convert(req.user.familyId, from, to, parseFloat(value));
  }
}
