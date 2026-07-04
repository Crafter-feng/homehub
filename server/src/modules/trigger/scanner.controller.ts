import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { ScanEventDto } from './dto/trigger.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * ScannerController - 扫描事件处理
 * 处理扫描后的触发器解析和动作执行
 * 
 * 注意：条码/NFC/RFID 的识别和查询功能已移至 ScannerModule
 */
@Controller('scanner')
@UseGuards(JwtAuthGuard)
export class ScannerController {
  constructor(private readonly triggerService: TriggerService) {}

  /**
   * 处理扫描事件 - 解析触发器并执行动作
   */
  @Post('scan')
  handleScan(@Request() req: any, @Body() dto: ScanEventDto) {
    return this.triggerService.handleScan(req.user.familyId, req.user.id, dto);
  }
}
