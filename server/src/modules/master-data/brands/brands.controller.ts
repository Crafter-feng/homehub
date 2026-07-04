import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { BrandsService } from './brands.service';

@Controller('brands')
@UseGuards(JwtAuthGuard)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  list(@Request() req: any) {
    return this.brandsService.list(req.user.familyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: { name: string; notes?: string }) {
    return this.brandsService.create(req.user.familyId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: { name?: string; notes?: string }) {
    return this.brandsService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.brandsService.delete(parseInt(id), req.user.familyId);
  }
}
