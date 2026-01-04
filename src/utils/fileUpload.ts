import { supabase, storageConfig, isStorageConfigured, STORAGE_FOLDER_PREFIX } from '../config/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  path: string;
  originalName: string;
  size: number;
  mimetype: string;
}

class FileUploadService {
  private maxFileSize: number;
  private allowedImageTypes: string[];
  private allowedFileTypes: string[];

  constructor() {
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
    this.allowedImageTypes = (
      process.env.ALLOWED_IMAGE_TYPES ||
      'image/jpeg,image/jpg,image/png,image/webp'
    ).split(',');
    this.allowedFileTypes = (
      process.env.ALLOWED_FILE_TYPES ||
      'image/jpeg,image/jpg,image/png,image/webp,application/pdf'
    ).split(',');
  }

  /**
   * Check if Supabase storage is configured
   */
  private checkStorageConfig(): void {
    if (!isStorageConfigured) {
      throw new Error(
        'Supabase storage is not configured. Please check your environment variables.'
      );
    }
  }

  /**
   * Validate file type and size
   */
  validateFile(file: UploadedFile, allowedTypes?: string[]): boolean {
    if (!file) {
      throw new Error('No file provided');
    }

    const types = allowedTypes || this.allowedFileTypes;
    if (!types.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${types.join(', ')}`);
    }

    if (file.size > this.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
      );
    }

    return true;
  }

  /**
   * Validate signature file (no size limit)
   */
  validateSignatureFile(file: UploadedFile): boolean {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Only image files are allowed for signatures');
    }

    return true;
  }

  /**
   * Generate storage path
   */
  private generateStoragePath(originalName: string, folder = 'uploads'): string {
    const ext = path.extname(originalName);
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const filename = `${uniqueId}-${timestamp}${ext}`;

    return `${STORAGE_FOLDER_PREFIX}/${folder}/${filename}`;
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(file: UploadedFile, folder = 'uploads'): Promise<UploadResult> {
    try {
      // Check storage configuration
      this.checkStorageConfig();

      // Validate file
      this.validateFile(file);

      // Generate storage path
      const filePath = this.generateStoragePath(file.originalname, folder);

      // Upload to Supabase Storage
      const { data, error } = await supabase!.storage
        .from(storageConfig.bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // Generate public URL
      const url = `${storageConfig.baseUrl}/${filePath}`;

      console.log(`✅ File uploaded to Supabase: ${filePath}`);

      return {
        key: filePath,
        url,
        bucket: storageConfig.bucket,
        path: data.path,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload file: ${(error as Error).message}`);
    }
  }

  /**
   * Upload signature file (no size limit)
   */
  async uploadSignature(file: UploadedFile, folder = 'signatures'): Promise<UploadResult> {
    try {
      // Check storage configuration
      this.checkStorageConfig();

      // Validate signature file (no size limit)
      this.validateSignatureFile(file);

      // Generate storage path
      const filePath = this.generateStoragePath(file.originalname, folder);

      // Upload to Supabase Storage
      const { data, error } = await supabase!.storage
        .from(storageConfig.bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // Generate public URL
      const url = `${storageConfig.baseUrl}/${filePath}`;

      console.log(`✅ Signature uploaded to Supabase: ${filePath}`);

      return {
        key: filePath,
        url,
        bucket: storageConfig.bucket,
        path: data.path,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error('Supabase signature upload error:', error);
      throw new Error(`Failed to upload signature: ${(error as Error).message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(files: UploadedFile[], folder = 'uploads'): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return await Promise.all(uploadPromises);
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; message: string; key: string }> {
    try {
      this.checkStorageConfig();

      const { error } = await supabase!.storage
        .from(storageConfig.bucket)
        .remove([filePath]);

      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }

      console.log(`✅ File deleted from Supabase: ${filePath}`);

      return {
        success: true,
        message: 'File deleted successfully',
        key: filePath,
      };
    } catch (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(filePaths: string[]): Promise<{ success: boolean; deleted: any[]; errors: any[] }> {
    try {
      this.checkStorageConfig();

      const { data, error } = await supabase!.storage
        .from(storageConfig.bucket)
        .remove(filePaths);

      if (error) {
        throw new Error(`Supabase bulk delete error: ${error.message}`);
      }

      console.log(`✅ ${data?.length || 0} files deleted from Supabase`);

      return {
        success: true,
        deleted: data || [],
        errors: [],
      };
    } catch (error) {
      console.error('Supabase bulk delete error:', error);
      throw new Error(`Failed to delete files: ${(error as Error).message}`);
    }
  }

  /**
   * Get file URL
   */
  getFileUrl(filePath: string): string | null {
    if (!filePath) return null;
    return `${storageConfig.baseUrl}/${filePath}`;
  }

  /**
   * Upload PDF buffer to Supabase Storage
   */
  async uploadPDFBuffer(pdfBuffer: Buffer, fileName: string, folder = 'pdfs'): Promise<UploadResult> {
    try {
      this.checkStorageConfig();

      const filePath = this.generateStoragePath(fileName, folder);

      const { data, error } = await supabase!.storage
        .from(storageConfig.bucket)
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (error) {
        throw new Error(`Supabase PDF upload error: ${error.message}`);
      }

      const url = `${storageConfig.baseUrl}/${filePath}`;

      console.log(`✅ PDF uploaded to Supabase: ${filePath}`);

      return {
        key: filePath,
        url,
        bucket: storageConfig.bucket,
        path: data.path,
        originalName: fileName,
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
      };
    } catch (error) {
      console.error('Supabase PDF upload error:', error);
      throw new Error(`Failed to upload PDF: ${(error as Error).message}`);
    }
  }
}

export default new FileUploadService();
