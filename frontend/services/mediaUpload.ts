/**
 * Media Upload Service
 * Uploads media files to the Django backend via the /api/v1/media/upload/ endpoint.
 * Replaces the previous Firebase Storage implementation.
 */

import { mediaApi } from '@/services/api';

export interface MediaUploadOptions {
  uri: string;
  type: 'image' | 'video' | 'file';
  category: 'profile' | 'course-cover' | 'lesson-video' | 'course-file' | 'announcement';
  userId?: string;
  relatedId?: string;
}

export const uploadMediaFile = async (options: MediaUploadOptions): Promise<string> => {
  try {
    const { uri, type, category } = options;

    // Determine file extension and MIME type
    const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const mimeType = mimeTypes[extension] || (type === 'video' ? 'video/mp4' : type === 'image' ? 'image/jpeg' : 'application/octet-stream');

    const fileName = `${category}_${Date.now()}.${extension}`;

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: fileName,
      type: mimeType,
    } as any);
    formData.append('category', category);
    formData.append('type', type);

    const { data } = await mediaApi.upload(formData);

    // Return the URL of the uploaded file
    return data.url || data.file_url || data.file || '';
  } catch (error) {
    console.error('Media upload error:', error);
    throw error;
  }
};
