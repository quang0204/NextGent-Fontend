import { apiClient } from './apiClient';

export interface BrandItem {
  brandId: number;
  name: string;
  slug: string;
  logoUrl?: string;
  description: string;
  isVisible: boolean;
  totalProducts: number;
}

export interface BrandPayload {
  name: string;
  slug?: string;
  logoUrl?: string;
  logoUploadId?: string;
  description?: string;
  isVisible?: boolean;
}

export interface PresignedUploadItem {
  uploadId: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface StorageFileResponse {
  uploadId: string;
  objectKey: string;
  canonicalUrl: string;
  accessUrl: string;
  brandId?: number;
  status: string;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  error?: string;
  timestamp?: string;
}

export const brandService = {
  // API 3.6: Danh sách thương hiệu đối tác (Public/Admin)
  async getBrands(includeHidden = true): Promise<ApiResponse<BrandItem[]>> {
    const res = await apiClient.get<ApiResponse<BrandItem[]>>('/brands', {
      params: { includeHidden },
    });
    return res.data;
  },

  // API 3.7: Chi tiết thương hiệu (Public/Admin)
  async getBrandById(id: number): Promise<ApiResponse<BrandItem>> {
    const res = await apiClient.get<ApiResponse<BrandItem>>(`/brands/${id}`);
    return res.data;
  },

  // API 3.8: Thêm mới thương hiệu (STAFF / ADMIN)
  async createBrand(payload: BrandPayload): Promise<ApiResponse<BrandItem>> {
    const res = await apiClient.post<ApiResponse<BrandItem>>('/admin/brands', payload);
    return res.data;
  },

  // API 3.9: Cập nhật thương hiệu (STAFF / ADMIN)
  async updateBrand(id: number, payload: BrandPayload): Promise<ApiResponse<BrandItem>> {
    const res = await apiClient.put<ApiResponse<BrandItem>>(`/admin/brands/${id}`, payload);
    return res.data;
  },

  // API 3.10: Xóa thương hiệu (duy nhất ADMIN)
  async deleteBrand(id: number): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(`/admin/brands/${id}`);
    return res.data;
  },

  // API Xóa riêng logo thương hiệu (STAFF / ADMIN)
  async deleteBrandLogo(id: number): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(`/admin/brands/${id}/logo`);
    return res.data;
  },

  // Storage API 1: Tạo liên kết Presigned URL tải ảnh trực tiếp lên MinIO
  async createPresignedUrls(payload: {
    storageType: 'BRANDS';
    brandId?: number;
    files: Array<{ fileName: string; contentType: string; fileSize: number }>;
  }): Promise<ApiResponse<PresignedUploadItem[]>> {
    const res = await apiClient.post<ApiResponse<PresignedUploadItem[]>>('/storage/presigned-urls', payload);
    return res.data;
  },

  // Storage API 2: Tải dữ liệu nhị phân trực tiếp lên MinIO bằng HTTP PUT
  async uploadBinaryToMinio(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    if (!response.ok) {
      throw new Error(`Tải lên MinIO thất bại (HTTP ${response.status})`);
    }
  },

  // Storage API 3: Xác nhận tải lên hoàn tất và kiểm tra magic bytes
  async confirmUpload(payload: { uploadId: string; objectKey: string }): Promise<ApiResponse<StorageFileResponse>> {
    const res = await apiClient.post<ApiResponse<StorageFileResponse>>('/storage/confirm', payload);
    return res.data;
  },
};
