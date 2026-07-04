import { Module } from '@nestjs/common';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';

/**
 * Scanner 模块 - 统一的扫描/识别功能
 * 支持：barcode、QR码、NFC、RFID 等多种识别方式
 */
@Module({
  controllers: [ScannerController],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
