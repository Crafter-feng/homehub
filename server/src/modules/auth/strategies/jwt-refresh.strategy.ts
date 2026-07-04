import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '../../../config/config.service';
import { JWT_REFRESH_SECRET } from '../auth.constants';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: (req: Request) => req?.body?.refreshToken ?? null,
      passReqToCallback: false,
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET', JWT_REFRESH_SECRET),
    });
  }

  async validate(payload: { sub: number; email: string; familyId?: number; type?: string }) {
    if (!payload.sub || payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return { id: payload.sub, email: payload.email, familyId: payload.familyId };
  }
}
