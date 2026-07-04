import { Injectable, Inject, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async getProfile(userId: number) {
    const user = await this.db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, userId)).get();

    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (dto.name) updates.name = dto.name;
    if (dto.email) updates.email = dto.email;
    if (dto.avatar !== undefined) updates.avatar = dto.avatar;

    await this.db.update(users).set(updates).where(eq(users.id, userId)).run();
    return this.getProfile(userId);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) throw new NotFoundException('用户不存在');

    const valid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('原密码错误');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .run();

    return { success: true };
  }
}
