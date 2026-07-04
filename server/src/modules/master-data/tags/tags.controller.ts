import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

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
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.tagsService.delete(parseInt(id), req.user.familyId);
  }

  @Post('item/:itemId/:tagId')
  addToItem(@Param('itemId') itemId: string, @Param('tagId') tagId: string, @Request() req: any) {
    return this.tagsService.addToItem(parseInt(itemId), parseInt(tagId), req.user.familyId);
  }

  @Delete('item/:itemId/:tagId')
  removeFromItem(@Param('itemId') itemId: string, @Param('tagId') tagId: string, @Request() req: any) {
    return this.tagsService.removeFromItem(parseInt(itemId), parseInt(tagId), req.user.familyId);
  }

  @Get('item/:itemId')
  getItemTags(@Param('itemId') itemId: string, @Request() req: any) {
    return this.tagsService.getItemTags(parseInt(itemId), req.user.familyId);
  }
}
