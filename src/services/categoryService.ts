import { apiClient } from './apiClient';

export interface CategoryItem {
  categoryId: number;
  parentId: number | null;
  parentName?: string;
  name: string;
  slug: string;
  description: string;
  iconUrl?: string;
  isVisible: boolean;
  productCount: number;
  children?: CategoryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryPayload {
  parentId?: number | null;
  name: string;
  slug?: string;
  description?: string;
  iconUrl?: string;
  iconUploadId?: string;
  isVisible?: boolean;
}

export interface PresignedUploadItem {
  uploadId: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
  expiresAtEpochMs?: number;
  expiresInSeconds?: number;
  requiredHeaders?: Record<string, string>;
}

export interface StorageFileResponse {
  uploadId: string;
  objectKey: string;
  canonicalUrl?: string;
  accessUrl?: string;
  imageUrl?: string;
  brandId?: number;
  categoryId?: number;
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

export const categoryService = {
  // API 3.1: Lấy cây danh mục phân cấp cha/con (Public/Admin)
  async getCategories(includeHidden = true): Promise<ApiResponse<CategoryItem[]>> {
    const res = await apiClient.get<ApiResponse<CategoryItem[]>>('/categories', {
      params: { includeHidden },
    });
    return res.data;
  },

  // API 3.2: Chi tiết 1 danh mục sản phẩm (Public/Admin)
  async getCategoryById(id: number): Promise<ApiResponse<CategoryItem>> {
    const res = await apiClient.get<ApiResponse<CategoryItem>>(`/categories/${id}`);
    return res.data;
  },

  // API 3.3: Tạo mới danh mục sản phẩm (STAFF / ADMIN)
  async createCategory(payload: CategoryPayload): Promise<ApiResponse<CategoryItem>> {
    const res = await apiClient.post<ApiResponse<CategoryItem>>('/admin/categories', payload);
    return res.data;
  },

  // API 3.4: Cập nhật thông tin danh mục (STAFF / ADMIN)
  async updateCategory(id: number, payload: CategoryPayload): Promise<ApiResponse<CategoryItem>> {
    const res = await apiClient.put<ApiResponse<CategoryItem>>(`/admin/categories/${id}`, payload);
    return res.data;
  },

  // API 3.5: Xóa danh mục (duy nhất ADMIN)
  async deleteCategory(id: number): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(`/admin/categories/${id}`);
    return res.data;
  },

  // API Xóa riêng icon danh mục (STAFF / ADMIN)
  async deleteCategoryIcon(id: number): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(`/admin/categories/${id}/icon`);
    return res.data;
  },

  // Storage API 1: Tạo liên kết Presigned URL tải ảnh trực tiếp lên MinIO
  async createPresignedUrls(payload: {
    storageType: 'CATEGORIES';
    categoryId?: number;
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
