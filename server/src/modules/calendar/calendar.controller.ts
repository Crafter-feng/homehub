import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar-event.dto';

@Controller('calendar/events')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  listEvents(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.calendarService.list(req.user.familyId, startDate, endDate);
  }

  @Get(':id')
  getEvent(@Param('id') id: string, @Request() req: any) {
    return this.calendarService.getById(parseInt(id), req.user.familyId);
  }

  @Post()
  createEvent(@Request() req: any, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.create(req.user.familyId, dto);
  }

  @Put(':id')
  updateEvent(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateCalendarEventDto) {
    return this.calendarService.update(parseInt(id), req.user.familyId, dto);
  }

  @Delete(':id')
  deleteEvent(@Param('id') id: string, @Request() req: any) {
    return this.calendarService.delete(parseInt(id), req.user.familyId);
  }
}
