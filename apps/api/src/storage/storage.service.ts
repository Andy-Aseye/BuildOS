import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../auth/supabase';
import { env } from '../config/env';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  bucket(): string {
    return (
      env.PROJECT_STORAGE_BUCKET ??
      env.WHATSAPP_MEDIA_BUCKET ??
      'buildos-uploads'
    );
  }

  /**
   * Upload bytes to Supabase Storage and return a public URL.
   */
  async uploadPublicObject(params: {
    tenantId: string;
    projectId: string;
    folder: string;
    filename: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<string> {
    const bucket = this.bucket();
    const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
    const path = `${params.tenantId}/${params.projectId}/${params.folder}/${randomUUID()}-${safeName}`;
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, params.buffer, {
        contentType: params.contentType || 'application/octet-stream',
        upsert: false,
      });
    if (error) {
      this.logger.error(`Supabase upload failed (${bucket}): ${error.message}`);
      throw new Error(`Storage upload failed: ${error.message}`);
    }
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
