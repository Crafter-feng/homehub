import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StockService } from './stock.service';
import { CreateProductDto, UpdateProductDto, StockInDto, ConsumeDto, TransferDto, AdjustDto, UpdateBatchDto } from './dto/stock.dto';
import { PaginationQuery } from '../../common';
import { Response } from 'express';
import * as QRCode from 'qrcode';

interface AuthedRequest {
  user: { id: number; email: string; familyId: number };
}

@Controller('stock')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // ── 产品 CRUD ──

  @Get('products')
  listProducts(
    @Request() req: AuthedRequest,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('expiring') expiring?: string,
    @Query() pagination?: PaginationQuery,
  ) {
    return this.stockService.listProducts(req.user.familyId, {
      category,
      location,
      expiring: expiring ? parseInt(expiring) : undefined,
    }, pagination);
  }

  @Get('products/search')
  searchProducts(
    @Request() req: AuthedRequest,
    @Query('q') query: string,
    @Query() pagination?: PaginationQuery,
  ) {
    return this.stockService.searchProducts(req.user.familyId, query, pagination);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.getProductById(parseInt(id), req.user.familyId);
  }

  @Post('products')
  createProduct(@Request() req: AuthedRequest, @Body() dto: CreateProductDto) {
    return this.stockService.createProduct(req.user.familyId, dto);
  }

  @Put('products/:id')
  updateProduct(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: UpdateProductDto) {
    return this.stockService.updateProduct(parseInt(id), req.user.familyId, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.deleteProduct(parseInt(id), req.user.familyId);
  }

  @Post('products/:id/merge/:removeId')
  mergeProducts(@Param('id') id: string, @Param('removeId') removeId: string, @Request() req: AuthedRequest) {
    return this.stockService.mergeProducts(parseInt(id), parseInt(removeId), req.user.familyId);
  }

  // ── 库存操作 ──

  @Post('products/:id/stock-in')
  stockIn(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: StockInDto) {
    return this.stockService.stockIn(parseInt(id), req.user.familyId, req.user.id, dto);
  }

  @Post('products/:id/consume')
  consume(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: ConsumeDto) {
    return this.stockService.consume(parseInt(id), req.user.familyId, req.user.id, dto);
  }

  @Post('products/:id/transfer')
  transfer(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: TransferDto) {
    return this.stockService.transfer(parseInt(id), req.user.familyId, req.user.id, dto);
  }

  @Post('products/:id/adjust')
  adjust(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: AdjustDto) {
    return this.stockService.adjust(parseInt(id), req.user.familyId, req.user.id, dto);
  }

  @Post('products/:id/open')
  openProduct(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.openProduct(parseInt(id), req.user.familyId, req.user.id);
  }

  // ── 批次管理 ──

  @Get('products/:id/batches')
  listBatches(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.listBatches(parseInt(id), req.user.familyId);
  }

  @Get('products/:id/batches/summary')
  getBatchSummary(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.getBatchSummary(parseInt(id), req.user.familyId);
  }

  @Put('products/batches/:batchId')
  updateBatch(@Param('batchId') batchId: string, @Request() req: AuthedRequest, @Body() dto: UpdateBatchDto) {
    return this.stockService.updateBatch(parseInt(batchId), req.user.familyId, dto);
  }

  @Delete('products/batches/:batchId')
  deleteBatch(@Param('batchId') batchId: string, @Request() req: AuthedRequest) {
    return this.stockService.deleteBatch(parseInt(batchId), req.user.familyId);
  }

  // ── 分析 ──

  @Get('products/:id/price-history')
  getPriceHistory(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.stockService.getPriceHistory(parseInt(id), req.user.familyId);
  }

  @Get('products/:id/qrcode')
  async getQRCode(@Param('id') id: string, @Request() req: AuthedRequest, @Res() res: Response) {
    const product = await this.stockService.getProductById(parseInt(id), req.user.familyId);
    const payload = JSON.stringify({ type: 'homehub-product', id: product.id, name: product.name, barcode: product.barcode });
    const buffer = await QRCode.toBuffer(payload, { type: 'png', width: 300, margin: 2 });
    res.set({ 'Content-Type': 'image/png', 'Content-Disposition': `inline; filename="product-${product.id}-qr.png"` });
    res.send(buffer);
  }

  @Get('summary')
  getSummary(@Request() req: AuthedRequest) {
    return this.stockService.getSummary(req.user.familyId);
  }
}
