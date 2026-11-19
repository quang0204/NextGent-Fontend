import { apiClient } from './apiClient';
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
  items?: Array<{
    variantId?: number;
    productName: string;
    productNameSnapshot?: string;
    sku: string;
    skuSnapshot?: string;
    quantity: number;
    unitPrice: number;
  }>;
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
        items: payload.items,
      });

      return {
        success: true,
        message: res.data?.message || 'Gửi yêu cầu đổi trả thành công!',
        data: res.data?.data,
      };
    } catch (err: any) {
      console.error('[returnService.createReturnRequest] Backend error', err);
      const msg = err.response?.data?.message || err.message || 'Không thể gửi yêu cầu đổi trả lúc này';
      return {
        success: false,
        message: msg,
      };
    }
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
        const mappedItems: PortalReturnRequest[] = (d.items || []).map((it) => {
          let items = mapReturnOrderItems(it.items);

          // Lọc chính xác sản phẩm yêu cầu hoàn trả nếu là hoàn trả một phần:
          let isPartial = false;
          const reasonStr = it.reason || '';
          if (reasonStr.toLowerCase().includes('hoàn trả một phần')) {
            isPartial = true;
            const match = reasonStr.match(/\[Yêu cầu hoàn trả một phần:\s*([^\]]+)\]/i);
            const targetSegment = (match ? match[1] : reasonStr).toLowerCase();
            const filtered = items.filter((item) => {
              const name = (item.productName || '').toLowerCase();
              const sku = (item.sku || '').toLowerCase();
              const shortName = name.split('(')[0].trim().toLowerCase();
              return (sku && targetSegment.includes(sku)) ||
                     (name && targetSegment.includes(name)) ||
                     (shortName.length > 3 && targetSegment.includes(shortName));
            });
            if (filtered.length > 0) {
              items = filtered;
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
            orderTotalAmount: it.orderTotalAmount,
            rejectReason: it.rejectReason,
            bankInfo: it.bankInfo,
            createdAt: it.createdAt,
            evidenceImages: it.evidenceImages || [],
            isPartial,
            items,
          };
        });

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

      return {
        items: [],
        summary: { totalPending: 0, totalApproved: 0, totalRejected: 0 },
        pagination: { currentPage: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      };
    } catch (err: any) {
      console.error('[returnService.getAdminReturns] Failed to fetch returns from backend', err);
      throw err;
    }
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

      if (payload.status === 'INSPECTING') {
        saveInspectCache(id, {
          status: 'INSPECTING',
          inspectionResult: payload.inspectionResult,
          inspectedBy: res.data?.data?.inspectedBy || 'Nhân viên kỹ thuật',
          inspectedAt: res.data?.data?.inspectedAt || new Date().toISOString(),
        });
      } else {
        saveInspectCache(id, null);
      }

      return res.data;
    } catch (err: any) {
      console.error('[returnService.inspectReturn] Failed to inspect return', err);
      const msg = err.response?.data?.message || err.message || 'Lỗi khi xử lý kiểm định đổi trả';
      throw new Error(msg);
    }
  },
};
