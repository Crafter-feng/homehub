import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('未授权');
    }

    // Check if user is system-level admin
    const userRecord = await this.db.select().from(users)
      .where(eq(users.id, user.id))
      .get();

    if (!userRecord || !userRecord.isAdmin) {
      throw new ForbiddenException('需要系统管理员权限');
    }

    return true;
  }
}
