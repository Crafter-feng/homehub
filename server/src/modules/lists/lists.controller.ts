import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ListsService } from './lists.service';
import { CreateListDto, UpdateListDto, AddListItemDto, UpdateListItemDto, AssignListItemDto, AddCommentDto } from './dto/list.dto';

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  listLists(@Request() req: any, @Query('type') type?: string) {
    return this.listsService.list(req.user.familyId, type);
  }

  @Get('my-tasks')
  getMyTasks(@Request() req: any) {
    return this.listsService.getMyTasks(req.user.id, req.user.familyId);
  }

  @Get('pending-todos')
  getPendingTodos(@Request() req: any) {
    return this.listsService.getPendingTodos(req.user.familyId);
  }

  @Get('holiday-templates')
  listHolidayTemplates() {
    return this.listsService.listHolidayTemplates();
  }

  @Get(':id')
  getList(@Param('id') id: string, @Request() req: any) {
    return this.listsService.getById(parseInt(id), req.user.familyId);
  }

  @Post()
  createList(@Request() req: any, @Body() dto: CreateListDto) {
    return this.listsService.create(req.user.familyId, req.user.id, dto);
  }

  @Put(':id')
  updateList(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateListDto) {
    return this.listsService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  deleteList(@Param('id') id: string, @Request() req: any) {
    return this.listsService.delete(parseInt(id), req.user.familyId);
  }

  @Post(':id/invItems')
  addItem(@Param('id') id: string, @Request() req: any, @Body() dto: AddListItemDto) {
    return this.listsService.addItem(parseInt(id), req.user.familyId, dto);
  }

  @Put('items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateListItemDto) {
    return this.listsService.updateItem(parseInt(itemId), dto);
  }

  @Delete('items/:itemId')
  deleteItem(@Param('itemId') itemId: string) {
    return this.listsService.deleteItem(parseInt(itemId));
  }

  @Post('items/:itemId/check')
  checkItem(@Param('itemId') itemId: string, @Request() req: any) {
    return this.listsService.checkItem(parseInt(itemId), req.user.id);
  }

  @Post('items/:itemId/uncheck')
  uncheckItem(@Param('itemId') itemId: string) {
    return this.listsService.uncheckItem(parseInt(itemId));
  }

  @Post('items/:itemId/assign')
  assignItem(@Param('itemId') itemId: string, @Body() dto: AssignListItemDto) {
    return this.listsService.assignItem(parseInt(itemId), dto);
  }

  @Get('items/:itemId/comments')
  getComments(@Param('itemId') itemId: string) {
    return this.listsService.getComments(parseInt(itemId));
  }

  @Post('items/:itemId/comments')
  addComment(@Param('itemId') itemId: string, @Request() req: any, @Body() dto: AddCommentDto) {
    return this.listsService.addComment(parseInt(itemId), req.user.id, dto);
  }

  @Post('from-template')
  createFromTemplate(@Request() req: any, @Body() body: { templateId: number }) {
    return this.listsService.createFromTemplate(req.user.familyId, req.user.id, body.templateId);
  }

  @Post('auto-replenish')
  autoReplenish(@Request() req: any) {
    return this.listsService.autoReplenish(req.user.familyId);
  }
}
