import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { rfidReaders, rfidZones } from '../../db/schema';
import { CreateReaderDto, UpdateReaderDto, CreateZoneDto, UpdateZoneDto } from './dto/iot-tag.dto';

@Injectable()
export class IotTagsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  // === Reader CRUD ===

  async listReaders(familyId: number) {
    return this.db.select().from(rfidReaders)
      .where(eq(rfidReaders.familyId, familyId))
      .all();
  }

  async getReaderById(id: number) {
    const reader = await this.db.select().from(rfidReaders)
      .where(eq(rfidReaders.id, id))
      .get();
    if (!reader) throw new NotFoundException(`RFID Reader #${id} 不存在`);
    return reader;
  }

  async createReader(familyId: number, dto: CreateReaderDto) {
    return this.db.insert(rfidReaders).values({
      familyId,
      name: dto.name,
      locationId: dto.locationId ?? null,
      readerType: (dto.readerType as 'hf' | 'uhf') ?? 'hf',
      deviceId: dto.deviceId,
      hardwareDeviceId: dto.hardwareDeviceId ?? null,
      config: dto.config ?? null,
    }).returning().get();
  }

  async updateReader(id: number, familyId: number, dto: UpdateReaderDto) {
    const reader = await this.db.select().from(rfidReaders)
      .where(and(eq(rfidReaders.id, id), eq(rfidReaders.familyId, familyId)))
      .get();
    if (!reader) throw new NotFoundException(`RFID Reader #${id} 不存在`);

    const updates: Record<string, any> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.locationId !== undefined) updates.locationId = dto.locationId;
    if (dto.readerType !== undefined) updates.readerType = dto.readerType;
    if (dto.config !== undefined) updates.config = dto.config;

    await this.db.update(rfidReaders).set(updates).where(eq(rfidReaders.id, id)).run();
    return this.getReaderById(id);
  }

  async deleteReader(id: number, familyId: number) {
    const reader = await this.db.select().from(rfidReaders)
      .where(and(eq(rfidReaders.id, id), eq(rfidReaders.familyId, familyId)))
      .get();
    if (!reader) throw new NotFoundException(`RFID Reader #${id} 不存在`);

    // 删除关联的 zones
    await this.db.delete(rfidZones).where(eq(rfidZones.readerId, id)).run();
    // 删除 reader
    await this.db.delete(rfidReaders).where(eq(rfidReaders.id, id)).run();
    return { success: true };
  }

  async heartbeat(id: number, familyId: number) {
    const reader = await this.db.select().from(rfidReaders)
      .where(and(eq(rfidReaders.id, id), eq(rfidReaders.familyId, familyId)))
      .get();
    if (!reader) throw new NotFoundException(`RFID Reader #${id} 不存在`);

    await this.db.update(rfidReaders)
      .set({ lastOnlineAt: new Date() })
      .where(eq(rfidReaders.id, id))
      .run();
    return this.getReaderById(id);
  }

  // === Zone CRUD ===
  // Zone 通过 readerId → reader.familyId 间接归属家庭，操作前先校验 reader 归属

  async listZones(familyId: number, readerId?: number) {
    // 先查出当前家庭的所有 reader IDs
    const readers = await this.db.select({ id: rfidReaders.id }).from(rfidReaders)
      .where(eq(rfidReaders.familyId, familyId))
      .all();
    const readerIds = readers.map((r: any) => r.id);

    if (readerIds.length === 0) return [];

    if (readerId) {
      // 如果指定了 readerId，校验它属于该家庭
      if (!readerIds.includes(readerId)) return [];
      return this.db.select().from(rfidZones)
        .where(eq(rfidZones.readerId, readerId))
        .all();
    }

    // 返回该家庭所有 readers 下的 zones
    const zones: any[] = [];
    for (const rid of readerIds) {
      const rZones = await this.db.select().from(rfidZones)
        .where(eq(rfidZones.readerId, rid))
        .all();
      zones.push(...rZones);
    }
    return zones;
  }

  async getZoneById(id: number) {
    const zone = await this.db.select().from(rfidZones)
      .where(eq(rfidZones.id, id))
      .get();
    if (!zone) throw new NotFoundException(`RFID Zone #${id} 不存在`);
    return zone;
  }

  async createZone(familyId: number, dto: CreateZoneDto) {
    // 校验 readerId 属于当前家庭
    const reader = await this.db.select().from(rfidReaders)
      .where(and(eq(rfidReaders.id, dto.readerId), eq(rfidReaders.familyId, familyId)))
      .get();
    if (!reader) throw new NotFoundException(`RFID Reader #${dto.readerId} 不存在或不属于当前家庭`);

    return this.db.insert(rfidZones).values({
      readerId: dto.readerId,
      tagPattern: dto.tagPattern ?? null,
      locationId: dto.locationId ?? null,
      notes: dto.notes ?? null,
    }).returning().get();
  }

  async updateZone(id: number, familyId: number, dto: UpdateZoneDto) {
    // 先查 zone，再通过 readerId 校验家庭归属
    const zone = await this.db.select().from(rfidZones)
      .where(eq(rfidZones.id, id))
      .get();
    if (!zone) throw new NotFoundException(`RFID Zone #${id} 不存在`);

    const reader = await this.db.select().from(rfidReaders)
      .where(and(eq(rfidReaders.id, zone.readerId), eq(rfidReaders.familyId, familyId)))
      .get();
    if (!reader) throw new NotFoundException(`RFID Zone #${id} 不属于当前家庭`);

    const updates: Record<string, any> = {};
    if (dto.tagPattern !== undefined) updates.tagPattern = dto.tagPattern;
    if (dto.locationId !== undefined) updates.locationId = dto.locationId;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    await this.db.update(rfidZones).set(updates).where(eq(rfidZones.id, id)).run();
    return this.getZoneById(id);
  }

  async deleteZone(id: number, familyId: number) {
    const zone = await this.db.select().from(rfidZones)
      .where(eq(rfidZones.id, id))
      .get();
    if (!zone) throw new NotFoundException(`RFID Zone #${id} 不存在`);

    const reader = await this.db.select().from(rfidReaders)
      .where(and(eq(rfidReaders.id, zone.readerId), eq(rfidReaders.familyId, familyId)))
      .get();
    if (!reader) throw new NotFoundException(`RFID Zone #${id} 不属于当前家庭`);

    await this.db.delete(rfidZones).where(eq(rfidZones.id, id)).run();
    return { success: true };
  }
}
