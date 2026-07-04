import { Controller, Get, Put, Post, Body, Request, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { diskStorage } from 'multer';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('me')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Post('me/password')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req: any, file: any, cb: any) => {
        // Derive extension from mimetype, NOT from originalname (prevents .html/.svg uploads)
        const extMap: Record<string, string> = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/gif': '.gif',
          'image/webp': '.webp',
        };
        const ext = extMap[file.mimetype] || '.jpg';
        const uniqueSuffix = `${req.user.id}-${Date.now()}${ext}`;
        cb(null, uniqueSuffix);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        cb(new Error('只支持 JPG/PNG/GIF/WebP 图片文件'), false);
      } else {
        cb(null, true);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  }))
  async uploadAvatar(@Request() req: any, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    await this.usersService.updateProfile(req.user.id, { avatar: avatarUrl });
    return { url: avatarUrl };
  }
}
