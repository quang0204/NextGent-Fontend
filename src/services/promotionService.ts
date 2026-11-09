import { apiClient } from './apiClient';
import { PortalPromotion, PortalVoucher, PromotionStatus, PortalPromotionVariant } from '../types/portal';
import { sharedStore } from './sharedStore';

export interface ActivePromoVariant {
  promoVariantId: number;
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  color: string;
  romGb: number;
  listPrice: number;
  promoPrice: number;
  discountPercent: number;
  availableQty: number;
}

export interface ActivePromotion {
  promotionId: number;
  name: string;
  description?: string;
  startAt: string;
  endAt: string;
  status: 'ACTIVE' | string;
  variants: ActivePromoVariant[];
}

export interface AdminPromotionItem {
  promotionId: number;
  name: string;
  description?: string;
  startAt: string;
  endAt: string;
  status: PromotionStatus;
  appliedVariantsCount: number;
  createdBy: string;
  createdAt: string;
  variants?: PortalPromotionVariant[];
}

export interface AdminPromotionsPageResponse {
  content: AdminPromotionItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface CreatePromotionPayload {
  name: string;
  description?: string;
  startAt: string;
  endAt: string;
  status: PromotionStatus;
  variants: {
    variantId: number;
    promoPrice: number;
  }[];
}

export interface ValidVoucherItem {
  voucherId: number;
  code: string;
  discountType: 'FIXED' | 'PERCENT' | 'FIXED_AMOUNT' | 'PERCENTAGE' | string;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  usageLimit: number;
  usedCount: number;
  remainingCount: number;
  expiredAt: string;
}

export interface ApplyVoucherResponse {
  voucherId: number;
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  originalSubtotal: number;
  finalSubtotal: number;
}

export interface AdminVoucherItem {
  voucherId: number;
  code: string;
  discountType: 'FIXED' | 'PERCENT' | 'FIXED_AMOUNT' | 'PERCENTAGE' | string;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderValue: number;
  usageLimit: number;
  usedCount: number;
  startAt?: string;
  expiredAt: string;
  isActive: boolean;
}

export interface AdminVouchersPageResponse {
  content: AdminVoucherItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface CreateVoucherPayload {
  code: string;
  discountType: 'FIXED' | 'PERCENT' | string;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderValue: number;
  usageLimit: number;
  startAt?: string;
  expiredAt: string;
  isActive?: boolean;
}

export const promotionService = {
  /**
   * API 6.1: GET /api/v1/promotions/active
   * Danh sách Flash Sale đang diễn ra (Client - Public)
   */
  async getActivePromotions(): Promise<ActivePromotion[]> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: ActivePromotion[];
      }>('/promotions/active');

      if (res.data?.data) {
        return res.data.data;
      }
    } catch (error) {
      console.warn('[promotionService.getActivePromotions] Backend offline or failed, fallback to sharedStore', error);
    }

    // Fallback: Lấy từ sharedStore
    const localActive = sharedStore.getPromotions().filter((p) => p.status === 'ACTIVE');
    return localActive.map((p) => ({
      promotionId: p.promotionId,
      name: p.name,
      description: p.description,
      startAt: p.startAt,
      endAt: p.endAt,
      status: p.status,
      variants: p.variants.map((v) => ({
        promoVariantId: v.promoVariantId,
        variantId: v.variantId,
        productId: v.productId,
        productName: v.productName,
        sku: v.sku,
        color: v.color,
        romGb: v.romGb,
        listPrice: v.listPrice,
        promoPrice: v.promoPrice,
        discountPercent: v.listPrice > 0 ? Math.round(((v.listPrice - v.promoPrice) / v.listPrice) * 100) : 0,
        availableQty: 20,
      })),
    }));
  },

  /**
   * API 6.2: GET /api/v1/admin/promotions
   * Danh sách quản trị chiến dịch khuyến mãi (Portal - STAFF / ADMIN)
   */
  async getAdminPromotions(params?: {
    page?: number;
    size?: number;
    status?: string;
  }): Promise<AdminPromotionsPageResponse> {
    const page = params?.page || 1;
    const size = params?.size || 10;
    const status = params?.status || 'ALL';

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: AdminPromotionsPageResponse;
      }>('/admin/promotions', {
        params: { page, size, status },
      });

      if (res.data?.data?.content) {
        return res.data.data;
      }
    } catch (error) {
      console.warn('[promotionService.getAdminPromotions] Backend failed or offline, fallback to sharedStore', error);
    }

    const all = sharedStore.getPromotions();
    const filtered = all.filter((p) => (status === 'ALL' ? true : p.status === status));
    const start = (page - 1) * size;
    const paginated = filtered.slice(start, start + size).map((p) => ({
      promotionId: p.promotionId,
      name: p.name,
      description: p.description,
      startAt: p.startAt,
      endAt: p.endAt,
      status: p.status,
      appliedVariantsCount: p.variants.length,
      createdBy: p.createdBy || 'Admin',
      createdAt: p.createdAt || new Date().toISOString(),
      variants: p.variants,
    }));

    return {
      content: paginated,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size) || 1,
      hasNext: page * size < filtered.length,
    };
  },

  /**
   * API 6.3: POST /api/v1/admin/promotions
   * Tạo mới chiến dịch Flash Sale (Portal - STAFF / ADMIN)
   */
  async createPromotion(payload: CreatePromotionPayload): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/admin/promotions', payload);

      if (res.data?.data) {
        return {
          success: true,
          message: res.data.message || 'Tạo mới chiến dịch khuyến mãi thành công!',
          data: res.data.data,
        };
      }
    } catch (error: any) {
      console.warn('[promotionService.createPromotion] Backend failed, fallback to sharedStore', error);
      if (error.response?.data?.message) {
        return {
          success: false,
          message: error.response.data.message,
        };
      }
    }

    // Fallback: Lưu vào sharedStore
    const products = sharedStore.getProducts();
    const variants: PortalPromotionVariant[] = [];
    payload.variants.forEach((v) => {
      for (const p of products) {
        const found = p.variants.find((item) => item.variantId === v.variantId);
        if (found) {
          variants.push({
            promoVariantId: Date.now() + Math.floor(Math.random() * 1000),
            promotionId: 0,
            variantId: found.variantId,
            productId: p.productId,
            productName: p.name,
            sku: found.sku,
            color: found.color,
            romGb: found.romGb,
            listPrice: found.listPrice || 30000000,
            promoPrice: v.promoPrice,
          });
          break;
        }
      }
    });

    const newPromo = sharedStore.addPromotion({
      name: payload.name,
      description: payload.description,
      startAt: payload.startAt,
      endAt: payload.endAt,
      status: payload.status,
      createdBy: 'Nguyễn Văn Admin (ADMIN)',
      variants,
    });

    return {
      success: true,
      message: 'Tạo mới chiến dịch khuyến mãi thành công!',
      data: newPromo,
    };
  },

  /**
   * API 6.4: PUT /api/v1/admin/promotions/{id}/status
   * Cập nhật trạng thái chiến dịch khuyến mãi (Portal - STAFF / ADMIN)
   */
  async updatePromotionStatus(
    id: number,
    status: PromotionStatus,
    reason?: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const res = await apiClient.put<{
        success: boolean;
        message: string;
        data: any;
      }>(`/admin/promotions/${id}/status`, {
        status,
        reason: reason || `Cập nhật trạng thái chiến dịch sang ${status}`,
      });

      return {
        success: res.data?.success ?? true,
        message: res.data?.message || 'Cập nhật trạng thái chiến dịch khuyến mãi thành công!',
        data: res.data?.data,
      };
    } catch (error: any) {
      console.warn(`[promotionService.updatePromotionStatus] Backend failed for promo ${id}, fallback to sharedStore`, error);
      sharedStore.togglePromotionStatus(id);
      return {
        success: true,
        message: 'Đã cập nhật trạng thái chiến dịch.',
      };
    }
  },

  /**
   * API 6.5: GET /api/v1/vouchers/valid
   * Danh sách mã giảm giá còn hiệu lực (Client - Public / Auth)
   */
  async getValidVouchers(minOrderValue?: number): Promise<ValidVoucherItem[]> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: ValidVoucherItem[];
      }>('/vouchers/valid', {
        params: minOrderValue ? { minOrderValue } : undefined,
      });

      if (res.data?.data) {
        return res.data.data;
      }
    } catch (error) {
      console.warn('[promotionService.getValidVouchers] Backend failed or offline, fallback to sharedStore', error);
    }

    const localVouchers = sharedStore.getVouchers().filter((v) => v.isActive);
    return localVouchers.map((v) => ({
      voucherId: v.voucherId,
      code: v.code,
      discountType: v.discountType,
      discountValue: v.discountValue,
      maxDiscount: v.maxDiscount || null,
      minOrderValue: v.minOrderValue,
      usageLimit: v.usageLimit,
      usedCount: v.usedCount,
      remainingCount: Math.max(0, v.usageLimit - v.usedCount),
      expiredAt: v.expiredAt,
    }));
  },

  /**
   * API 6.6: POST /api/v1/vouchers/apply
   * Kiểm tra hợp lệ & tính mức giảm voucher (Client - Authenticated)
   */
  async applyVoucher(code: string, subtotal: number): Promise<{
    success: boolean;
    message: string;
    data?: ApplyVoucherResponse;
  }> {
    const cleanCode = code.trim().toUpperCase();

    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: ApplyVoucherResponse;
      }>('/vouchers/apply', {
        code: cleanCode,
        subtotal,
      });

      if (res.data?.data) {
        return {
          success: true,
          message: res.data.message || 'Áp dụng mã giảm giá thành công!',
          data: res.data.data,
        };
      }
    } catch (error: any) {
      console.warn('[promotionService.applyVoucher] Backend call failed, fallback to local formula calculation', error);
      if (error.response?.data?.message) {
        return {
          success: false,
          message: error.response.data.message,
        };
      }
    }

    // Fallback: Tính toán theo công thức chuẩn của đề bài
    const vouchers = sharedStore.getVouchers();
    const v = vouchers.find((vc) => vc.code === cleanCode);

    if (!v) {
      return { success: false, message: 'Mã voucher không tồn tại trong hệ thống!' };
    }
    if (!v.isActive) {
      return { success: false, message: 'Mã voucher này hiện đang tạm khóa hoặc chưa kích hoạt!' };
    }
    if (v.usedCount >= v.usageLimit) {
      return { success: false, message: 'Mã voucher này đã hết lượt sử dụng!' };
    }
    if (subtotal < v.minOrderValue) {
      return {
        success: false,
        message: `Đơn hàng tối thiểu để áp dụng mã này là ${v.minOrderValue.toLocaleString('vi-VN')} đ!`,
      };
    }

    let discount = 0;
    const isPercent = v.discountType === 'PERCENT' || (v.discountType as any) === 'PERCENTAGE';
    if (isPercent) {
      discount = Math.round((subtotal * v.discountValue) / 100);
      if (v.maxDiscount) {
        discount = Math.min(discount, v.maxDiscount);
      }
    } else {
      discount = Math.min(v.discountValue, subtotal);
    }

    return {
      success: true,
      message: 'Áp dụng mã giảm giá thành công!',
      data: {
        voucherId: v.voucherId,
        code: v.code,
        discountType: v.discountType,
        discountValue: v.discountValue,
        discountAmount: discount,
        originalSubtotal: subtotal,
        finalSubtotal: Math.max(0, subtotal - discount),
      },
    };
  },

  /**
   * API 6.7: GET /api/v1/admin/vouchers
   * Quản trị danh sách mã giảm giá (Portal - STAFF / ADMIN)
   */
  async getAdminVouchers(params?: {
    page?: number;
    size?: number;
    keyword?: string;
    status?: string;
  }): Promise<AdminVouchersPageResponse> {
    const page = params?.page || 1;
    const size = params?.size || 10;
    const keyword = params?.keyword || undefined;
    const status = params?.status || 'ALL';

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: AdminVouchersPageResponse;
      }>('/admin/vouchers', {
        params: {
          page,
          size,
          ...(keyword ? { keyword } : {}),
          status,
        },
      });

      if (res.data?.data?.content) {
        return res.data.data;
      }
    } catch (error) {
      console.warn('[promotionService.getAdminVouchers] Backend failed or offline, fallback to sharedStore', error);
    }

    const all = sharedStore.getVouchers();
    const filtered = all.filter((v) => {
      const matchKeyword = !keyword || v.code.toLowerCase().includes(keyword.toLowerCase());
      const matchStatus =
        status === 'ALL'
          ? true
          : status === 'ACTIVE'
          ? v.isActive
          : status === 'INACTIVE'
          ? !v.isActive
          : true;
      return matchKeyword && matchStatus;
    });

    const start = (page - 1) * size;
    return {
      content: filtered.slice(start, start + size),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size) || 1,
      hasNext: page * size < filtered.length,
    };
  },

  /**
   * API 6.8: POST /api/v1/admin/vouchers
   * Khởi tạo mã Voucher mới (Portal - STAFF / ADMIN)
   */
  async createVoucher(payload: CreateVoucherPayload): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/admin/vouchers', payload);

      if (res.data?.data) {
        // Sync to sharedStore
        const d = res.data.data;
        const newV: PortalVoucher = {
          voucherId: d.voucherId || Date.now(),
          code: d.code,
          discountType: payload.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED',
          discountValue: payload.discountValue,
          maxDiscount: payload.maxDiscount || undefined,
          minOrderValue: payload.minOrderValue,
          usageLimit: payload.usageLimit,
          usedCount: d.usedCount || 0,
          startAt: payload.startAt || new Date().toISOString().split('T')[0],
          expiredAt: payload.expiredAt,
          isActive: payload.isActive ?? true,
        };
        const all = sharedStore.getVouchers();
        const updated = [newV, ...all];
        localStorage.setItem('np_vouchers_v2', JSON.stringify(updated));

        return {
          success: true,
          message: res.data.message || 'Khởi tạo mã Voucher thành công!',
          data: d,
        };
      }
    } catch (error: any) {
      console.warn('[promotionService.createVoucher] Backend failed, fallback to local store', error);
      if (error.response?.data?.message) {
        return {
          success: false,
          message: error.response.data.message,
        };
      }
    }

    // Fallback: Local save
    const cleanCode = payload.code.trim().toUpperCase();
    const all = sharedStore.getVouchers();
    if (all.some((v) => v.code === cleanCode)) {
      return {
        success: false,
        message: `Mã Voucher "${cleanCode}" đã tồn tại trên hệ thống! Vui lòng chọn mã khác.`,
      };
    }

    const newV: PortalVoucher = {
      voucherId: Date.now(),
      code: cleanCode,
      discountType: payload.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED',
      discountValue: payload.discountValue,
      maxDiscount: payload.maxDiscount || undefined,
      minOrderValue: payload.minOrderValue,
      usageLimit: payload.usageLimit,
      usedCount: 0,
      startAt: payload.startAt || new Date().toISOString().split('T')[0],
      expiredAt: payload.expiredAt,
      isActive: payload.isActive ?? true,
    };
    const updated = [newV, ...all];
    localStorage.setItem('np_vouchers_v2', JSON.stringify(updated));

    return {
      success: true,
      message: 'Khởi tạo mã Voucher thành công!',
      data: newV,
    };
  },

  /**
   * API 6.9: PATCH /api/v1/admin/vouchers/{id}/toggle
   * Bật / Tắt kích hoạt nhanh voucher (Portal - STAFF / ADMIN)
   */
  async toggleVoucherStatus(id: number): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const res = await apiClient.patch<{
        success: boolean;
        message: string;
        data: any;
      }>(`/admin/vouchers/${id}/toggle`);

      return {
        success: res.data?.success ?? true,
        message: res.data?.message || 'Thay đổi trạng thái kích hoạt Voucher thành công!',
        data: res.data?.data,
      };
    } catch (error: any) {
      console.warn(`[promotionService.toggleVoucherStatus] Backend failed for voucher ${id}, fallback to local store`, error);
      const all = sharedStore.getVouchers();
      const updated = all.map((v) => (v.voucherId === id ? { ...v, isActive: !v.isActive } : v));
      localStorage.setItem('np_vouchers_v2', JSON.stringify(updated));
      return {
        success: true,
        message: 'Đã thay đổi trạng thái kích hoạt Voucher.',
      };
    }
  },
};
