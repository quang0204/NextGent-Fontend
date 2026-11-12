import { apiClient } from './apiClient';

export interface PresignedUploadFileItem {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface PresignedUploadRequest {
  productId?: number;
  storageType?: 'PRODUCT';
  files: PresignedUploadFileItem[];
}

export interface PresignedUploadItemResponse {
  uploadId: string;
  uploadUrl: string;
  bucket: string;
  objectKey: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  expiresAt: number;
  expiresInSeconds: number;
  requiredHeaders?: Record<string, string>;
}

export interface ConfirmUploadRequest {
  uploadId: string;
  objectKey: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface StorageFileResponse {
  uploadId: string;
  imageId?: number | null;
  productId?: number | null;
  imageUrl: string;
  bucket: string;
  objectKey: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  etag?: string;
  isPrimary?: boolean;
  sortOrder?: number | null;
  status: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const resolveImageContentType = (file: File): string => {
  const raw = (file.type || '').trim().toLowerCase();
  if (raw === 'image/jpg') return 'image/jpeg';
  if (ALLOWED_MIME_TYPES.has(raw)) return raw;

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return raw;
};

export const storageService = {
  /**
   * Upload ảnh từ máy tính lên MinIO theo đúng quy trình 3 bước của Backend:
   * 1. POST /api/v1/storage/presigned-urls
   * 2. PUT binary file trực tiếp lên MinIO bằng uploadUrl
   * 3. POST /api/v1/storage/confirm
   */
  async uploadImageToMinio(
    file: File,
    options?: { productId?: number; isPrimary?: boolean; sortOrder?: number }
  ): Promise<StorageFileResponse> {
    const contentType = resolveImageContentType(file);
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      throw new Error('Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF.');
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Kích thước ảnh vượt quá giới hạn tối đa 5MB.');
    }

    const presignedRes = await apiClient.post<{ data?: PresignedUploadItemResponse[] }>(
      '/storage/presigned-urls',
      {
        ...(options?.productId !== undefined ? { productId: options.productId } : {}),
        storageType: 'PRODUCT',
        files: [
          {
            fileName: file.name,
            contentType,
            fileSize: file.size,
          },
        ],
      } satisfies PresignedUploadRequest
    );

    const presignedItem = presignedRes.data?.data?.[0];
    if (!presignedItem?.uploadUrl || !presignedItem?.uploadId || !presignedItem?.objectKey) {
      throw new Error('Không nhận được liên kết tải ảnh từ hệ thống.');
    }

    const putResponse = await fetch(presignedItem.uploadUrl, {
      method: 'PUT',
      headers: presignedItem.requiredHeaders || { 'Content-Type': contentType },
      body: file,
    });

    if (!putResponse.ok) {
      throw new Error(`Upload file lên MinIO thất bại (HTTP ${putResponse.status}).`);
    }

    const confirmRes = await apiClient.post<{ data?: StorageFileResponse }>('/storage/confirm', {
      uploadId: presignedItem.uploadId,
      objectKey: presignedItem.objectKey,
      ...(options?.isPrimary !== undefined ? { isPrimary: options.isPrimary } : {}),
      ...(options?.sortOrder !== undefined ? { sortOrder: options.sortOrder } : {}),
    } satisfies ConfirmUploadRequest);

    const confirmed = confirmRes.data?.data;
    if (!confirmed?.imageUrl) {
      throw new Error('Xác nhận ảnh trên MinIO không trả về đường dẫn ảnh.');
    }

    return confirmed;
  },

  async deleteProductImage(productId: number, imageId: number): Promise<void> {
    await apiClient.delete(`/admin/products/${productId}/images/${imageId}`);
  },
};
