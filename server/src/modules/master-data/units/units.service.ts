import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { mdUnits } from '../../../db/schema';

@Injectable()
export class UnitsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number) {
    return this.db.select().from(mdUnits)
      .where(eq(mdUnits.familyId, familyId))
      .all();
  }

  async create(familyId: number, data: { name: string; parentId?: number; conversionFactor?: number; notes?: string }) {
    return this.db.insert(mdUnits).values({
      familyId,
      name: data.name,
      parentId: data.parentId,
      conversionFactor: data.conversionFactor || 1,
      notes: data.notes,
    }).returning().get();
  }

  async update(unitId: number, familyId: number, data: { name?: string; parentId?: number; conversionFactor?: number; notes?: string }) {
    const unit = await this.db.select().from(mdUnits)
      .where(and(eq(mdUnits.id, unitId), eq(mdUnits.familyId, familyId)))
      .get();
    if (!unit) throw new NotFoundException('单位不存在');

    const updates: Record<string, any> = {};
    if (data.name) updates.name = data.name;
    if (data.parentId !== undefined) updates.parentId = data.parentId;
    if (data.conversionFactor !== undefined) updates.conversionFactor = data.conversionFactor;
    if (data.notes !== undefined) updates.notes = data.notes;

    await this.db.update(mdUnits).set(updates).where(eq(mdUnits.id, unitId)).run();
    return this.db.select().from(mdUnits).where(eq(mdUnits.id, unitId)).get();
  }

  async delete(unitId: number, familyId: number) {
    await this.db.delete(mdUnits)
      .where(and(eq(mdUnits.id, unitId), eq(mdUnits.familyId, familyId)))
      .run();
    return { success: true };
  }

  async convert(familyId: number, fromUnit: string, toUnit: string, value: number) {
    const from = await this.db.select().from(mdUnits)
      .where(and(eq(mdUnits.familyId, familyId), eq(mdUnits.name, fromUnit)))
      .get();
    const to = await this.db.select().from(mdUnits)
      .where(and(eq(mdUnits.familyId, familyId), eq(mdUnits.name, toUnit)))
      .get();

    if (!from || !to) throw new NotFoundException('单位不存在');

    // 转换逻辑：先转为基准单位，再转为目标单位
    const baseValue = value * from.conversionFactor;
    const result = baseValue / to.conversionFactor;

    return { from: fromUnit, to: toUnit, value, result };
  }
}
