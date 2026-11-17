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
  romGb?: number;
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
  variantDetails?: PortalPromotionVariant[];
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
  startAt?: string;
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


const DB_PROMO_VARIANTS_MAP: Record<number, PortalPromotionVariant[]> = {};

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('ng_promo_variants_cache');
  } catch {}
}

function getCachedPromoVariants(promoId: number): PortalPromotionVariant[] {
  return DB_PROMO_VARIANTS_MAP[promoId] || [];
}

function saveCachedPromoVariants(_promoId: number, _variants: PortalPromotionVariant[]) {}

function enrichPromoVariants(promoId: number, variants: any[]): PortalPromotionVariant[] {
  const allProds = sharedStore.getProducts();
  return variants.map((v, idx) => {
    let sku = v.sku || '';
    let productName = v.productName || '';
    let color = v.color || '';
    let romGb = Number(v.romGb || 0);
    let listPrice = Number(v.listPrice || 0);
    const promoPrice = Number(v.promoPrice || 0);

    for (const p of allProds) {
      const matched = p.variants?.find(vr => vr.variantId === v.variantId || (sku && vr.sku === sku));
      if (matched) {
        if (!sku) sku = matched.sku;
        if (!productName) productName = p.name;
        if (!color) color = matched.color;
        if (!romGb) romGb = matched.romGb || 0;
        if (!listPrice || listPrice <= 0) listPrice = matched.listPrice || matched.salePrice;
        break;
      }
    }

    return {
      promoVariantId: v.promoVariantId || (promoId * 100 + idx + 1),
      promotionId: promoId,
      variantId: Number(v.variantId || 0),
      productId: Number(v.productId || 0),
      productName: productName || 'Sản phẩm',
      sku: sku || `SKU-${v.variantId}`,
      color: color || '',
      romGb,
      listPrice: listPrice > 0 ? listPrice : Math.round(promoPrice * 1.1),
      promoPrice,
    };
  });
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
        const enrichedContent = res.data.data.content.map((p) => {
          let rawVariants = (Array.isArray(p.variants) && p.variants.length > 0)
            ? p.variants
            : getCachedPromoVariants(p.promotionId);

          if (!rawVariants || rawVariants.length === 0) {
            const local = sharedStore.getPromotions().find(lp => lp.promotionId === p.promotionId || lp.name === p.name);
            if (local?.variants && local.variants.length > 0) {
              rawVariants = local.variants;
            }
          }

          const enriched = enrichPromoVariants(p.promotionId, rawVariants || []);
          return {
            ...p,
            variants: enriched,
            appliedVariantsCount: p.appliedVariantsCount || enriched.length,
          };
        });

        sharedStore.syncExternalPromotions(enrichedContent.map(p => ({
          promotionId: p.promotionId,
          name: p.name,
          description: p.description,
          startAt: p.startAt,
          endAt: p.endAt,
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
          variants: p.variants,
        })));

        return {
          ...res.data.data,
          content: enrichedContent,
        };
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
        const newPromoId = res.data.data.promotionId || Date.now();
        const variantsToSave = (payload.variantDetails && payload.variantDetails.length > 0)
          ? payload.variantDetails
          : payload.variants.map((v, i) => ({
              promoVariantId: Date.now() + i,
              promotionId: newPromoId,
              variantId: v.variantId,
              productId: 0,
              productName: '',
              sku: '',
              color: '',
              romGb: 0,
              listPrice: 0,
              promoPrice: v.promoPrice,
            }));

        const enriched = enrichPromoVariants(newPromoId, variantsToSave);
        saveCachedPromoVariants(newPromoId, enriched);

        sharedStore.addPromotion({
          name: payload.name,
          description: payload.description,
          startAt: payload.startAt,
          endAt: payload.endAt,
          status: payload.status,
          variants: enriched,
          createdBy: 'Admin',
        });

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
            romGb: found.romGb || 0,
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

    const nowMs = Date.now();
    const localVouchers = sharedStore.getVouchers().filter((v) => {
      if (!v.isActive) return false;
      const startMs = v.startAt ? new Date(v.startAt).getTime() : NaN;
      const endMs = v.expiredAt ? new Date(v.expiredAt).getTime() : NaN;
      if (Number.isFinite(startMs) && nowMs < startMs) return false;
      if (Number.isFinite(endMs) && nowMs > endMs) return false;
      return true;
    });
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
      startAt: v.startAt,
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
    const nowMs = Date.now();
    if (v.startAt) {
      const startMs = new Date(v.startAt).getTime();
      if (Number.isFinite(startMs) && nowMs < startMs) {
        return { success: false, message: `Mã voucher "${v.code}" chưa đến thời gian có hiệu lực!` };
      }
    }
    if (v.expiredAt) {
      const endMs = new Date(v.expiredAt).getTime();
      if (Number.isFinite(endMs) && nowMs > endMs) {
        return { success: false, message: `Mã voucher "${v.code}" đã hết hạn sử dụng!` };
      }
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
      if (v.maxDiscount && v.maxDiscount > 0) {
        discount = Math.min(discount, v.maxDiscount);
      }
      discount = Math.min(discount, subtotal);
    } else {
      discount = Math.min(v.discountValue, subtotal);
    }

    return {
      success: true,
      message: 'Áp dụng mã giảm giá thành công!',
      data: {
        voucherId: v.voucherId,
        code: v.code,
        discountType: isPercent ? 'PERCENT' : 'FIXED',
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
    const size = params?.size || 50;
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
        const mapped: PortalVoucher[] = res.data.data.content.map((v) => ({
          voucherId: v.voucherId,
          code: v.code,
          discountType: v.discountType === 'PERCENT' || v.discountType === 'PERCENTAGE' ? 'PERCENT' : 'FIXED',
          discountValue: Number(v.discountValue || 0),
          maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : undefined,
          minOrderValue: Number(v.minOrderValue || 0),
          usageLimit: Number(v.usageLimit || 1),
          usedCount: Number(v.usedCount || 0),
          startAt: v.startAt || '',
          expiredAt: v.expiredAt || '',
          isActive: Boolean(v.isActive),
        }));
        if (!keyword && status === 'ALL' && mapped.length > 0) {
          sharedStore.setVouchers(mapped);
        }
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
    const normalizedType: 'FIXED' | 'PERCENT' =
      payload.discountType === 'PERCENT' || payload.discountType === 'PERCENTAGE' ? 'PERCENT' : 'FIXED';

    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/admin/vouchers', {
        ...payload,
        discountType: normalizedType,
      });

      if (res.data?.data) {
        const d = res.data.data;
        const newV: PortalVoucher = {
          voucherId: d.voucherId || Date.now(),
          code: d.code || payload.code.trim().toUpperCase(),
          discountType: normalizedType,
          discountValue: Number(payload.discountValue),
          maxDiscount: normalizedType === 'PERCENT' && payload.maxDiscount ? Number(payload.maxDiscount) : undefined,
          minOrderValue: Number(payload.minOrderValue),
          usageLimit: Number(payload.usageLimit),
          usedCount: d.usedCount || 0,
          startAt: d.startAt || payload.startAt || new Date().toISOString(),
          expiredAt: d.expiredAt || payload.expiredAt,
          isActive: payload.isActive ?? true,
        };
        const all = sharedStore.getVouchers().filter((v) => v.code !== newV.code);
        sharedStore.setVouchers([newV, ...all]);

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
      discountType: normalizedType,
      discountValue: Number(payload.discountValue),
      maxDiscount: normalizedType === 'PERCENT' && payload.maxDiscount ? Number(payload.maxDiscount) : undefined,
      minOrderValue: Number(payload.minOrderValue),
      usageLimit: Number(payload.usageLimit),
      usedCount: 0,
      startAt: payload.startAt || new Date().toISOString(),
      expiredAt: payload.expiredAt,
      isActive: payload.isActive ?? true,
    };
    sharedStore.setVouchers([newV, ...all]);

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

      const all = sharedStore.getVouchers();
      const updated = all.map((v) => (v.voucherId === id ? { ...v, isActive: !v.isActive } : v));
      sharedStore.setVouchers(updated);

      return {
        success: res.data?.success ?? true,
        message: res.data?.message || 'Thay đổi trạng thái kích hoạt Voucher thành công!',
        data: res.data?.data,
      };
    } catch (error: any) {
      console.warn(`[promotionService.toggleVoucherStatus] Backend failed for voucher ${id}, fallback to local store`, error);
      const all = sharedStore.getVouchers();
      const updated = all.map((v) => (v.voucherId === id ? { ...v, isActive: !v.isActive } : v));
      sharedStore.setVouchers(updated);
      return {
        success: true,
        message: 'Đã thay đổi trạng thái kích hoạt Voucher.',
      };
    }
  },

  async deletePromotion(id: number): Promise<void> {
    await apiClient.delete(`/admin/promotions/${id}`);
  },
};

/** Tính giờ:phút:giây còn lại tới endAt (mặc định cuối ngày nếu chưa có endAt hợp lệ). */
export const getCountdownParts = (endAt?: string | null, nowMs = Date.now()) => {
  let targetMs = endAt ? new Date(endAt).getTime() : NaN;
  if (!Number.isFinite(targetMs)) {
    const endOfDay = new Date(nowMs);
    endOfDay.setHours(23, 59, 59, 999);
    targetMs = endOfDay.getTime();
  }
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    hours: pad(Math.floor(diffSec / 3600)),
    minutes: pad(Math.floor((diffSec % 3600) / 60)),
    seconds: pad(diffSec % 60),
  };
};
