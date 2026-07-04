import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { sysCustomFields, sysCustomValues } from '../../db/schema';
import { CreateFieldDefDto, UpdateFieldDefDto, SetFieldValueDto } from './dto/custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  // === 字段定义管理 ===

  async listFieldDefs(familyId: number, entityType: string) {
    return this.db.select().from(sysCustomFields)
      .where(and(
        eq(sysCustomFields.familyId, familyId),
        eq(sysCustomFields.entityType, entityType),
      ))
      .orderBy(sysCustomFields.sortOrder)
      .all();
  }

  async createFieldDef(familyId: number, dto: CreateFieldDefDto) {
    // Check for duplicate field name
    const existing = await this.db.select().from(sysCustomFields)
      .where(and(
        eq(sysCustomFields.familyId, familyId),
        eq(sysCustomFields.entityType, dto.entityType),
        eq(sysCustomFields.fieldName, dto.fieldName),
      ))
      .get();

    if (existing) {
      throw new BadRequestException(`字段 "${dto.fieldName}" 已存在`);
    }

    return this.db.insert(sysCustomFields).values({
      familyId,
      entityType: dto.entityType,
      fieldName: dto.fieldName,
      fieldLabel: dto.fieldLabel,
      fieldType: dto.fieldType,
      fieldConfig: dto.fieldConfig || null,
      isRequired: dto.isRequired || false,
      sortOrder: dto.sortOrder || 0,
    }).returning().get();
  }

  async updateFieldDef(fieldId: number, familyId: number, dto: UpdateFieldDefDto) {
    const field = await this.db.select().from(sysCustomFields)
      .where(and(
        eq(sysCustomFields.id, fieldId),
        eq(sysCustomFields.familyId, familyId),
      ))
      .get();

    if (!field) throw new NotFoundException('字段不存在');

    const updates: Record<string, any> = {};
    if (dto.fieldLabel !== undefined) updates.fieldLabel = dto.fieldLabel;
    if (dto.fieldConfig !== undefined) updates.fieldConfig = dto.fieldConfig;
    if (dto.isRequired !== undefined) updates.isRequired = dto.isRequired;
    if (dto.sortOrder !== undefined) updates.sortOrder = dto.sortOrder;

    await this.db.update(sysCustomFields)
      .set(updates)
      .where(eq(sysCustomFields.id, fieldId))
      .run();

    return this.db.select().from(sysCustomFields)
      .where(eq(sysCustomFields.id, fieldId))
      .get();
  }

  async deleteFieldDef(fieldId: number, familyId: number) {
    const field = await this.db.select().from(sysCustomFields)
      .where(and(
        eq(sysCustomFields.id, fieldId),
        eq(sysCustomFields.familyId, familyId),
      ))
      .get();

    if (!field) throw new NotFoundException('字段不存在');

    // Delete all values for this field
    await this.db.delete(sysCustomValues)
      .where(eq(sysCustomValues.fieldId, fieldId))
      .run();

    await this.db.delete(sysCustomFields)
      .where(eq(sysCustomFields.id, fieldId))
      .run();

    return { success: true };
  }

  // === 字段值管理 ===

  async getValues(familyId: number, entityType: string, entityId: number) {
    const fields = await this.db.select().from(sysCustomFields)
      .where(and(
        eq(sysCustomFields.familyId, familyId),
        eq(sysCustomFields.entityType, entityType),
      ))
      .all();

    const values = await this.db.select().from(sysCustomValues)
      .where(and(
        eq(sysCustomValues.entityType, entityType),
        eq(sysCustomValues.entityId, entityId),
      ))
      .all();

    // Merge field definitions with values
    return fields.map((field: any) => {
      const valueRecord = values.find((v: any) => v.fieldId === field.id);
      return {
        fieldId: field.id,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        fieldConfig: field.fieldConfig,
        isRequired: field.isRequired,
        value: valueRecord?.value || field.fieldConfig?.defaultValue || null,
      };
    });
  }

  async setValues(familyId: number, entityType: string, entityId: number, values: SetFieldValueDto[]) {
    const fields = await this.db.select().from(sysCustomFields)
      .where(and(
        eq(sysCustomFields.familyId, familyId),
        eq(sysCustomFields.entityType, entityType),
      ))
      .all();

    const fieldMap = new Map(fields.map((f: any) => [f.fieldName, f]));

    for (const item of values) {
      const field = fieldMap.get(item.fieldName) as any;
      if (!field) {
        throw new BadRequestException(`字段 "${item.fieldName}" 不存在`);
      }

      // Validate value
      this.validateFieldValue(field, item.value);

      // Check if value already exists
      const existing = await this.db.select().from(sysCustomValues)
        .where(and(
          eq(sysCustomValues.entityType, entityType),
          eq(sysCustomValues.entityId, entityId),
          eq(sysCustomValues.fieldId, field.id),
        ))
        .get() as any;

      if (existing) {
        await this.db.update(sysCustomValues)
          .set({ value: String(item.value), updatedAt: new Date() })
          .where(eq(sysCustomValues.id, existing.id))
          .run();
      } else {
        await this.db.insert(sysCustomValues).values({
          entityType,
          entityId,
          fieldId: field.id,
          value: String(item.value),
        }).run();
      }
    }

    return { success: true };
  }

  async getValue(familyId: number, entityType: string, entityId: number, fieldName: string) {
    const field = await this.db.select().from(sysCustomFields)
      .where(and(
        eq(sysCustomFields.familyId, familyId),
        eq(sysCustomFields.entityType, entityType),
        eq(sysCustomFields.fieldName, fieldName),
      ))
      .get();

    if (!field) throw new NotFoundException(`字段 "${fieldName}" 不存在`);

    const value = await this.db.select().from(sysCustomValues)
      .where(and(
        eq(sysCustomValues.entityType, entityType),
        eq(sysCustomValues.entityId, entityId),
        eq(sysCustomValues.fieldId, field.id),
      ))
      .get();

    return value?.value || field.fieldConfig?.defaultValue || null;
  }

  async setValue(familyId: number, entityType: string, entityId: number, fieldName: string, value: any) {
    const field = await this.db.select().from(sysCustomFields)
      .where(and(
        eq(sysCustomFields.familyId, familyId),
        eq(sysCustomFields.entityType, entityType),
        eq(sysCustomFields.fieldName, fieldName),
      ))
      .get();

    if (!field) throw new NotFoundException(`字段 "${fieldName}" 不存在`);

    this.validateFieldValue(field, value);

    const existing = await this.db.select().from(sysCustomValues)
      .where(and(
        eq(sysCustomValues.entityType, entityType),
        eq(sysCustomValues.entityId, entityId),
        eq(sysCustomValues.fieldId, field.id),
      ))
      .get();

    if (existing) {
      await this.db.update(sysCustomValues)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(sysCustomValues.id, existing.id))
        .run();
    } else {
      await this.db.insert(sysCustomValues).values({
        entityType,
        entityId,
        fieldId: field.id,
        value: String(value),
      }).run();
    }

    return { success: true };
  }

  // === 查询支持 ===

  async findByField(familyId: number, entityType: string, fieldName: string, value: any) {
    const field = await this.db.select().from(sysCustomFields)
      .where(and(
        eq(sysCustomFields.familyId, familyId),
        eq(sysCustomFields.entityType, entityType),
        eq(sysCustomFields.fieldName, fieldName),
      ))
      .get();

    if (!field) return [];

    const values = await this.db.select().from(sysCustomValues)
      .where(and(
        eq(sysCustomValues.entityType, entityType),
        eq(sysCustomValues.fieldId, field.id),
        eq(sysCustomValues.value, String(value)),
      ))
      .all();

    return values.map((v: any) => v.entityId);
  }

  // === 验证 ===

  private validateFieldValue(field: any, value: any) {
    if (value === null || value === undefined) {
      if (field.isRequired) {
        throw new BadRequestException(`字段 "${field.fieldLabel}" 为必填项`);
      }
      return;
    }

    switch (field.fieldType) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new BadRequestException(`字段 "${field.fieldLabel}" 必须为数字`);
        }
        if (field.fieldConfig?.min !== undefined && num < field.fieldConfig.min) {
          throw new BadRequestException(`字段 "${field.fieldLabel}" 不能小于 ${field.fieldConfig.min}`);
        }
        if (field.fieldConfig?.max !== undefined && num > field.fieldConfig.max) {
          throw new BadRequestException(`字段 "${field.fieldLabel}" 不能大于 ${field.fieldConfig.max}`);
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(String(value))) {
          throw new BadRequestException(`字段 "${field.fieldLabel}" 必须为布尔值`);
        }
        break;

      case 'date':
        if (isNaN(Date.parse(String(value)))) {
          throw new BadRequestException(`字段 "${field.fieldLabel}" 必须为有效日期`);
        }
        break;

      case 'select':
        if (field.fieldConfig?.options) {
          const validValues = field.fieldConfig.options.map((o: any) => o.value);
          if (!validValues.includes(String(value))) {
            throw new BadRequestException(`字段 "${field.fieldLabel}" 的值不在选项范围内`);
          }
        }
        break;

      case 'multiselect':
        if (!Array.isArray(value)) {
          throw new BadRequestException(`字段 "${field.fieldLabel}" 必须为数组`);
        }
        if (field.fieldConfig?.options) {
          const validValues = field.fieldConfig.options.map((o: any) => o.value);
          for (const v of value) {
            if (!validValues.includes(String(v))) {
              throw new BadRequestException(`字段 "${field.fieldLabel}" 的值 "${v}" 不在选项范围内`);
            }
          }
        }
        break;
    }
  }
}
