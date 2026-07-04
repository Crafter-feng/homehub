import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { mdLocations, invItems } from '../../../db/schema';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async list(familyId: number) {
    const locs = await this.db.select().from(mdLocations)
      .where(eq(mdLocations.familyId, familyId))
      .all();
    return this.buildTree(locs);
  }

  async getById(locationId: number, familyId: number) {
    const loc = await this.db.select().from(mdLocations)
      .where(and(eq(mdLocations.id, locationId), eq(mdLocations.familyId, familyId)))
      .get();
    if (!loc) throw new NotFoundException('位置不存在');

    const locationItems = await this.db.select().from(invItems)
      .where(eq(invItems.locationId, locationId))
      .all();

    const children = await this.db.select().from(mdLocations)
      .where(eq(mdLocations.parentId, locationId))
      .all();

    return { ...loc, invItems: locationItems, children };
  }

  async create(familyId: number, dto: CreateLocationDto) {
    return this.db.insert(mdLocations).values({
      familyId,
      name: dto.name,
      parentId: dto.parentId,
      level: dto.level || (dto.parentId ? 2 : 1),
      image: dto.image,
      notes: dto.notes,
    }).returning().get();
  }

  async update(locationId: number, familyId: number, dto: UpdateLocationDto) {
    const loc = await this.db.select().from(mdLocations)
      .where(and(eq(mdLocations.id, locationId), eq(mdLocations.familyId, familyId)))
      .get();
    if (!loc) throw new NotFoundException('位置不存在');

    const updates: Record<string, any> = {};
    if (dto.name) updates.name = dto.name;
    if (dto.parentId !== undefined) updates.parentId = dto.parentId;
    if (dto.level !== undefined) updates.level = dto.level;
    if (dto.image !== undefined) updates.image = dto.image;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    await this.db.update(mdLocations).set(updates).where(eq(mdLocations.id, locationId)).run();
    return this.getById(locationId, familyId);
  }

  async delete(locationId: number, familyId: number) {
    const loc = await this.db.select().from(mdLocations)
      .where(and(eq(mdLocations.id, locationId), eq(mdLocations.familyId, familyId)))
      .get();
    if (!loc) throw new NotFoundException('位置不存在');

    // Wrap in transaction for data consistency
    return this.db.transaction((tx: any) => {
      // Move children to parent
      const children = tx.select().from(mdLocations)
        .where(eq(mdLocations.parentId, locationId))
        .all();
      for (const child of children) {
        tx.update(mdLocations)
          .set({ parentId: loc.parentId })
          .where(eq(mdLocations.id, child.id))
          .run();
      }

      // Clear location from items
      tx.update(invItems)
        .set({ locationId: null })
        .where(eq(invItems.locationId, locationId))
        .run();

      // Delete the location
      tx.delete(mdLocations).where(eq(mdLocations.id, locationId)).run();

      return { success: true };
    });
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
