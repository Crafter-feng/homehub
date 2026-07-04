import { Injectable, ConflictException, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq, and, or } from 'drizzle-orm';
import { users, families, familyMembers, apiTokens } from '../../db/schema';
import { DATABASE_TOKEN, Database } from '../../db/database.module';
import { ConfigService } from '../../config/config.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(DATABASE_TOKEN) private readonly db: Database,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.select().from(users).where(eq(users.email, dto.email)).get();
    if (existing) {
      throw new ConflictException('该邮箱已注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const result = await this.db.insert(users).values({
      name: dto.name,
      email: dto.email,
      passwordHash,
    }).returning().get();

    // 创建默认家庭
    const familyCode = randomBytes(4).toString('hex');
    const family = await this.db.insert(families).values({
      name: `${dto.name}的家`,
      inviteCode: familyCode,
    }).returning().get();

    // 将用户添加为家庭管理员
    await this.db.insert(familyMembers).values({
      userId: result.id,
      familyId: family.id,
      role: 'admin',
    });

    this.logger.log(`用户注册成功: ${dto.email} (ID: ${result.id})`);
    return this.generateTokens(result.id, result.email, family.id);
  }

  async login(dto: LoginDto) {
    // 支持邮箱或用户名登录
    const user = await this.db.select().from(users)
      .where(or(eq(users.email, dto.account), eq(users.name, dto.account)))
      .get();
    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }

    // 获取用户的家庭
    const membership = await this.db.select().from(familyMembers)
      .where(eq(familyMembers.userId, user.id)).get();
    const familyId = membership?.familyId;

    this.logger.log(`用户登录成功: ${dto.account} (ID: ${user.id})`);
    return this.generateTokens(user.id, user.email, familyId);
  }

  async getProfile(userId: number) {
    const user = await this.db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, userId)).get();

    // 获取家庭信息
    const membership = await this.db.select().from(familyMembers)
      .where(eq(familyMembers.userId, userId)).get();
    let family = null;
    if (membership) {
      family = await this.db.select().from(families)
        .where(eq(families.id, membership.familyId)).get();
    }

    return { ...user, family, role: membership?.role };
  }

  async createApiToken(userId: number, familyId: number, dto: CreateApiTokenDto) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const tokenPrefix = rawToken.substring(0, 8);

    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 86400000)
      : null;

    await this.db.insert(apiTokens).values({
      userId,
      familyId,
      name: dto.name,
      tokenHash,
      tokenPrefix,
      permissions: dto.permissions || ['read'],
      expiresAt,
    });

    return {
      token: rawToken,
      prefix: `hb_${tokenPrefix}`,
      name: dto.name,
      expiresAt,
    };
  }

  async listApiTokens(userId: number) {
    return this.db.select({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      permissions: apiTokens.permissions,
      expiresAt: apiTokens.expiresAt,
      lastUsedAt: apiTokens.lastUsedAt,
      isRevoked: apiTokens.isRevoked,
      createdAt: apiTokens.createdAt,
    }).from(apiTokens).where(eq(apiTokens.userId, userId)).all();
  }

  async revokeApiToken(userId: number, tokenId: number) {
    await this.db.update(apiTokens)
      .set({ isRevoked: true })
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId)))
      .run();
    return { success: true };
  }

  async validateApiToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.db.select().from(apiTokens)
      .where(and(eq(apiTokens.tokenHash, tokenHash), eq(apiTokens.isRevoked, false)))
      .get();

    if (!record) return null;
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) return null;

    await this.db.update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, record.id))
      .run();

    return { userId: record.userId, familyId: record.familyId, permissions: record.permissions };
  }

  async refreshTokens(userId: number, email: string, familyId?: number) {
    // refreshToken 已由 JwtRefreshStrategy 验证过，这里直接签发新 token pair
    return this.generateTokens(userId, email, familyId);
  }

  private generateTokens(userId: number, email: string, familyId?: number) {
    const accessSecret = this.configService.get('JWT_SECRET', 'homehub-dev-secret-change-in-production');
    const refreshSecret = this.configService.get('JWT_REFRESH_SECRET', 'homehub-dev-refresh-secret-change-in-production');

    const accessToken = this.jwtService.sign(
      { sub: userId, email, familyId },
      { secret: accessSecret, expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, email, familyId, type: 'refresh' },
      { secret: refreshSecret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken, user: { id: userId, email } };
  }
}
