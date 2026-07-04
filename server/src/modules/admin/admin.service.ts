import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, sql } from 'drizzle-orm';
import { users, families, familyMembers, apiTokens, invItems } from '../../db/schema';
import { PluginRegistryService } from '../../plugins/registry/plugin-registry.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
    private readonly pluginRegistry: PluginRegistryService,
  ) {}

  /**
   * 系统统计：总用户/家庭/物品/扫描次数
   */
  async getSystemStats() {
    const userCount = await this.db.select({ count: sql<number>`count(*)` }).from(users).get();
    const familyCount = await this.db.select({ count: sql<number>`count(*)` }).from(families).get();
    const itemCount = await this.db.select({ count: sql<number>`count(*)` }).from(invItems).get();

    return {
      totalUsers: userCount?.count ?? 0,
      totalFamilies: familyCount?.count ?? 0,
      totalItems: itemCount?.count ?? 0,
    };
  }

  /**
   * 用户列表（剔除 passwordHash）
   */
  async listUsers() {
    return this.db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).all();
  }

  /**
   * 家庭列表 + 每家庭成员数
   */
  async listFamilies() {
    const familiesList = await this.db.select().from(families).all();

    const result: any[] = [];
    for (const family of familiesList) {
      const memberCountResult = await this.db.select({ count: sql<number>`count(*)` })
        .from(familyMembers)
        .where(eq(familyMembers.familyId, family.id))
        .get();
      result.push({
        ...family,
        memberCount: memberCountResult?.count ?? 0,
      });
    }
    return result;
  }

  /**
   * API Token 列表（剔除 tokenHash，可按 familyId 过滤）
   */
  async listApiTokens(familyId?: number) {
    const query = this.db.select({
      id: apiTokens.id,
      userId: apiTokens.userId,
      familyId: apiTokens.familyId,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      permissions: apiTokens.permissions,
      expiresAt: apiTokens.expiresAt,
      lastUsedAt: apiTokens.lastUsedAt,
      isRevoked: apiTokens.isRevoked,
      createdAt: apiTokens.createdAt,
    }).from(apiTokens);

    if (familyId) {
      return query.where(eq(apiTokens.familyId, familyId)).all();
    }
    return query.all();
  }

  /**
   * 插件状态概览
   */
  getPluginOverview() {
    return this.pluginRegistry.listPlugins();
  }
}
