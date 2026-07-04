import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CustomFieldsService } from './custom-fields.service';
import { CreateFieldDefDto, UpdateFieldDefDto, BatchSetValuesDto } from './dto/custom-field.dto';

@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  // === 字段定义管理 ===

  @Get(':entityType')
  listFieldDefs(
    @Request() req: any,
    @Param('entityType') entityType: string,
  ) {
    return this.customFieldsService.listFieldDefs(req.user.familyId, entityType);
  }

  @Post(':entityType')
  createFieldDef(
    @Request() req: any,
    @Param('entityType') entityType: string,
    @Body() dto: CreateFieldDefDto,
  ) {
    return this.customFieldsService.createFieldDef(req.user.familyId, {
      ...dto,
      entityType,
    });
  }

  @Put('field/:fieldId')
  updateFieldDef(
    @Param('fieldId') fieldId: string,
    @Request() req: any,
    @Body() dto: UpdateFieldDefDto,
  ) {
    return this.customFieldsService.updateFieldDef(parseInt(fieldId), req.user.familyId, dto);
  }

  @Delete('field/:fieldId')
  deleteFieldDef(
    @Param('fieldId') fieldId: string,
    @Request() req: any,
  ) {
    return this.customFieldsService.deleteFieldDef(parseInt(fieldId), req.user.familyId);
  }

  // === 字段值管理 ===

  @Get(':entityType/:entityId/values')
  getValues(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.customFieldsService.getValues(entityType, parseInt(entityId));
  }

  @Put(':entityType/:entityId/values')
  setValues(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() dto: BatchSetValuesDto,
  ) {
    return this.customFieldsService.setValues(entityType, parseInt(entityId), dto.values);
  }

  @Get(':entityType/:entityId/values/:fieldName')
  getValue(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('fieldName') fieldName: string,
  ) {
    return this.customFieldsService.getValue(entityType, parseInt(entityId), fieldName);
  }

  @Put(':entityType/:entityId/values/:fieldName')
  setValue(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('fieldName') fieldName: string,
    @Body('value') value: any,
  ) {
    return this.customFieldsService.setValue(entityType, parseInt(entityId), fieldName, value);
  }

  // === 查询 ===

  @Get(':entityType/search')
  findByField(
    @Request() req: any,
    @Param('entityType') entityType: string,
    @Query('fieldName') fieldName: string,
    @Query('value') value: string,
  ) {
    return this.customFieldsService.findByField(req.user.familyId, entityType, fieldName, value);
  }
}
