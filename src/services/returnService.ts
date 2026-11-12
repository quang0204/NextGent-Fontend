import { apiClient } from './apiClient';
import { sharedStore } from './sharedStore';
import { useAuthStore } from '../stores/authStore';
import { PortalReturnRequest } from '../types/portal';

export interface CreateReturnRequestPayload {
  orderId: number;
  reason: string;
  evidenceImages?: string[];
  bankInfo?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
  };
}

export interface AdminReturnsQuery {
  page?: number;
  limit?: number;
  size?: number;
  status?: string;
  orderCode?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface AdminReturnsResponse {
  items: PortalReturnRequest[];
  summary: {
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
  };
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface InspectReturnPayload {
  status: 'INSPECTING' | 'APPROVED' | 'REJECTED';
  inspectionResult: string;
  refundAmount?: number;
  restockItems?: Array<{
    variantId: number;
    quantity: number;
  }>;
  rejectReason?: string;
}


const RETURN_INSPECT_CACHE_KEY = 'ng_return_inspect_cache';

const getInspectCache = (): Record<number, { status: string; inspectionResult: string; inspectedBy: string; inspectedAt: string }> => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(RETURN_INSPECT_CACHE_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveInspectCache = (id: number, entry: { status: string; inspectionResult: string; inspectedBy: string; inspectedAt: string } | null) => {
  try {
    if (typeof window === 'undefined') return;
    const cache = getInspectCache();
    if (entry) cache[id] = entry;
    else delete cache[id];
    localStorage.setItem(RETURN_INSPECT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
};

const mapReturnOrderItems = (rawItems: any[]) =>
  (rawItems || []).map((it: any) => ({
    variantId: it.variantId,
    productName: it.productName || it.productNameSnapshot || 'Sản phẩm',
    sku: it.sku || it.skuSnapshot || '',
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.unitPrice || 0),
  }));

export const returnService = {
  /**
   * API 11.1: POST /api/v1/returns
   * Khách hàng tạo phiếu yêu cầu đổi trả (Client - Auth)
   */
  async createReturnRequest(payload: CreateReturnRequestPayload): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/returns', {
        orderId: payload.orderId,
        reason: payload.reason,
        evidenceImages: payload.evidenceImages && payload.evidenceImages.length > 0
          ? payload.evidenceImages
          : ['https://cdn.nextgen.vn/evidence/default_defect.png'],
        bankInfo: payload.bankInfo,
      });

      const currentUserId = useAuthStore.getState().user?.userId || 101;

      if (res.data) {
        // Cập nhật local store để đảm bảo đồng bộ trạng thái ngay
        const order = sharedStore.getOrderById(payload.orderId);
        if (order) {
          order.statusHistory.unshift({
            status: 'COMPLETED',
            time: new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }),
            note: `Khách hàng gửi yêu cầu Đổi trả / Hoàn tiền: ${payload.reason}. CSKH đang tiếp nhận.`,
          });
          sharedStore.createReturnRequest({
            orderId: order.orderId,
            bankInfo: payload.bankInfo,
            orderCode: order.orderCode,
            userId: currentUserId,
            requestedBy: order.recipientName,
            phone: order.recipientPhone,
            reason: payload.reason,
            items: order.items.map((i) => ({
              variantId: i.variantId,
              productName: i.productNameSnapshot,
              sku: i.skuSnapshot,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          });
        }

        return {
          success: true,
          message: res.data.message || 'Gửi yêu cầu đổi trả thành công!',
          data: res.data.data,
        };
      }
    } catch (err: any) {
      console.warn('[returnService.createReturnRequest] Fallback to sharedStore', err);
      if (err.response?.data?.message) {
        return {
          success: false,
          message: err.response.data.message,
        };
      }
    }

    // Fallback: Local sharedStore
    const order = sharedStore.getOrderById(payload.orderId);
    if (!order) {
      return { success: false, message: 'Không tìm thấy đơn hàng' };
    }
    if (order.status !== 'COMPLETED') {
      return { success: false, message: 'Chỉ có thể yêu cầu đổi trả với đơn hàng đã Hoàn tất.' };
    }

    order.statusHistory.unshift({
      status: 'COMPLETED',
      time: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      note: `Khách hàng gửi yêu cầu Đổi trả / Hoàn tiền: ${payload.reason}. CSKH đang tiếp nhận.`,
    });

    const currentUserId = useAuthStore.getState().user?.userId || 101;
    const localReq = sharedStore.createReturnRequest({
      orderId: order.orderId,
      bankInfo: payload.bankInfo,
      orderCode: order.orderCode,
      userId: currentUserId,
      requestedBy: order.recipientName,
      phone: order.recipientPhone,
      reason: payload.reason,
      items: order.items.map((i) => ({
        variantId: i.variantId,
        productName: i.productNameSnapshot,
        sku: i.skuSnapshot,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });

    return {
      success: true,
      message: 'Gửi yêu cầu đổi trả thành công! Nhân viên CSKH sẽ liên hệ hướng dẫn gửi hàng.',
      data: localReq,
    };
  },

  /**
   * API 11.2: GET /api/v1/admin/returns
   * Quản lý danh sách yêu cầu đổi trả (Portal - STAFF / ADMIN)
   */
  async getAdminReturns(query: AdminReturnsQuery = {}): Promise<AdminReturnsResponse> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          items: any[];
          summary?: {
            totalPending: number;
            totalApproved: number;
            totalRejected: number;
          };
          pagination?: {
            currentPage: number;
            pageSize: number;
            totalItems: number;
            totalPages: number;
          };
        };
      }>('/admin/returns', { params: query });

      if (res.data?.data) {
        const d = res.data.data;
        const inspectCache = getInspectCache();
        const mappedItems: PortalReturnRequest[] = await Promise.all(
          (d.items || []).map(async (it) => {
            let items = mapReturnOrderItems(it.items);
            let orderTotalAmount = it.orderTotalAmount !== undefined && it.orderTotalAmount !== null
              ? Number(it.orderTotalAmount)
              : undefined;

            // Nếu backend chưa trả items / orderTotalAmount -> nạp chi tiết đơn qua API 8.3
            if ((items.length === 0 || orderTotalAmount === undefined) && it.orderCode) {
              try {
                const ordRes = await apiClient.get<{ success: boolean; data: any }>(`/orders/${encodeURIComponent(it.orderCode)}`);
                const ordData = ordRes.data?.data;
                if (ordData) {
                  if (items.length === 0 && Array.isArray(ordData.items)) {
                    items = mapReturnOrderItems(ordData.items);
                  }
                  if (orderTotalAmount === undefined && ordData.totalAmount !== undefined) {
                    orderTotalAmount = Number(ordData.totalAmount);
                  }
                }
              } catch {
                // fallback tiếp ở dưới nếu không gọi được order detail
              }
            }

            if (items.length === 0) {
              const localOrd = sharedStore.getOrderByCode(it.orderCode) || sharedStore.getOrderById(it.orderId);
              if (localOrd) {
                items = mapReturnOrderItems(localOrd.items);
                if (orderTotalAmount === undefined) orderTotalAmount = localOrd.totalAmount;
              }
            }

            const cachedInspect = it.status === 'PENDING' && !it.inspectionResult ? inspectCache[it.returnId] : undefined;
            if (it.status !== 'PENDING' && inspectCache[it.returnId]) {
              saveInspectCache(it.returnId, null);
            }

            const refundAmount = it.refundAmount !== null && it.refundAmount !== undefined
              ? Number(it.refundAmount)
              : undefined;

            return {
              returnId: it.returnId,
              orderId: it.orderId,
              orderCode: it.orderCode,
              userId: it.customer?.userId || it.userId || 101,
              requestedBy: it.customer?.fullName || it.requestedBy || 'Khách hàng',
              phone: it.customer?.phone || it.phone || '',
              reason: it.reason,
              status: (cachedInspect?.status || it.status) as PortalReturnRequest['status'],
              inspectionResult: it.inspectionResult || cachedInspect?.inspectionResult,
              inspectedBy: it.inspectedBy || cachedInspect?.inspectedBy,
              inspectedAt: it.inspectedAt || cachedInspect?.inspectedAt,
              refundAmount,
              orderTotalAmount,
              rejectReason: it.rejectReason,
              bankInfo: it.bankInfo,
              createdAt: it.createdAt,
              evidenceImages: it.evidenceImages || [],
              items,
            };
          })
        );

        return {
          items: mappedItems,
          summary: d.summary || {
            totalPending: mappedItems.filter((r) => r.status === 'PENDING' || r.status === 'INSPECTING').length,
            totalApproved: mappedItems.filter((r) => r.status === 'APPROVED').length,
            totalRejected: mappedItems.filter((r) => r.status === 'REJECTED').length,
          },
          pagination: d.pagination || {
            currentPage: query.page || 1,
            pageSize: query.limit || 20,
            totalItems: mappedItems.length,
            totalPages: 1,
          },
        };
      }
    } catch (err) {
      console.warn('[returnService.getAdminReturns] Fallback to sharedStore', err);
    }

    // Fallback: sharedStore
    const all = sharedStore.getReturnRequests();
    let filtered = [...all];

    if (query.status && query.status !== 'ALL') {
      filtered = filtered.filter((r) => r.status === query.status);
    }
    if (query.orderCode) {
      const q = query.orderCode.toLowerCase();
      filtered = filtered.filter((r) => (r.orderCode || '').toLowerCase().includes(q));
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    const slice = filtered.slice(start, start + limit);

    return {
      items: slice,
      summary: {
        totalPending: all.filter((r) => r.status === 'PENDING').length,
        totalApproved: all.filter((r) => r.status === 'APPROVED').length,
        totalRejected: all.filter((r) => r.status === 'REJECTED').length,
      },
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    };
  },

  /**
   * API 11.3: PUT /api/v1/admin/returns/{id}/inspect
   * Biên bản kiểm định ngoại quan & Hoàn kho MB04 (Portal - STAFF / ADMIN)
   */
  async inspectReturn(id: number, payload: InspectReturnPayload): Promise<any> {
    try {
      const res = await apiClient.put<{
        success: boolean;
        message: string;
        data: any;
      }>(`/admin/returns/${id}/inspect`, payload);

      if (res.data?.data) {
        if (payload.status === 'INSPECTING') {
          saveInspectCache(id, {
            status: 'INSPECTING',
            inspectionResult: payload.inspectionResult,
            inspectedBy: res.data.data.inspectedBy || 'Nhân viên kỹ thuật',
            inspectedAt: res.data.data.inspectedAt || new Date().toISOString(),
          });
          sharedStore.inspectReturnRequest(id, payload.inspectionResult, res.data.data.inspectedBy || 'Nhân viên kỹ thuật');
        } else if (payload.status === 'APPROVED') {
          saveInspectCache(id, null);
          sharedStore.approveAndRefundReturn(
            id,
            payload.refundAmount || 0,
            res.data.data.inspectedBy || 'Nguyễn Thế Minh (Admin)'
          );
        } else {
          saveInspectCache(id, null);
          sharedStore.rejectReturnRequest(
            id,
            payload.rejectReason || 'Không đủ điều kiện',
            res.data.data.inspectedBy || 'Nguyễn Thế Minh (Admin)'
          );
        }
        return res.data;
      }
    } catch (err: any) {
      console.warn('[returnService.inspectReturn] Error or fallback', err);
      if (payload.status === 'INSPECTING') {
        const entry = {
          status: 'INSPECTING',
          inspectionResult: payload.inspectionResult,
          inspectedBy: 'Nhân viên kỹ thuật',
          inspectedAt: new Date().toISOString(),
        };
        saveInspectCache(id, entry);
        sharedStore.inspectReturnRequest(id, payload.inspectionResult, entry.inspectedBy);
        return { success: true, data: entry };
      }
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    // Fallback sang sharedStore
    if (payload.status === 'INSPECTING') {
      const entry = {
        status: 'INSPECTING',
        inspectionResult: payload.inspectionResult,
        inspectedBy: 'Nhân viên kỹ thuật',
        inspectedAt: new Date().toISOString(),
      };
      saveInspectCache(id, entry);
      sharedStore.inspectReturnRequest(id, payload.inspectionResult, entry.inspectedBy);
      return { success: true, data: entry };
    }
    if (payload.status === 'APPROVED') {
      sharedStore.approveAndRefundReturn(id, payload.refundAmount || 0, 'Nguyễn Thế Minh (Admin)');
    } else {
      sharedStore.rejectReturnRequest(id, payload.rejectReason || 'Không đủ điều kiện', 'Nguyễn Thế Minh (Admin)');
    }
    return { success: true };
  },
};
