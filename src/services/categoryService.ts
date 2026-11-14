import { apiClient } from './apiClient';

export interface CategoryItem {
  categoryId: number;
  parentId: number | null;
  parentName?: string;
  name: string;
  slug: string;
  description: string;
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
  isVisible?: boolean;
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
};
