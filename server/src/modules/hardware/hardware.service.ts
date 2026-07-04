import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { RegisterDeviceDto, PrintJobDto, NfcWriteDto } from './dto/hardware.dto';

/**
 * HardwareService — Hardware Abstraction Layer (HAL)
 *
 * Manages hardware device registration and output job dispatching.
 * For MVP, this provides:
 * - Device registration (printers, NFC writers)
 * - Print job queue (thermal/label/PDF)
 * - NFC write instructions
 * - PDF export
 *
 * Actual hardware drivers (USB, Bluetooth) are stubs — the service records
 * jobs and provides connection details for the client to execute.
 */
@Injectable()
export class HardwareService {
  // In-memory device registry (MVP; Phase 2: persist to DB)
  private devices: Map<number, any> = new Map();
  private nextDeviceId = 1;
  private printJobs: any[] = [];

  constructor() {}

  /**
   * Register a new hardware device.
   */
  async registerDevice(familyId: number, dto: RegisterDeviceDto) {
    const device = {
      id: this.nextDeviceId++,
      familyId,
      name: dto.name,
      deviceType: dto.deviceType,
      connectionType: dto.connectionType || 'virtual',
      connectionConfig: dto.connectionConfig || '{}',
      config: dto.config || {},
      isOnline: false,
      lastOnlineAt: null,
      createdAt: new Date(),
    };

    this.devices.set(device.id, device);
    return device;
  }

  /**
   * List registered devices for a family.
   */
  async listDevices(familyId: number) {
    const result: any[] = [];
    this.devices.forEach((d) => {
      if (d.familyId === familyId) result.push(d);
    });
    return result;
  }

  /**
   * Get device by ID.
   */
  async getDevice(id: number, familyId: number) {
    const device = this.devices.get(id);
    if (!device || device.familyId !== familyId) {
      throw new NotFoundException(`设备 #${id} 不存在`);
    }
    return device;
  }

  /**
   * Update device configuration.
   */
  async updateDevice(id: number, familyId: number, updates: Partial<RegisterDeviceDto>) {
    const device = await this.getDevice(id, familyId);
    if (updates.name) device.name = updates.name;
    if (updates.config) device.config = { ...device.config, ...updates.config };
    this.devices.set(id, device);
    return device;
  }

  /**
   * Remove a device.
   */
  async deleteDevice(id: number, familyId: number) {
    await this.getDevice(id, familyId);
    this.devices.delete(id);
    return { success: true };
  }

  /**
   * Submit a print job.
   */
  async submitPrintJob(familyId: number, dto: PrintJobDto) {
    const job = {
      id: this.printJobs.length + 1,
      familyId,
      content: dto.content,
      outputType: dto.outputType,
      copies: dto.copies || 1,
      options: dto.options || {},
      status: 'queued',
      createdAt: new Date(),
    };

    this.printJobs.push(job);

    // For PDF output, provide inline rendering data
    if (dto.outputType === 'pdf') {
      return {
        ...job,
        downloadUrl: null, // Client renders SVG/HTML to PDF
        instructions: '使用浏览器打印功能或 html2pdf 库将内容导出为 PDF',
      };
    }

    // For thermal/label, provide connection info for a registered printer
    const printers = await this.listDevices(familyId);
    const printer = printers.find((d) =>
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
    return this.printJobs.filter((j) => j.familyId === familyId);
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
      case 'ndef_smartposter':
        ndefPayload = {
          type: 'NDEF Smart Poster Record',
          uri: dto.payload,
          title: 'HomeHub Tag',
          instructions: '使用 NFC Tools 或 Web NFC API 写入 NTAG213 或更大容量标签',
        };
        break;
      case 'ndef_text':
      default:
        ndefPayload = {
          type: 'NDEF Text Record',
          text: dto.payload,
          language: 'zh-CN',
          encoding: 'UTF-8',
          instructions: '使用 Web NFC API (nfcWriter.push) 写入',
        };
        break;
    }

    return {
      format: dto.format || 'ndef_text',
      payload: ndefPayload,
      writeMethod: 'web_nfc_api',
    };
  }
}