import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StockService } from './stock.service';
import { CreateItemDto, UpdateItemDto, ConsumeItemDto, TransferItemDto, AdjustItemDto, StockInItemDto, CreateBatchDto, UpdateBatchDto } from './dto/stock.dto';
import { PaginationQuery } from '../../common';
import { Response } from 'express';

interface AuthedRequest {
  user: { id: number; email: string; familyId: number };
}

@Controller('stock')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('items')
  hhListItems(
    @Request() req: AuthedRequest,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('expiring') expiring?: string,
    @Query() pagination?: PaginationQuery,
  ) {
    return this.stockService.list(req.user.familyId, {
      category,
      location,
      expiring: expiring ? parseInt(expiring) : undefined,
    }, pagination);
  }

  @Get('items/search')
  searchItems(
    @Request() req: AuthedRequest,
    @Query('q') query: string,
    @Query() pagination?: PaginationQuery,
  ) {
    return this.stockService.search(req.user.familyId, query, pagination);
  }

  @Get('items/:id')
  getItem(@Param('id') id: string) {
    return this.stockService.getById(parseInt(id));
  }

  @Post('items')
  createItem(@Request() req: AuthedRequest, @Body() dto: CreateItemDto) {
    return this.stockService.create(req.user.familyId, dto, req.user.id);
  }

  @Put('items/:id')
  updateItem(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: UpdateItemDto) {
    return this.stockService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.delete(parseInt(id), req.user.familyId);
  }

  @Post('items/:id/consume')
  consumeItem(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: ConsumeItemDto) {
    return this.stockService.consume(parseInt(id), req.user.familyId, req.user.id, dto);
  }

  @Post('items/:id/stock-in')
  stockInItem(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: StockInItemDto) {
    return this.stockService.stockIn(parseInt(id), req.user.familyId, req.user.id, dto);
  }

  @Post('items/:id/transfer')
  transferItem(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: TransferItemDto) {
    return this.stockService.transfer(parseInt(id), req.user.familyId, req.user.id, dto);
  }

  @Post('items/:id/adjust')
  adjustItem(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: AdjustItemDto) {
    return this.stockService.adjust(parseInt(id), req.user.familyId, req.user.id, dto);
  }

  @Get('items/:id/history')
  getItemHistory(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.getHistory(parseInt(id), req.user.familyId);
  }

  @Get('items/:id/price-history')
  getPriceHistory(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.getPriceHistory(parseInt(id), req.user.familyId);
  }

  @Get('expiring')
  getExpiring(@Request() req: AuthedRequest, @Query('days') days?: string) {
    return this.stockService.getExpiring(req.user.familyId, days ? parseInt(days) : 7);
  }

  @Get('summary')
  getSummary(@Request() req: AuthedRequest) {
    return this.stockService.getSummary(req.user.familyId);
  }

  @Post('items/:id/batches')
  createBatch(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: CreateBatchDto) {
    return this.stockService.createBatch(parseInt(id), req.user.familyId, dto);
  }

  @Get('items/:id/batches')
  listBatches(@Param('id') id: string) {
    return this.stockService.listBatches(parseInt(id));
  }

  @Get('items/:id/batches/summary')
  getBatchSummary(@Param('id') id: string) {
    return this.stockService.getBatchSummary(parseInt(id));
  }

  @Put('items/batches/:batchId')
  updateBatch(
    @Param('batchId') batchId: string,
    @Request() req: AuthedRequest,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.stockService.editBatch(parseInt(batchId), req.user.familyId, dto);
  }

  @Delete('items/batches/:batchId')
  deleteBatch(
    @Param('batchId') batchId: string,
    @Request() req: AuthedRequest,
  ) {
    return this.stockService.deleteBatch(parseInt(batchId), req.user.familyId);
  }

  @Post('items/:id/batches/compact')
  compactBatches(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.compactBatches(parseInt(id), req.user.familyId);
  }

  @Get('export')
  async exportCsv(@Request() req: AuthedRequest, @Res() res: Response) {
    // list now returns PaginationResponse, extract data array for CSV export
    const result = await this.stockService.list(req.user.familyId);
    const itemsList = result.data;
    const csv = [
      'name,type,quantity,unit,locationId,expiryDate,brand,notes',
      ...itemsList.map((i) => [
        `"${(i.name || '').replace(/"/g, '""')}"`,
        i.type || '',
        i.quantity,
        i.unit || '',
        i.locationId || '',
        i.expiryDate ? new Date(i.expiryDate).toISOString().split('T')[0] : '',
        `"${(i.brand || '').replace(/"/g, '""')}"`,
        `"${(i.notes || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=homehub-stock.csv');
    res.send('\ufeff' + csv);
  }

  @Post('import')
  async importCsv(@Request() req: AuthedRequest, @Body() body: { invItems: Array<Partial<CreateItemDto>> }) {
    const results = [];
    for (const item of (body.invItems || [])) {
      try {
        const created = await this.stockService.create(req.user.familyId, item as CreateItemDto, req.user.id);
        results.push({ success: true, item: created });
      } catch (e: unknown) {
        const err = e as { message?: string };
        results.push({ success: false, error: err.message || 'Unknown error', item });
      }
    }
    return {
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
}
