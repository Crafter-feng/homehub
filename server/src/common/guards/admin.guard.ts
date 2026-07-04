import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { familyMembers } from '../../db/schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id || !user.familyId) {
      throw new ForbiddenException('未授权');
    }

    // Check if user is admin in their family
    const member = await this.db.select().from(familyMembers)
      .where(and(
        eq(familyMembers.userId, user.id),
        eq(familyMembers.familyId, user.familyId),
      ))
      .get();

    if (!member || member.role !== 'admin') {
      throw new ForbiddenException('需要管理员权限');
    }

    return true;
  }
}
