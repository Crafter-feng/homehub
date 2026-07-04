import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TagsService, CreateTagDto } from './tags.service';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(@Request() req: any) {
    return this.tagsService.list(req.user.familyId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateTagDto) {
    return this.tagsService.create(req.user.familyId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: { name?: string; icon?: string; color?: string; notes?: string }) {
    return this.tagsService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.tagsService.delete(parseInt(id), req.user.familyId);
  }

  @Post('item/:itemId/:tagId')
  addToItem(@Param('itemId') itemId: string, @Param('tagId') tagId: string) {
    return this.tagsService.addToItem(parseInt(itemId), parseInt(tagId));
  }

  @Delete('item/:itemId/:tagId')
  removeFromItem(@Param('itemId') itemId: string, @Param('tagId') tagId: string) {
    return this.tagsService.removeFromItem(parseInt(itemId), parseInt(tagId));
  }

  @Get('item/:itemId')
  getItemTags(@Param('itemId') itemId: string) {
    return this.tagsService.getItemTags(parseInt(itemId));
  }
}
