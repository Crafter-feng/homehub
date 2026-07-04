import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { locations, items } from '../../../db/schema';

export class CreateLocationDto {
  name: string;
  parentId?: number;
  level?: number;
  image?: string;
  notes?: string;
}

export class UpdateLocationDto extends CreateLocationDto {}

@Injectable()
export class LocationsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number) {
    const locs = await this.db.select().from(locations)
      .where(eq(locations.familyId, familyId))
      .all();
    return this.buildTree(locs);
  }

  async getById(locationId: number, familyId: number) {
    const loc = await this.db.select().from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.familyId, familyId)))
      .get();
    if (!loc) throw new NotFoundException('位置不存在');

    const locationItems = await this.db.select().from(items)
      .where(eq(items.locationId, locationId))
      .all();

    const children = await this.db.select().from(locations)
      .where(eq(locations.parentId, locationId))
      .all();

    return { ...loc, items: locationItems, children };
  }

  async create(familyId: number, dto: CreateLocationDto) {
    return this.db.insert(locations).values({
      familyId,
      name: dto.name,
      parentId: dto.parentId,
      level: dto.level || (dto.parentId ? 2 : 1),
      image: dto.image,
      notes: dto.notes,
    }).returning().get();
  }

  async update(locationId: number, familyId: number, dto: UpdateLocationDto) {
    const loc = await this.db.select().from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.familyId, familyId)))
      .get();
    if (!loc) throw new NotFoundException('位置不存在');

    const updates: Record<string, any> = {};
    if (dto.name) updates.name = dto.name;
    if (dto.parentId !== undefined) updates.parentId = dto.parentId;
    if (dto.level !== undefined) updates.level = dto.level;
    if (dto.image !== undefined) updates.image = dto.image;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    await this.db.update(locations).set(updates).where(eq(locations.id, locationId)).run();
    return this.getById(locationId, familyId);
  }

  async delete(locationId: number, familyId: number) {
    const loc = await this.db.select().from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.familyId, familyId)))
      .get();
    if (!loc) throw new NotFoundException('位置不存在');

    const children = await this.db.select().from(locations)
      .where(eq(locations.parentId, locationId))
      .all();
    if (children.length > 0) {
      for (const child of children) {
        await this.db.update(locations)
          .set({ parentId: loc.parentId })
          .where(eq(locations.id, child.id))
          .run();
      }
    }

    await this.db.update(items)
      .set({ locationId: null })
      .where(eq(items.locationId, locationId))
      .run();

    await this.db.delete(locations).where(eq(locations.id, locationId)).run();
    return { success: true };
  }

  private buildTree(locs: any[], parentId: number | null = null): any[] {
    return locs
      .filter(l => l.parentId === parentId)
      .map(l => ({
        ...l,
        children: this.buildTree(locs, l.id),
      }));
  }
}
