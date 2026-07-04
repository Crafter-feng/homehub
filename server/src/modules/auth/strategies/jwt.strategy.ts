import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../../../config/config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'homehub-dev-secret-change-in-production'),
    });
  }

  async validate(payload: { sub: number; email: string; familyId?: number; type?: string }) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    // accessToken 不应包含 type: 'refresh' 字段，防止 refreshToken 被当作 accessToken 使用
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('Refresh token cannot be used for access');
    }
    return { id: payload.sub, email: payload.email, familyId: payload.familyId };
  }
}
