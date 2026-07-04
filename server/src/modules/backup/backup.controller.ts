import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BackupService, BackupManifest } from './backup.service';
import { CreateBackupDto, RestoreBackupDto } from './dto/backup.dto';

@Controller('backup')
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  listBackups() {
    return this.backupService.listBackups();
  }

  @Get('storage')
  getStorageInfo() {
    return this.backupService.getStorageInfo();
  }

  @Post()
  createBackup(@Body() dto: CreateBackupDto) {
    return this.backupService.createBackup(dto.name, 'manual');
  }

  @Post('restore')
  restoreBackup(@Body() dto: RestoreBackupDto) {
    return this.backupService.restoreBackup(dto.filename, dto.createPreRestoreBackup !== false);
  }

  @Delete(':filename')
  deleteBackup(@Param('filename') filename: string) {
    return this.backupService.deleteBackup(filename);
  }

  @Post('cleanup')
  cleanupOldBackups(@Body() body: { retentionDays: number }) {
    return this.backupService.cleanupOldBackups(body.retentionDays || 30);
  }
}
