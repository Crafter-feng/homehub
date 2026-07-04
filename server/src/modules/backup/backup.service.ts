import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupManifest {
  id: string;
  name: string;
  filename: string;
  createdAt: string;
  size: number;
  type: 'manual' | 'scheduled' | 'pre-restore';
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly dbPath: string;
  private readonly manifestPath: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'data', 'backups');
    this.dbPath = path.join(process.cwd(), 'data', 'homehub.db');
    this.manifestPath = path.join(this.backupDir, 'manifest.json');
    this.ensureBackupDir();
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  private getManifest(): BackupManifest[] {
    if (!fs.existsSync(this.manifestPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  private saveManifest(manifest: BackupManifest[]) {
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2));
  }

  async createBackup(name?: string, type: 'manual' | 'scheduled' | 'pre-restore' = 'manual'): Promise<BackupManifest> {
    const id = `backup_${Date.now()}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = name || `backup_${timestamp}`;
    const filename = `${id}.db`;
    const backupPath = path.join(this.backupDir, filename);

    if (!fs.existsSync(this.dbPath)) {
      throw new Error('数据库文件不存在');
    }

    fs.copyFileSync(this.dbPath, backupPath);

    const stat = fs.statSync(backupPath);
    const manifest: BackupManifest = {
      id,
      name: backupName,
      filename,
      createdAt: new Date().toISOString(),
      size: stat.size,
      type,
    };

    const manifestList = this.getManifest();
    manifestList.push(manifest);
    this.saveManifest(manifestList);

    this.logger.log(`备份已创建: ${backupName} (${filename})`);
    return manifest;
  }

  async listBackups(): Promise<BackupManifest[]> {
    return this.getManifest().sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getBackupInfo(filename: string): Promise<BackupManifest> {
    const manifest = this.getManifest();
    const backup = manifest.find(b => b.filename === filename);
    if (!backup) throw new NotFoundException('备份不存在');
    return backup;
  }

  async restoreBackup(filename: string, createPreRestore = true): Promise<{ restored: boolean; preRestoreBackup?: BackupManifest }> {
    const backupPath = path.join(this.backupDir, filename);
    if (!fs.existsSync(backupPath)) {
      throw new NotFoundException('备份文件不存在');
    }

    let preRestoreBackup: BackupManifest | undefined;
    if (createPreRestore) {
      preRestoreBackup = await this.createBackup('恢复前自动备份', 'pre-restore');
    }

    if (!fs.existsSync(this.dbPath)) {
      throw new Error('数据库文件路径不存在');
    }

    fs.copyFileSync(backupPath, this.dbPath);
    this.logger.log(`数据库已恢复: ${filename}`);

    return { restored: true, preRestoreBackup };
  }

  async deleteBackup(filename: string): Promise<{ deleted: boolean }> {
    const backupPath = path.join(this.backupDir, filename);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    const manifest = this.getManifest().filter(b => b.filename !== filename);
    this.saveManifest(manifest);
    this.logger.log(`备份已删除: ${filename}`);
    return { deleted: true };
  }

  async getStorageInfo(): Promise<{
    totalBackups: number;
    totalSize: number;
    latestBackup?: string;
    dbSize: number;
  }> {
    const manifest = this.getManifest();
    let totalSize = 0;
    for (const b of manifest) {
      const bp = path.join(this.backupDir, b.filename);
      if (fs.existsSync(bp)) {
        totalSize += fs.statSync(bp).size;
      }
    }

    const dbSize = fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0;

    return {
      totalBackups: manifest.length,
      totalSize,
      latestBackup: manifest.length > 0 ? manifest[manifest.length - 1].createdAt : undefined,
      dbSize,
    };
  }

  async cleanupOldBackups(retentionDays: number): Promise<{ deleted: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const manifest = this.getManifest();
    const toDelete = manifest.filter(b => new Date(b.createdAt) < cutoff && b.type !== 'pre-restore');

    for (const b of toDelete) {
      const bp = path.join(this.backupDir, b.filename);
      if (fs.existsSync(bp)) fs.unlinkSync(bp);
    }

    const remaining = manifest.filter(b => new Date(b.createdAt) >= cutoff || b.type === 'pre-restore');
    this.saveManifest(remaining);

    this.logger.log(`已清理 ${toDelete.length} 个过期备份`);
    return { deleted: toDelete.length };
  }
}
