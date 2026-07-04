import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/products.dto';

interface AuthedRequest {
  user: { id: number; email: string; familyId: number };
}

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Request() req: AuthedRequest) {
    return this.productsService.list(req.user.familyId);
  }

  @Get('search')
  search(@Request() req: AuthedRequest, @Query('q') query: string) {
    return this.productsService.search(req.user.familyId, query);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.productsService.getById(parseInt(id), req.user.familyId);
  }

  @Post()
  create(@Request() req: AuthedRequest, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.familyId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: AuthedRequest, @Body() dto: UpdateProductDto) {
    return this.productsService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.productsService.delete(parseInt(id), req.user.familyId);
  }
}