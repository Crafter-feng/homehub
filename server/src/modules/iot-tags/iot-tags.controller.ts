import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IotTagsService } from './iot-tags.service';
import { CreateReaderDto, UpdateReaderDto, CreateZoneDto, UpdateZoneDto } from './dto/iot-tag.dto';

@Controller('rfid-readers')
@UseGuards(JwtAuthGuard)
export class RfidReadersController {
  constructor(private readonly iotTagsService: IotTagsService) {}

  @Get()
  listReaders(@Request() req: any) {
    return this.iotTagsService.listReaders(req.user.familyId);
  }

  @Get(':id')
  getReader(@Param('id') id: string) {
    return this.iotTagsService.getReaderById(parseInt(id));
  }

  @Post()
  createReader(@Request() req: any, @Body() dto: CreateReaderDto) {
    return this.iotTagsService.createReader(req.user.familyId, dto);
  }

  @Put(':id')
  updateReader(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateReaderDto) {
    return this.iotTagsService.updateReader(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  deleteReader(@Param('id') id: string, @Request() req: any) {
    return this.iotTagsService.deleteReader(parseInt(id), req.user.familyId);
  }

  @Post(':id/heartbeat')
  heartbeat(@Param('id') id: string, @Request() req: any) {
    return this.iotTagsService.heartbeat(parseInt(id), req.user.familyId);
  }
}

@Controller('rfid-zones')
@UseGuards(JwtAuthGuard)
export class RfidZonesController {
  constructor(private readonly iotTagsService: IotTagsService) {}

  @Get()
  listZones(@Request() req: any, @Query('readerId') readerId?: string) {
    return this.iotTagsService.listZones(req.user.familyId, readerId ? parseInt(readerId) : undefined);
  }

  @Get(':id')
  getZone(@Param('id') id: string) {
    return this.iotTagsService.getZoneById(parseInt(id));
  }

  @Post()
  createZone(@Request() req: any, @Body() dto: CreateZoneDto) {
    return this.iotTagsService.createZone(req.user.familyId, dto);
  }

  @Put(':id')
  updateZone(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateZoneDto) {
    return this.iotTagsService.updateZone(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  deleteZone(@Param('id') id: string, @Request() req: any) {
    return this.iotTagsService.deleteZone(parseInt(id), req.user.familyId);
  }
}
