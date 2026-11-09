import { apiClient } from './apiClient';
import { PortalInventoryItem, StockAdjustmentRecord, StockMovementRecord } from '../types/portal';
import { sharedStore } from './sharedStore';

export interface InventorySummary {
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  lowStockCount: number;
}

export interface InventoryPageResponse {
  content: PortalInventoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  summary?: InventorySummary;
}

export interface InventoryDetailResponse extends PortalInventoryItem {
  ramGb?: number;
  connectionType?: string;
  listPrice?: number;
  recentTransactions?: {
    txnId: number;
    formCode: string;
    sku: string;
    productName: string;
    txnType: string;
    quantityChange: number;
    qtyBefore: number;
    qtyAfter: number;
    orderId?: number;
    reason: string;
    performedBy: string;
    performedAt: string;
  }[];
}

export interface StockAdjustmentPayload {
  variantId: number;
  actualCount: number;
  reason: string;
}

export interface StockAdjustmentCreatedData {
  adjustmentId: number;
  formCode: string;
  variantId: number;
  sku: string;
  productName: string;
  qtyBefore: number;
  qtyActual: number;
  quantityChange: number;
  reservedQty: number;
  availableQty: number;
  reason?: string;
  performedBy?: string;
  createdAt?: string;
}

export interface InventoryTransactionsResponse {
  content: StockMovementRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface LowStockAlertItem {
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  color: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  minThreshold: number;
  deficit: number;
  status: string;
  recommendImportQty: number;
}

export interface LowStockPageResponse {
  content: LowStockAlertItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export const inventoryService = {
  /**
   * API 5.1: GET /api/v1/admin/inventories
   * Bảng theo dõi tồn kho biến thể SKU & Khối summary
   */
  async getInventories(params?: {
    page?: number;
    size?: number;
    keyword?: string;
    status?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | string;
    lowStockOnly?: boolean;
  }): Promise<InventoryPageResponse> {
    const page = params?.page || 1;
    const size = params?.size || 10;
    const keyword = params?.keyword || undefined;
    const status = params?.status || 'ALL';
    const lowStockOnly = params?.lowStockOnly ?? false;

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: InventoryPageResponse;
      }>('/admin/inventories', {
        params: {
          page,
          size,
          ...(keyword ? { keyword } : {}),
          status,
          lowStockOnly,
        },
      });

      if (res.data?.data?.content) {
        return res.data.data;
      }
    } catch (error) {
      console.warn('[inventoryService.getInventories] Backend failed or offline, fallback to sharedStore', error);
    }

    // Fallback sang sharedStore
    const all = sharedStore.getInventories();
    const filtered = all.filter((item) => {
      const matchKeyword = !keyword ||
        (item.productName || '').toLowerCase().includes(keyword.toLowerCase()) ||
        (item.sku || '').toLowerCase().includes(keyword.toLowerCase()) ||
        (item.color || '').toLowerCase().includes(keyword.toLowerCase());

      const matchStatus = !status || status === 'ALL' || item.status === status;
      const matchLowStock = lowStockOnly ? item.availableQty <= item.minThreshold : true;

      return matchKeyword && matchStatus && matchLowStock;
    });

    const start = (page - 1) * size;
    const paginated = filtered.slice(start, start + size);

    const totalOnHand = all.reduce((sum, i) => sum + i.onHandQty, 0);
    const totalReserved = all.reduce((sum, i) => sum + i.reservedQty, 0);
    const totalAvailable = all.reduce((sum, i) => sum + i.availableQty, 0);
    const lowStockCount = all.filter((i) => i.availableQty <= i.minThreshold).length;

    return {
      content: paginated,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size) || 1,
      hasNext: page * size < filtered.length,
      summary: {
        totalOnHand,
        totalReserved,
        totalAvailable,
        lowStockCount,
      },
    };
  },

  /**
   * API 5.2: GET /api/v1/admin/inventories/{varId}
   * Chi tiết tồn kho SKU & 5 giao dịch sổ cái gần nhất
   */
  async getInventoryDetail(variantId: number): Promise<InventoryDetailResponse | null> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: InventoryDetailResponse;
      }>(`/admin/inventories/${variantId}`);

      if (res.data?.data) {
        return res.data.data;
      }
    } catch (error) {
      console.warn(`[inventoryService.getInventoryDetail] Failed for varId ${variantId}, fallback to sharedStore`, error);
    }

    const item = sharedStore.getInventories().find((i) => i.variantId === variantId);
    if (!item) return null;

    const recentTxns = sharedStore
      .getMovements()
      .filter((m) => m.sku === item.sku)
      .slice(0, 5)
      .map((m) => ({
        txnId: m.txnId,
        formCode: m.formCode,
        sku: m.sku,
        productName: m.productName,
        txnType: m.txnType,
        quantityChange: m.quantityChange,
        qtyBefore: m.qtyBefore,
        qtyAfter: m.qtyAfter,
        reason: m.reason,
        performedBy: m.performedBy,
        performedAt: m.performedAt,
      }));

    return {
      ...item,
      ramGb: 8,
      connectionType: '5G',
      listPrice: 29990000,
      recentTransactions: recentTxns,
    };
  },

  /**
   * API 5.3: POST /api/v1/admin/inventories/adjustments
   * Lập phiếu kiểm kê MB05 & Cân đối tồn kho
   */
  async createStockAdjustment(payload: StockAdjustmentPayload): Promise<{
    success: boolean;
    message: string;
    data?: StockAdjustmentCreatedData;
  }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        statusCode: number;
        message: string;
        data: StockAdjustmentCreatedData;
      }>('/admin/inventories/adjustments', payload);

      if (res.data?.data) {
        // Đồng bộ kết quả vào sharedStore
        const d = res.data.data;
        const allAdjustments = sharedStore.getAdjustments();
        const newRecord: StockAdjustmentRecord = {
          id: d.adjustmentId || Date.now(),
          formCode: d.formCode,
          sku: d.sku,
          productName: d.productName,
          qtySystem: d.qtyBefore,
          qtyActual: d.qtyActual,
          qtyDiff: d.quantityChange,
          reason: payload.reason,
          performedBy: d.performedBy || 'Nguyễn Thanh Hùng (Thủ kho)',
          createdAt: d.createdAt || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
          status: 'APPROVED',
        };

        // Ghi nhận trực tiếp vào sharedStore
        sharedStore.createStockAdjustment(d.sku, d.qtyActual, payload.reason, d.performedBy || 'Nguyễn Thanh Hùng (Thủ kho)');

        return {
          success: true,
          message: res.data.message || 'Lập phiếu kiểm kê MB05 và cân đối tồn kho thành công!',
          data: d,
        };
      }
    } catch (error: any) {
      console.warn('[inventoryService.createStockAdjustment] Backend failed, fallback to local validation', error);
      const apiMessage = error.response?.data?.message || error.message;

      // Nếu lỗi 400 từ Backend, trả về lỗi nguyên vẹn
      if (error.response?.data?.message) {
        return {
          success: false,
          message: error.response.data.message,
        };
      }

      // Fallback sharedStore
      const inv = sharedStore.getInventories().find((i) => i.variantId === payload.variantId);
      if (inv) {
        const fallbackRes = sharedStore.createStockAdjustment(
          inv.sku,
          payload.actualCount,
          payload.reason,
          'Nguyễn Thanh Hùng (Thủ kho)'
        );
        return fallbackRes;
      }

      return {
        success: false,
        message: apiMessage || 'Không thể tạo phiếu kiểm kê.',
      };
    }

    return {
      success: false,
      message: 'Không nhận được dữ liệu phản hồi từ máy chủ.',
    };
  },

  /**
   * API 5.4: GET /api/v1/admin/inventories/transactions
   * Sổ cái biến động kho bất biến
   */
  async getTransactions(params?: {
    page?: number;
    size?: number;
    formCode?: string;
    txnType?: 'IMPORT' | 'EXPORT' | 'ADJUSTMENT' | 'RETURN' | string;
    startDate?: string;
    endDate?: string;
  }): Promise<InventoryTransactionsResponse> {
    const page = params?.page || 1;
    const size = params?.size || 10;

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: InventoryTransactionsResponse;
      }>('/admin/inventories/transactions', {
        params: {
          page,
          size,
          ...(params?.formCode ? { formCode: params.formCode } : {}),
          ...(params?.txnType ? { txnType: params.txnType } : {}),
          ...(params?.startDate ? { startDate: params.startDate } : {}),
          ...(params?.endDate ? { endDate: params.endDate } : {}),
        },
      });

      if (res.data?.data?.content) {
        return res.data.data;
      }
    } catch (error) {
      console.warn('[inventoryService.getTransactions] Backend failed or offline, fallback to sharedStore', error);
    }

    // Fallback sang sharedStore
    const all = sharedStore.getMovements();
    const filtered = all.filter((m) => {
      const matchForm = !params?.formCode || m.formCode.toLowerCase().includes(params.formCode.toLowerCase());
      const matchType = !params?.txnType || params.txnType === 'ALL' || m.txnType === params.txnType || (params.txnType === 'ADJUSTMENT' && m.txnType === 'ADJUST');
      return matchForm && matchType;
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
   * API 5.5: GET /api/v1/admin/inventories/low-stock
   * Cảnh báo tồn kho dưới ngưỡng an toàn & đề xuất nhập hàng
   */
  async getLowStock(params?: { page?: number; size?: number }): Promise<LowStockPageResponse> {
    const page = params?.page || 1;
    const size = params?.size || 10;

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: LowStockPageResponse;
      }>('/admin/inventories/low-stock', {
        params: { page, size },
      });

      if (res.data?.data?.content) {
        return res.data.data;
      }
    } catch (error) {
      console.warn('[inventoryService.getLowStock] Backend failed or offline, fallback to sharedStore', error);
    }

    // Fallback sang sharedStore
    const all = sharedStore.getInventories().filter((i) => i.availableQty <= i.minThreshold);
    const mapped: LowStockAlertItem[] = all.map((i) => {
      const deficit = Math.max(0, i.minThreshold - i.availableQty);
      return {
        variantId: i.variantId,
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        color: i.color,
        onHandQty: i.onHandQty,
        reservedQty: i.reservedQty,
        availableQty: i.availableQty,
        minThreshold: i.minThreshold,
        deficit,
        status: i.status,
        recommendImportQty: Math.max(10, deficit + 15),
      };
    });

    const start = (page - 1) * size;
    return {
      content: mapped.slice(start, start + size),
      page,
      size,
      totalElements: mapped.length,
      totalPages: Math.ceil(mapped.length / size) || 1,
      hasNext: page * size < mapped.length,
    };
  },

  /**
   * Auxiliary API: POST /api/v1/admin/orders/{id}/pack-export
   * Đóng gói và xuất kho đơn hàng (Phiếu MB03)
   */
  async packExportOrder(orderId: number, exportNote?: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>(`/admin/orders/${orderId}/pack-export`, {
        exportNote: exportNote || 'Đóng gói hoàn tất và xuất kho vật lý',
      });

      return {
        success: res.data?.success ?? true,
        message: res.data?.message || 'Đóng gói và xuất kho đơn hàng thành công!',
        data: res.data?.data,
      };
    } catch (error: any) {
      console.warn(`[inventoryService.packExportOrder] Backend failed for order ${orderId}, fallback to sharedStore`, error);
      const res = sharedStore.transitionOrderStatus(orderId, 'SHIPPING', {
        reason: exportNote || 'Đóng gói hoàn tất và xuất kho vật lý',
      });
      return {
        success: res.success,
        message: res.message,
      };
    }
  },
};
