import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql } from 'drizzle-orm';
import { invItems, sysNfcTagState } from '../../db/schema';

/**
 * ScannerService - 统一的扫描/识别服务
 * 支持：barcode、QR码、NFC、RFID 等多种识别方式
 */
@Injectable()
export class ScannerService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  // ═══════════════════════════════════════════
  // Barcode / QR 码查询
  // ═══════════════════════════════════════════

  /**
   * 本地库存条码查询
   */
  async lookupLocal(familyId: number, barcode: string) {
    return this.db.select().from(invItems)
      .where(and(eq(invItems.familyId, familyId), eq(invItems.barcode, barcode)))
      .get();
  }

  /**
   * 外部条码库查询（极数本源 API + Open Food Facts 备用）
   */
  async lookupExternal(barcode: string) {
    const encodedBarcode = encodeURIComponent(barcode);
    // 1. 尝试极数本源 API (apizero.cn)
    try {
      const response = await fetch(`https://api.apizero.cn/barcode/${encodedBarcode}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json() as any;
        return {
          found: true,
          source: 'apizero',
          barcode,
          name: data.name || data.title || '',
          brand: data.brand || data.manufacturer || '',
          category: data.category || '',
          image: data.image || '',
          description: data.description || '',
        };
      }
    } catch {
      // 继续尝试备用 API
    }

    // 2. 备用查询（Open Food Facts）
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodedBarcode}.json`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { found: false, barcode };
      }

      const data = await response.json() as any;
      if (!data.product) {
        return { found: false, barcode };
      }

      return {
        found: true,
        source: 'openfoodfacts',
        barcode,
        name: data.product.product_name || data.product.product_name_zh || '',
        brand: data.product.mdBrands || '',
        category: data.product.mdCategories || '',
        image: data.product.image_url || '',
        description: data.product.generic_name || '',
      };
    } catch {
      return { found: false, barcode };
    }
  }

  /**
   * 综合条码查询 - 先查本地，再查外部
   */
  async lookup(familyId: number, barcode: string) {
    // 1. 先查本地库存
    const local = await this.lookupLocal(familyId, barcode);
    if (local) {
      return { found: true, source: 'local', item: local, barcode };
    }

    // 2. 查外部 API
    return this.lookupExternal(barcode);
  }

  // ═══════════════════════════════════════════
  // NFC 标签管理
  // ═══════════════════════════════════════════

  /**
   * 获取 NFC 标签状态
   */
  async getNfcTagState(tagUid: string, familyId: number) {
    return this.db.select().from(sysNfcTagState)
      .where(and(eq(sysNfcTagState.tagUid, tagUid), eq(sysNfcTagState.familyId, familyId)))
      .get();
  }

  /**
   * 更新 NFC 标签状态
   */
  async updateNfcTagState(tagUid: string, familyId: number, ndefWritten: boolean) {
    const existing = await this.getNfcTagState(tagUid, familyId);

    if (existing) {
      await this.db.update(sysNfcTagState)
        .set({
          ndefWritten,
          ndefWrittenAt: ndefWritten ? new Date() : existing.ndefWrittenAt,
          lastReadAt: new Date(),
          readCount: sql`${sysNfcTagState.readCount} + 1`,
        })
        .where(eq(sysNfcTagState.id, existing.id))
        .run();
    } else {
      await this.db.insert(sysNfcTagState).values({
        familyId,
        tagUid,
        ndefWritten,
        ndefWrittenAt: ndefWritten ? new Date() : null,
        lastReadAt: new Date(),
      });
    }

    return this.getNfcTagState(tagUid, familyId);
  }

  // ═══════════════════════════════════════════
  // RFID 读取（预留接口）
  // ═══════════════════════════════════════════

  /**
   * RFID 标签读取 - 预留接口
   */
  async readRfidTag(tagId: string) {
    // TODO: 实现 RFID 读取逻辑
    return { tagId, type: 'rfid', supported: false, message: 'RFID 读取功能开发中' };
  }
}
