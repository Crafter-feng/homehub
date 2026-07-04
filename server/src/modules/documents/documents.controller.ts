import {
  Controller, Get, Post, Delete, Body, Param, Query, Request,
  UseGuards, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { UploadMetaDto } from './dto/document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = 'uploads/invDocuments';
        // 确保目录存在
        const fs = require('fs');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = extname(file.originalname);
        const uniqueName = `${randomUUID()}${ext}`;
        cb(null, uniqueName);
      },
    }),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  }))
  upload(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: UploadMetaDto,
  ) {
    return this.documentsService.upload(req.user.familyId, file, meta);
  }

  @Get()
  list(@Request() req: any, @Query('itemId') itemId?: string) {
    return this.documentsService.list(req.user.familyId, itemId ? parseInt(itemId) : undefined);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Request() req: any) {
    return this.documentsService.getById(parseInt(id), req.user.familyId);
  }

  @Get(':id/download')
  download(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    return this.documentsService.download(parseInt(id), req.user.familyId, res);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.documentsService.delete(parseInt(id), req.user.familyId);
  }
}
