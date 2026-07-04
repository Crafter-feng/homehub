import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, desc } from 'drizzle-orm';
import { sysHardwareDevices, sysPrintJobs } from '../../db/schema';
import { RegisterDeviceDto, PrintJobDto, NfcWriteDto } from './dto/hardware.dto';

/**
 * HardwareService — Hardware Abstraction Layer (HAL)
 *
 * Manages hardware device registration and output job dispatching.
 * Uses database persistence for devices and print jobs.
 */
@Injectable()
export class HardwareService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  /**
   * Register a new hardware device.
   */
  async registerDevice(familyId: number, dto: RegisterDeviceDto) {
    return this.db.insert(sysHardwareDevices).values({
      familyId,
      name: dto.name,
      deviceType: dto.deviceType,
      connectionType: dto.connectionType || 'virtual',
      connectionConfig: dto.connectionConfig || '{}',
      config: dto.config || {},
      isOnline: false,
    }).returning().get();
  }

  /**
   * List registered devices for a family.
   */
  async listDevices(familyId: number) {
    return this.db.select().from(sysHardwareDevices)
      .where(eq(sysHardwareDevices.familyId, familyId))
      .all();
  }

  /**
   * Get device by ID.
   */
  async getDevice(id: number, familyId: number) {
    const device = await this.db.select().from(sysHardwareDevices)
      .where(and(eq(sysHardwareDevices.id, id), eq(sysHardwareDevices.familyId, familyId)))
      .get();
    if (!device) throw new NotFoundException(`设备 #${id} 不存在`);
    return device;
  }

  /**
   * Update device configuration.
   */
  async updateDevice(id: number, familyId: number, updates: Partial<RegisterDeviceDto>) {
    await this.getDevice(id, familyId);

    const updateData: Record<string, any> = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.config) updateData.config = updates.config;

    if (Object.keys(updateData).length > 0) {
      await this.db.update(sysHardwareDevices)
        .set(updateData)
        .where(eq(sysHardwareDevices.id, id))
        .run();
    }

    return this.getDevice(id, familyId);
  }

  /**
   * Remove a device.
   */
  async deleteDevice(id: number, familyId: number) {
    await this.getDevice(id, familyId);
    await this.db.delete(sysHardwareDevices)
      .where(eq(sysHardwareDevices.id, id))
      .run();
    return { success: true };
  }

  /**
   * Submit a print job.
   */
  async submitPrintJob(familyId: number, dto: PrintJobDto) {
    const job = await this.db.insert(sysPrintJobs).values({
      familyId,
      content: dto.content,
      outputType: dto.outputType,
      copies: dto.copies || 1,
      options: dto.options || {},
      status: 'queued',
    }).returning().get();

    // For PDF output, provide inline rendering data
    if (dto.outputType === 'pdf') {
      return {
        ...job,
        downloadUrl: null,
        instructions: '使用浏览器打印功能或 html2pdf 库将内容导出为 PDF',
      };
    }

    // For thermal/label, provide connection info for a registered printer
    const printers = await this.listDevices(familyId);
    const printer = printers.find((d: any) =>
      d.deviceType === 'printer_thermal' || d.deviceType === 'printer_label'
    );

    return {
      ...job,
      targetPrinter: printer || null,
      instructions: printer
        ? `通过 ${printer.connectionType} 连接 ${printer.name} 进行打印`
        : '请先在硬件管理中添加打印机',
    };
  }

  /**
   * List print jobs.
   */
  async listPrintJobs(familyId: number) {
    return this.db.select().from(sysPrintJobs)
      .where(eq(sysPrintJobs.familyId, familyId))
      .orderBy(desc(sysPrintJobs.createdAt))
      .all();
  }

  /**
   * Prepare NFC write payload.
   */
  async prepareNfcWrite(dto: NfcWriteDto) {
    let ndefPayload: Record<string, any>;

    switch (dto.format || 'ndef_text') {
      case 'ndef_uri':
        ndefPayload = {
          type: 'NDEF URI Record',
          uri: dto.payload,
          tnf: 'Well Known',
          instructions: '使用 Web NFC API (nfcWriter.push) 写入',
        };
        break;
      case 'ndef_text':
      default:
        ndefPayload = {
          type: 'NDEF Text Record',
          text: dto.payload,
          language: 'zh',
          tnf: 'Well Known',
          instructions: '使用 Web NFC API (nfcWriter.push) 写入',
        };
        break;
    }

    return {
      format: dto.format || 'ndef_text',
      payload: ndefPayload,
      instructions: '确保设备支持 NFC 且浏览器已启用 Web NFC API',
    };
  }
}
