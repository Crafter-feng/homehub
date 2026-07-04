import { Injectable, Inject, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { families, familyMembers, users } from '../../db/schema';
import { CreateFamilyDto, UpdateFamilyDto, JoinFamilyDto, UpdateMemberRoleDto } from './dto/family.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class FamiliesService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async create(userId: number, dto: CreateFamilyDto) {
    const inviteCode = randomBytes(4).toString('hex');

    const family = await this.db.insert(families).values({
      name: dto.name,
      inviteCode,
    }).returning().get();

    await this.db.insert(familyMembers).values({
      userId,
      familyId: family.id,
      role: 'admin',
    });

    return family;
  }

  async getById(familyId: number) {
    const family = await this.db.select().from(families).where(eq(families.id, familyId)).get();
    if (!family) throw new NotFoundException('家庭不存在');
    return family;
  }

  async update(familyId: number, userId: number, dto: UpdateFamilyDto) {
    await this.requireRole(userId, familyId, 'admin');

    const updates: Record<string, any> = {};
    if (dto.name) updates.name = dto.name;

    await this.db.update(families).set(updates).where(eq(families.id, familyId)).run();
    return this.getById(familyId);
  }

  async regenerateInviteCode(familyId: number, userId: number) {
    await this.requireRole(userId, familyId, 'admin');

    const inviteCode = randomBytes(4).toString('hex');
    await this.db.update(families).set({ inviteCode }).where(eq(families.id, familyId)).run();
    return this.getById(familyId);
  }

  async join(userId: number, dto: JoinFamilyDto) {
    const family = await this.db.select().from(families)
      .where(eq(families.inviteCode, dto.inviteCode)).get();

    if (!family) {
      throw new NotFoundException('邀请码无效');
    }

    const existing = await this.db.select().from(familyMembers)
      .where(and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, family.id)))
      .get();

    if (existing) {
      throw new ConflictException('你已经是该家庭的成员');
    }

    await this.db.insert(familyMembers).values({
      userId,
      familyId: family.id,
      role: 'editor',
    });

    return family;
  }

  async getMembers(familyId: number, userId: number) {
    await this.requireMember(userId, familyId);

    const members = await this.db.select({
      id: familyMembers.id,
      userId: familyMembers.userId,
      role: familyMembers.role,
      joinedAt: familyMembers.joinedAt,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
    }).from(familyMembers)
      .innerJoin(users, eq(familyMembers.userId, users.id))
      .where(eq(familyMembers.familyId, familyId))
      .all();

    return members;
  }

  async updateMemberRole(familyId: number, userId: number, memberId: number, dto: UpdateMemberRoleDto) {
    await this.requireRole(userId, familyId, 'admin');

    // 不能修改自己的角色
    const member = await this.db.select().from(familyMembers).where(eq(familyMembers.id, memberId)).get();
    if (!member) throw new NotFoundException('成员不存在');
    if (member.userId === userId) {
      throw new ForbiddenException('不能修改自己的角色');
    }

    await this.db.update(familyMembers)
      .set({ role: dto.role })
      .where(eq(familyMembers.id, memberId))
      .run();

    return { success: true };
  }

  async removeMember(familyId: number, userId: number, memberId: number) {
    await this.requireRole(userId, familyId, 'admin');

    const member = await this.db.select().from(familyMembers).where(eq(familyMembers.id, memberId)).get();
    if (!member) throw new NotFoundException('成员不存在');
    if (member.userId === userId) {
      throw new ForbiddenException('不能移除自己');
    }

    await this.db.delete(familyMembers).where(eq(familyMembers.id, memberId)).run();
    return { success: true };
  }

  async getUserFamily(userId: number) {
    const membership = await this.db.select().from(familyMembers)
      .where(eq(familyMembers.userId, userId)).get();

    if (!membership) return null;

    const family = await this.db.select().from(families)
      .where(eq(families.id, membership.familyId)).get();

    return { ...family, role: membership.role };
  }

  private async requireMember(userId: number, familyId: number) {
    const member = await this.db.select().from(familyMembers)
      .where(and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, familyId)))
      .get();
    if (!member) throw new ForbiddenException('你不是该家庭的成员');
    return member;
  }

  private async requireRole(userId: number, familyId: number, minRole: string) {
    const member = await this.requireMember(userId, familyId);
    const roleHierarchy: Record<string, number> = { viewer: 0, editor: 1, admin: 2 };
    if ((roleHierarchy[member.role] || 0) < (roleHierarchy[minRole] || 0)) {
      throw new ForbiddenException('权限不足');
    }
    return member;
  }
}
