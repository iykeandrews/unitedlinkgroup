import { BadRequestException, Injectable } from '@nestjs/common';
import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

type UploadResult = {
  key: string;
  url: string;
  originalName: string;
  mimeType: string | null;
  size: number;
};

@Injectable()
export class UploadsService {
  private s3: S3Client | null = null;
  private readonly bucket = process.env.AWS_S3_BUCKET || '';
  private readonly region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || '';
  private readonly provider = (process.env.UPLOADS_PROVIDER || '').toLowerCase();

  private resolveProvider(): 's3' | 'local' {
    if (this.provider === 's3') return 's3';
    if (this.provider === 'local') return 'local';
    if (this.bucket) return 's3';
    return 'local';
  }

  private ensureS3() {
    if (this.s3) return this.s3;
    if (!this.bucket) throw new BadRequestException('AWS_S3_BUCKET is not configured');
    if (!this.region) throw new BadRequestException('AWS_REGION is not configured');
    this.s3 = new S3Client({ region: this.region });
    return this.s3;
  }

  private uploadsDir() {
    return path.join(process.cwd(), 'apps/api/uploads');
  }

  private ensureUploadsDir() {
    const dir = this.uploadsDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private extFromName(originalName: string) {
    const ext = path.extname(originalName || '').slice(0, 16);
    if (!ext) return '';
    if (!ext.startsWith('.')) return '';
    return ext.replace(/[^a-zA-Z0-9.]/g, '');
  }

  private makeKey(prefix: string, originalName: string) {
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = this.extFromName(originalName);
    const safePrefix = (prefix || 'file').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'file';
    return `${safePrefix}-${unique}${ext}`;
  }

  async uploadBuffer(input: { buffer: Buffer; originalName: string; mimeType?: string | null; prefix: string }): Promise<UploadResult> {
    if (!input?.buffer || !Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
      throw new BadRequestException('File is required');
    }
    const key = this.makeKey(input.prefix, input.originalName);
    const provider = this.resolveProvider();

    if (provider === 's3') {
      const s3 = this.ensureS3();
      await s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: input.buffer,
          ContentType: input.mimeType || undefined,
        })
      );
    } else {
      const dir = this.ensureUploadsDir();
      fs.writeFileSync(path.join(dir, key), input.buffer);
    }

    return {
      key,
      url: `/uploads/${key}`,
      originalName: input.originalName,
      mimeType: input.mimeType || null,
      size: input.buffer.length,
    };
  }

  isS3Enabled() {
    return this.resolveProvider() === 's3';
  }

  async getSignedDownloadUrl(key: string, expiresSeconds = 60) {
    const safeKey = path.basename(key);
    if (!safeKey) throw new BadRequestException('File not found');
    const s3 = this.ensureS3();
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      }),
      { expiresIn: expiresSeconds }
    );
  }

  getLocalFilePath(key: string) {
    const safeKey = path.basename(key);
    return path.join(this.uploadsDir(), safeKey);
  }
}

