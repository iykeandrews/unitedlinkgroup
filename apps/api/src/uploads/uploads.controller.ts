import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, Res, BadRequestException, UseGuards, Injectable, ExecutionContext } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@Injectable()
class UploadsReadGuard extends AuthGuard('jwt-query') {
  canActivate(context: ExecutionContext) {
    const req: any = context.switchToHttp().getRequest();
    const filename = String(req?.params?.filename || '');
    if (filename.startsWith('img-') || filename.startsWith('vid-')) return true;
    return super.canActivate(context);
  }
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
  }))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    const uploaded = await this.uploadsService.uploadBuffer({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      prefix: 'file',
    });
    return { url: uploaded.url, filename: uploaded.key, originalName: uploaded.originalName };
  }

  @Post('images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const ok = typeof file.mimetype === 'string' && file.mimetype.startsWith('image/');
        cb(ok ? null : new BadRequestException('Only image uploads are allowed'), ok);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  )
  async uploadImage(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    const uploaded = await this.uploadsService.uploadBuffer({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      prefix: 'img',
    });
    return {
      url: uploaded.url,
      filename: uploaded.key,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
    };
  }

  @Post('videos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const ok = typeof file.mimetype === 'string' && file.mimetype.startsWith('video/');
        cb(ok ? null : new BadRequestException('Only video uploads are allowed'), ok);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    })
  )
  async uploadVideo(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    const uploaded = await this.uploadsService.uploadBuffer({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      prefix: 'vid',
    });
    return {
      url: uploaded.url,
      filename: uploaded.key,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
    };
  }

  @Get(':filename')
  @UseGuards(UploadsReadGuard)
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    if (this.uploadsService.isS3Enabled()) {
      const url = await this.uploadsService.getSignedDownloadUrl(safeFilename, 60);
      return res.redirect(url);
    }

    const filePath = this.uploadsService.getLocalFilePath(safeFilename);
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }
    return res.sendFile(filePath);
  }
}
