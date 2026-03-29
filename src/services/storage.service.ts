import { supabase } from '../database/supabase';
import crypto from 'crypto';

export class StorageService {
  /**
   * Uploads a file buffer to Supabase Storage
   * @param bucket Bucket name (invoices, category-icons)
   * @param folder Folder path within the bucket
   * @param file Express file object from multer
   * @returns Public URL of the uploaded file
   */
  static async uploadFile(
    bucket: string,
    folder: string,
    file: any
  ): Promise<string> {
    const fileExt = file.originalname.split('.').pop();
    const randomId = crypto.randomUUID();
    const fileName = `${folder}/${randomId}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error('Supabase Storage Error:', error);
      throw new Error(`Failed to upload file to ${bucket}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  }
}
