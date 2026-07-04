import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and } from 'drizzle-orm';
import { Response } from 'express';
import * as fs from 'fs';
import { join } from 'path';
import { documents, items } from '../../db/schema';
import { UploadMetaDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async upload(familyId: number, file: Express.Multer.File, meta: UploadMetaDto) {
    // 如果指定了 itemId，校验物品属于当前家庭
    if (meta.itemId) {
      const item = await this.db.select().from(items)
        .where(and(eq(items.id, meta.itemId), eq(items.familyId, familyId)))
        .get();
      if (!item) throw new NotFoundException(`物品 #${meta.itemId} 不存在或不属于当前家庭`);
    }

    // file.filename 由 multer diskStorage 生成，filePath 存相对路径
    const filePath = `documents/${file.filename}`;

    const result = await this.db.insert(documents).values({
      familyId,
      itemId: meta.itemId ?? null,
      name: file.originalname,
      filePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      category: (meta.category as any) ?? 'other',
    }).returning().get();

    return result;
  }

  async list(familyId: number, itemId?: number) {
    if (itemId) {
      return this.db.select().from(documents)
        .where(and(eq(documents.familyId, familyId), eq(documents.itemId, itemId)))
        .all();
    }
    return this.db.select().from(documents)
      .where(eq(documents.familyId, familyId))
      .all();
  }

  async getById(id: number, familyId: number) {
    const doc = await this.db.select().from(documents)
      .where(and(eq(documents.id, id), eq(documents.familyId, familyId)))
      .get();
    if (!doc) throw new NotFoundException(`文档 #${id} 不存在`);
    return doc;
  }

  async download(id: number, familyId: number, res: Response) {
    const doc = await this.getById(id, familyId);
    const absolutePath = join(process.cwd(), 'uploads', doc.filePath);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
    res.sendFile(absolutePath);
  }

  async delete(id: number, familyId: number) {
    const doc = await this.getById(id, familyId);
    const absolutePath = join(process.cwd(), 'uploads', doc.filePath);

    // 先删物理文件，不存在时吞错继续删 DB 记录
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      // 文件可能已被删除，忽略错误继续清理 DB 记录
    }

    await this.db.delete(documents).where(eq(documents.id, id)).run();
    return { success: true };
  }
}
