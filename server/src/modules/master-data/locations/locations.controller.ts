import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  list(@Request() req: any) {
    return this.locationsService.list(req.user.familyId);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Request() req: any) {
    return this.locationsService.getById(parseInt(id), req.user.familyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateLocationDto) {
    return this.locationsService.create(req.user.familyId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.locationsService.delete(parseInt(id), req.user.familyId);
  }
}
