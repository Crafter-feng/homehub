import { Controller, Get, Post, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * ScannerController - 统一的扫描/识别 API
 * 支持：barcode、QR码、NFC、RFID 等多种识别方式
 */
@Controller('scanner')
@UseGuards(JwtAuthGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  // ═══════════════════════════════════════════
  // Barcode / QR 码查询
  // ═══════════════════════════════════════════

  /**
   * 条码综合查询 - 先查本地库存，再查外部API
   * GET /api/v1/scanner/lookup?code=xxx
   */
  @Get('lookup')
  lookup(@Request() req: any, @Query('code') code: string) {
    return this.scannerService.lookup(req.user.familyId, code);
  }

  /**
   * 外部条码库查询
   * GET /api/v1/scanner/lookup/external?code=xxx
   */
  @Get('lookup/external')
  lookupExternal(@Query('code') code: string) {
    return this.scannerService.lookupExternal(code);
  }

  /**
   * 本地库存条码查询
   * GET /api/v1/scanner/lookup/local?code=xxx
   */
  @Get('lookup/local')
  lookupLocal(@Request() req: any, @Query('code') code: string) {
    return this.scannerService.lookupLocal(req.user.familyId, code);
  }

  // ═══════════════════════════════════════════
  // NFC 标签管理
  // ═══════════════════════════════════════════

  /**
   * 获取 NFC 标签状态
   * GET /api/v1/scanner/nfc/tag/:tagUid
   */
  @Get('nfc/tag/:tagUid')
  getNfcTagState(@Param('tagUid') tagUid: string, @Request() req: any) {
    return this.scannerService.getNfcTagState(tagUid, req.user.familyId);
  }

  /**
   * 更新 NFC 标签状态
   * POST /api/v1/scanner/nfc/tag/:tagUid
   */
  @Post('nfc/tag/:tagUid')
  updateNfcTagState(
    @Param('tagUid') tagUid: string,
    @Request() req: any,
    @Body() body: { ndefWritten: boolean },
  ) {
    return this.scannerService.updateNfcTagState(tagUid, req.user.familyId, body.ndefWritten);
  }

  // ═══════════════════════════════════════════
  // RFID 读取（预留）
  // ═══════════════════════════════════════════

  /**
   * RFID 标签读取
   * POST /api/v1/scanner/rfid/read
   */
  @Post('rfid/read')
  readRfidTag(@Body() body: { tagId: string }) {
    return this.scannerService.readRfidTag(body.tagId);
  }
}
