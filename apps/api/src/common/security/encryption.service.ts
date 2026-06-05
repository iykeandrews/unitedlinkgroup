import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_SECRET || 'development_secret_do_not_use_in_prod';
    // Derive a 32-byte key from the secret
    this.key = crypto.scryptSync(secret, 'salt', 32);
  }

  encrypt(text: string): string {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption failed:', error);
        return text;
    }
  }

  decrypt(text: string): string {
    if (!text) return text;
    const parts = text.split(':');
    
    // If not in iv:content format, assume it's legacy plaintext
    if (parts.length !== 2) return text; 

    try {
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        // Return original if decryption fails (fallback for legacy data or wrong key)
        console.warn('Decryption failed for value, returning original.');
        return text;
    }
  }
}
