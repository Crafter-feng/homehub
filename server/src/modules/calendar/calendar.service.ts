import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { calendarEvents } from '../../db/schema/calendar';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar-event.dto';

@Injectable()
export class CalendarService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number, startDate?: string, endDate?: string) {
    let condition = eq(calendarEvents.familyId, familyId);
    if (startDate && endDate) {
      condition = and(condition, gte(calendarEvents.date, startDate), lte(calendarEvents.date, endDate))!;
    } else if (startDate) {
      condition = and(condition, gte(calendarEvents.date, startDate))!;
    } else if (endDate) {
      condition = and(condition, lte(calendarEvents.date, endDate))!;
    }

    return this.db.select().from(calendarEvents)
      .where(condition)
      .orderBy(calendarEvents.date)
      .all();
  }

  async getById(id: number, familyId: number) {
    const event = await this.db.select().from(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.familyId, familyId)))
      .get();
    if (!event) throw new NotFoundException('事件不存在');
    return event;
  }

  async create(familyId: number, dto: CreateCalendarEventDto) {
    return this.db.insert(calendarEvents).values({
      familyId,
      title: dto.title,
      description: dto.description,
      date: dto.date,
      endDate: dto.endDate,
      allDay: dto.allDay !== false,
      category: dto.category || 'custom',
      color: dto.color,
      recurrence: dto.recurrence || 'none',
      reminderMinutes: dto.reminderMinutes,
      relatedType: dto.relatedType,
      relatedId: dto.relatedId,
    }).returning().get();
  }

  async update(id: number, familyId: number, dto: UpdateCalendarEventDto) {
    const event = await this.getById(id, familyId);
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (dto.title) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.date) updates.date = dto.date;
    if (dto.endDate !== undefined) updates.endDate = dto.endDate;
    if (dto.allDay !== undefined) updates.allDay = dto.allDay;
    if (dto.category) updates.category = dto.category;
    if (dto.color !== undefined) updates.color = dto.color;
    if (dto.recurrence) updates.recurrence = dto.recurrence;
    if (dto.reminderMinutes !== undefined) updates.reminderMinutes = dto.reminderMinutes;

    await this.db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, id)).run();
    return this.getById(id, familyId);
  }

  async delete(id: number, familyId: number) {
    await this.getById(id, familyId);
    await this.db.delete(calendarEvents).where(eq(calendarEvents.id, id)).run();
    return { deleted: true };
  }
}
