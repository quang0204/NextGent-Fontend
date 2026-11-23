import { apiClient } from './apiClient';
import { ApiResponse } from '../types/auth';
import {
  UserProfile,
  UserAddress,
  UpdateProfileRequest,
  UpdateProfileOtpData,
  UpdateProfileConfirmRequest,
  AddressRequest,
  AdminUsersPageData,
  AdminUserDetail,
  AdminUserStats,
  CreateInternalUserRequest,
  UpdateUserStatusRequest,
  UpdateUserRoleRequest,
} from '../types/user';

/**
 * Service tích hợp toàn diện Nhóm API Người dùng & Sổ địa chỉ & Quản trị Admin
 * Base URL: http://localhost:8080/nextgen/api/v1 (hoặc qua VITE_API_BASE_URL)
 */
export const userService = {
  // ==========================================================================
  // PHẦN 1: API NGƯỜI DÙNG CÁ NHÂN (/users)
  // ==========================================================================

  /**
   * API 2.1: GET /api/v1/users/profile
   * Khách hàng đã đăng nhập xem hồ sơ cá nhân của chính mình
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await apiClient.get<ApiResponse<UserProfile>>('/users/profile');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message || 'Không thể tải thông tin hồ sơ cá nhân.',
      };
    }
  },

  /**
   * API 2.2 Bước 1: POST /api/v1/users/profile/update-request
   * Gửi thông tin mới (fullName, phone, email); sinh OTP 6 số gửi về Email
   */
  async requestUpdateProfile(payload: UpdateProfileRequest): Promise<ApiResponse<UpdateProfileOtpData>> {
    try {
      const response = await apiClient.post<ApiResponse<UpdateProfileOtpData>>(
        '/users/profile/update-request',
        payload
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message || 'Không thể gửi yêu cầu cập nhật thông tin cá nhân.',
      };
    }
  },

  /**
   * API 2.2 Bước 2: POST /api/v1/users/profile/update-confirm
   * Xác nhận OTP và lưu thông tin vào DB
   */
  async confirmUpdateProfile(payload: UpdateProfileConfirmRequest): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await apiClient.post<ApiResponse<UserProfile>>(
        '/users/profile/update-confirm',
        payload
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 400,
        message: error.message || 'Mã xác thực OTP không chính xác hoặc đã hết hạn.',
      };
    }
  },

  /**
   * API 2.2 Bước 3: POST /api/v1/users/profile/resend-otp
   * Gửi lại mã OTP sau cooldown 60s
   */
  async resendUpdateProfileOtp(otpSessionToken: string): Promise<ApiResponse<UpdateProfileOtpData>> {
    try {
      const response = await apiClient.post<ApiResponse<UpdateProfileOtpData>>(
        '/users/profile/resend-otp',
        { otpSessionToken }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 429,
        message: error.message || 'Chưa hết thời gian chờ gửi lại mã OTP.',
      };
    }
  },

  // ==========================================================================
  // SỔ ĐỊA CHỈ GIAO HÀNG (/users/addresses)
  // ==========================================================================

  /**
   * API 2.3: GET /api/v1/users/addresses
   * Lấy danh sách địa chỉ nhận hàng của user
   */
  async getAddresses(): Promise<ApiResponse<UserAddress[]>> {
    try {
      const response = await apiClient.get<ApiResponse<UserAddress[]>>('/users/addresses');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message || 'Không thể tải sổ địa chỉ nhận hàng.',
      };
    }
  },

  /**
   * API 2.4: POST /api/v1/users/addresses
   * Thêm mới 1 địa chỉ giao hàng (tối đa 10 địa chỉ)
   */
  async addAddress(payload: AddressRequest): Promise<ApiResponse<UserAddress>> {
    try {
      const response = await apiClient.post<ApiResponse<UserAddress>>('/users/addresses', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 400,
        message: error.message || 'Không thể thêm địa chỉ nhận hàng mới.',
      };
    }
  },

  /**
   * API 2.5: PUT /api/v1/users/addresses/{addressId}
   * Sửa thông tin địa chỉ giao hàng
   */
  async updateAddress(addressId: number, payload: AddressRequest): Promise<ApiResponse<UserAddress>> {
    try {
      const response = await apiClient.put<ApiResponse<UserAddress>>(
        `/users/addresses/${addressId}`,
        payload
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 400,
        message: error.message || 'Không thể cập nhật địa chỉ giao hàng.',
      };
    }
  },

  /**
   * API 2.6: PATCH /api/v1/users/addresses/{addressId}/default
   * Đặt địa chỉ làm mặc định
   */
  async setDefaultAddress(addressId: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.patch<ApiResponse<any>>(
        `/users/addresses/${addressId}/default`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 400,
        message: error.message || 'Không thể đặt địa chỉ làm mặc định.',
      };
    }
  },

  /**
   * API 2.7: DELETE /api/v1/users/addresses/{addressId}
   * Xóa địa chỉ khỏi sổ địa chỉ
   */
  async deleteAddress(addressId: number): Promise<ApiResponse<{ deletedAddressId: number }>> {
    try {
      const response = await apiClient.delete<ApiResponse<{ deletedAddressId: number }>>(
        `/users/addresses/${addressId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 400,
        message: error.message || 'Không thể xóa địa chỉ nhận hàng.',
      };
    }
  },

  // ==========================================================================
  // PHẦN 2: API QUẢN TRỊ NGƯỜI DÙNG DÀNH CHO ADMIN (/admin/users)
  // ==========================================================================

  /**
   * API 2.8: GET /api/v1/admin/users
   * Quản lý danh sách người dùng (Tìm kiếm, phân trang, lọc RBAC)
   */
  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
  }): Promise<ApiResponse<AdminUsersPageData>> {
    try {
      const queryParams: Record<string, any> = {};
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;
      if (params?.search) queryParams.search = params.search;
      if (params?.role && params.role !== 'ALL') queryParams.role = params.role;
      if (params?.status && params.status !== 'ALL') queryParams.status = params.status;
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      if (params?.sortDir) queryParams.sortDir = params.sortDir;

      const response = await apiClient.get<ApiResponse<AdminUsersPageData>>('/admin/users', {
        params: queryParams,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message || 'Không thể tải danh sách người dùng từ hệ thống quản trị.',
      };
    }
  },

  /**
   * API 2.9: GET /api/v1/admin/users/{userId}
   * Xem hồ sơ toàn diện của một tài khoản (360° Profile)
   */
  async getAdminUserDetail(userId: number): Promise<ApiResponse<AdminUserDetail>> {
    try {
      const response = await apiClient.get<ApiResponse<AdminUserDetail>>(`/admin/users/${userId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message || 'Không thể tải hồ sơ chi tiết người dùng.',
      };
    }
  },

  /**
   * API 2.10: POST /api/v1/admin/users/internal
   * Admin cấp tài khoản nội bộ trực tiếp cho STAFF hoặc ADMIN
   */
  async createInternalUser(payload: CreateInternalUserRequest): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await apiClient.post<ApiResponse<UserProfile>>(
        '/admin/users/internal',
        payload
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 400,
        message: error.message || 'Không thể cấp tài khoản nội bộ mới.',
      };
    }
  },

  /**
   * API 2.11: PATCH /api/v1/admin/users/{userId}/status
   * Khóa / Mở khóa tài khoản người dùng
   */
  async updateUserStatus(
    userId: number,
    payload: UpdateUserStatusRequest
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.patch<ApiResponse<any>>(
        `/admin/users/${userId}/status`,
        payload
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 400,
        message: error.message || 'Không thể cập nhật trạng thái tài khoản.',
      };
    }
  },

  /**
   * API 2.12: PATCH /api/v1/admin/users/{userId}/role
   * Thay đổi phân quyền RBAC của tài khoản
   */
  async updateUserRole(
    userId: number,
    payload: UpdateUserRoleRequest
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.patch<ApiResponse<any>>(
        `/admin/users/${userId}/role`,
        payload
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 400,
        message: error.message || 'Không thể thay đổi phân quyền tài khoản.',
      };
    }
  },

  /**
   * API 2.13: GET /api/v1/admin/users/stats
   * Thống kê tổng số lượng tài khoản theo vai trò và trạng thái
   */
  async getAdminUserStats(): Promise<ApiResponse<AdminUserStats>> {
    try {
      const response = await apiClient.get<ApiResponse<AdminUserStats>>('/admin/users/stats');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message || 'Không thể tải thống kê người dùng.',
      };
    }
  },
};
