import { Controller, Post, Get, Body, Request, UseGuards, Delete, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

interface AuthenticatedUser {
  id: number;
  email: string;
  familyId?: number;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: { user: AuthenticatedUser }) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  refresh(@Request() req: { user: AuthenticatedUser }, @Body('refreshToken') _refreshToken: string) {
    // refreshToken 已由 JwtRefreshStrategy 验证，_refreshToken 参数仅声明式保留
    return this.authService.refreshTokens(req.user.id, req.user.email, req.user.familyId);
  }

  @Get('tokens')
  @UseGuards(JwtAuthGuard)
  listTokens(@Request() req: { user: AuthenticatedUser }) {
    return this.authService.listApiTokens(req.user.id);
  }

  @Post('tokens')
  @UseGuards(JwtAuthGuard)
  createToken(@Request() req: { user: AuthenticatedUser }, @Body() dto: CreateApiTokenDto) {
    return this.authService.createApiToken(req.user.id, req.user.familyId ?? 0, dto);
  }

  @Delete('tokens/:id')
  @UseGuards(JwtAuthGuard)
  revokeToken(@Request() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.authService.revokeApiToken(req.user.id, parseInt(id));
  }
}
