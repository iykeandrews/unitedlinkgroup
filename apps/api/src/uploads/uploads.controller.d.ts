import { Response } from 'express';
import { UploadsService } from './uploads.service';
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    uploadFile(file: any): Promise<{
        url: string;
        filename: string;
        originalName: string;
    }>;
    uploadImage(file: any): Promise<{
        url: string;
        filename: string;
        originalName: string;
        mimeType: string | null;
        size: number;
    }>;
    uploadVideo(file: any): Promise<{
        url: string;
        filename: string;
        originalName: string;
        mimeType: string | null;
        size: number;
    }>;
    serveFile(filename: string, res: Response): Promise<void>;
}
