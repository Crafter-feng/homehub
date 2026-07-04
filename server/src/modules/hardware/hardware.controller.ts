import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HardwareService } from './hardware.service';
import { RegisterDeviceDto, PrintJobDto, NfcWriteDto } from './dto/hardware.dto';

@Controller('hardware')
@UseGuards(JwtAuthGuard)
export class HardwareController {
  constructor(private readonly hardwareService: HardwareService) {}

  @Get('devices')
  listDevices(@Request() req: any) {
    return this.hardwareService.listDevices(req.user.familyId);
  }

  @Post('devices')
  registerDevice(@Request() req: any, @Body() dto: RegisterDeviceDto) {
    return this.hardwareService.registerDevice(req.user.familyId, dto);
  }

  @Get('devices/:id')
  getDevice(@Param('id') id: string, @Request() req: any) {
    return this.hardwareService.getDevice(parseInt(id), req.user.familyId);
  }

  @Put('devices/:id')
  updateDevice(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updates: Partial<RegisterDeviceDto>,
  ) {
    return this.hardwareService.updateDevice(parseInt(id), req.user.familyId, updates);
  }

  @Delete('devices/:id')
  deleteDevice(@Param('id') id: string, @Request() req: any) {
    return this.hardwareService.deleteDevice(parseInt(id), req.user.familyId);
  }

  @Post('print')
  submitPrintJob(@Request() req: any, @Body() dto: PrintJobDto) {
    return this.hardwareService.submitPrintJob(req.user.familyId, dto);
  }

  @Get('print/jobs')
  listPrintJobs(@Request() req: any) {
    return this.hardwareService.listPrintJobs(req.user.familyId);
  }

  @Post('nfc/write')
  prepareNfcWrite(@Body() dto: NfcWriteDto) {
    return this.hardwareService.prepareNfcWrite(dto);
  }
}