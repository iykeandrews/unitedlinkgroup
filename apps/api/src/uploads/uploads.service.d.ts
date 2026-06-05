type UploadResult = {
    key: string;
    url: string;
    originalName: string;
    mimeType: string | null;
    size: number;
};
export declare class UploadsService {
    private s3;
    private readonly bucket;
    private readonly region;
    private readonly provider;
    private resolveProvider;
    private ensureS3;
    private uploadsDir;
    private ensureUploadsDir;
    private extFromName;
    private makeKey;
    uploadBuffer(input: {
        buffer: Buffer;
        originalName: string;
        mimeType?: string | null;
        prefix: string;
    }): Promise<UploadResult>;
    isS3Enabled(): boolean;
    getSignedDownloadUrl(key: string, expiresSeconds?: number): Promise<string>;
    getLocalFilePath(key: string): string;
}
export {};
