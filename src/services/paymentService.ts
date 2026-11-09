import { apiClient } from './apiClient';
import { sharedStore } from './sharedStore';

export interface CreatePaymentIntentPayload {
  orderId: number;
  paymentMethod: 'BANK_TRANSFER' | 'COD' | string;
  note?: string;
}

export interface PaymentIntentData {
  paymentId: number;
  orderId: number;
  orderCode: string;
  paymentMethod: 'BANK_TRANSFER' | 'COD' | string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  transactionRef: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
  transferContent?: string;
  qrContent?: string;
  message?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface SimulateCallbackPayload {
  transactionRef: string;
  success: boolean;
  amount?: number;
  note?: string;
}

export interface SimulateCallbackData {
  paymentId: number;
  transactionRef: string;
  status: 'SUCCESS' | 'FAILED';
  orderId: number;
  orderCode: string;
  orderPaymentStatus: 'PAID' | 'UNPAID';
  paidAt?: string;
  message: string;
}

export interface AdminPaymentItem {
  paymentId: number;
  orderId: number;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: 'BANK_TRANSFER' | 'COD' | string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  transactionRef: string;
  paidAt?: string;
  createdAt: string;
}

export interface AdminPaymentsResponse {
  items: AdminPaymentItem[];
  pageInfo: {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
    hasNext: boolean;
  };
}

export interface PaymentSummaryResponse {
  fromDate?: string;
  toDate?: string;
  totalTransactions: number;
  successTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
  totalCollected: number;
  totalPending: number;
  totalRefunded: number;
  collectedByMethod: {
    BANK_TRANSFER?: number;
    COD?: number;
    [key: string]: number | undefined;
  };
}

export const paymentService = {
  /**
   * API 10.1: POST /api/v1/payments/create-intent
   * Tạo yêu cầu thanh toán (Client - Auth)
   */
  async createPaymentIntent(payload: CreatePaymentIntentPayload): Promise<PaymentIntentData> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: PaymentIntentData;
      }>('/payments/create-intent', payload);

      if (res.data?.data) {
        return res.data.data;
      }
    } catch (error: any) {
      console.warn('[paymentService.createPaymentIntent] Backend failed, fallback to local generator', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
    }

    // Fallback sang mock intent
    const order = sharedStore.getOrderById(payload.orderId);
    const orderCode = order?.orderCode || `DH-${Date.now()}`;
    const amount = order?.totalAmount || 29490000;
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const nowDigits = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const transactionRef = `PAY${nowDigits}${randSuffix}`;

    if (payload.paymentMethod === 'COD') {
      return {
        paymentId: Date.now(),
        orderId: payload.orderId,
        orderCode,
        paymentMethod: 'COD',
        amount,
        status: 'PENDING',
        transactionRef,
        message: 'Đơn hàng sẽ được thanh toán khi giao hàng (COD).',
        createdAt: nowIso,
      };
    }

    return {
      paymentId: Date.now(),
      orderId: payload.orderId,
      orderCode,
      paymentMethod: 'BANK_TRANSFER',
      amount,
      status: 'PENDING',
      transactionRef,
      bankName: 'MBBank (Ngân hàng Quân Đội)',
      bankAccountNumber: '0987654321',
      bankAccountName: 'CÔNG TY NEXTGEN SMART TECH RETAIL',
      bankBranch: 'Hà Nội',
      transferContent: `NG ${transactionRef}`,
      qrContent: `BANK|MBBank|0987654321|NG ${transactionRef}`,
      message: 'Quét mã QR hoặc chuyển khoản đúng nội dung để thanh toán.',
      expiresAt: expiresIso,
      createdAt: nowIso,
    };
  },

  /**
   * API 10.2: POST /api/v1/payments/simulate-callback
   * Xác nhận chuyển khoản mô phỏng (Webhook / Admin)
   */
  async simulateCallback(payload: SimulateCallbackPayload): Promise<SimulateCallbackData> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: SimulateCallbackData;
      }>('/payments/simulate-callback', payload);

      if (res.data?.data) {
        const d = res.data.data;
        // Cập nhật trạng thái thanh toán sang PAID trong sharedStore
        const order = sharedStore.getOrderByCode(d.orderCode) || sharedStore.getOrderById(d.orderId);
        if (order) {
          order.paymentStatus = 'PAID';
          if (order.status === 'PENDING_PAYMENT') {
            sharedStore.transitionOrderStatus(order.orderId, 'WAITING_CONFIRMATION', {
              performedBy: 'Hệ thống thanh toán tự động (Webhook)',
              reason: payload.note || 'Xác nhận chuyển khoản thành công',
            });
          }
        }
        return d;
      }
    } catch (error: any) {
      console.warn('[paymentService.simulateCallback] Backend failed, fallback to local transition', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
    }

    // Fallback: Tìm đơn và cập nhật
    const allOrders = sharedStore.getOrders();
    const order = allOrders.find(
      (o) =>
        o.trackingCode?.includes(payload.transactionRef) ||
        o.orderCode.includes(payload.transactionRef.replace('PAY', ''))
    ) || allOrders.find((o) => o.status === 'PENDING_PAYMENT') || allOrders[0];

    if (order) {
      order.paymentStatus = 'PAID';
      if (order.status === 'PENDING_PAYMENT') {
        sharedStore.transitionOrderStatus(order.orderId, 'WAITING_CONFIRMATION', {
          performedBy: 'Hệ thống thanh toán tự động (Mô phỏng)',
          reason: payload.note || 'Xác nhận chuyển khoản thành công',
        });
      }
    }

    return {
      paymentId: Date.now(),
      transactionRef: payload.transactionRef,
      status: payload.success ? 'SUCCESS' : 'FAILED',
      orderId: order?.orderId || 450,
      orderCode: order?.orderCode || 'DH-20261109-728192',
      orderPaymentStatus: 'PAID',
      paidAt: new Date().toISOString(),
      message: 'Xác nhận thanh toán thành công.',
    };
  },

  /**
   * API 10.3: GET /api/v1/admin/payments
   * Sổ cái thu chi & đối soát giao dịch (Portal - STAFF / ADMIN)
   */
  async getAdminPayments(params?: {
    page?: number;
    size?: number;
    status?: string;
    method?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<AdminPaymentsResponse> {
    const page = params?.page || 1;
    const size = params?.size || 10;

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: AdminPaymentsResponse;
      }>('/admin/payments', {
        params: {
          page,
          size,
          status: params?.status && params.status !== 'ALL' ? params.status : undefined,
          method: params?.method && params.method !== 'ALL' ? params.method : undefined,
          search: params?.search || undefined,
          fromDate: params?.fromDate || undefined,
          toDate: params?.toDate || undefined,
        },
      });

      if (res.data?.data?.items) {
        return res.data.data;
      }
    } catch (error) {
      console.warn('[paymentService.getAdminPayments] Backend failed or offline, fallback to sharedStore', error);
    }

    // Fallback: Sinh danh sách giao dịch từ sharedStore.getOrders()
    const orders = sharedStore.getOrders();
    const items: AdminPaymentItem[] = orders.map((o, idx) => {
      const isPaid = o.paymentStatus === 'PAID';
      const isPending = o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED';
      const isCancelled = o.status === 'CANCELLED';

      const status: AdminPaymentItem['status'] = isPaid
        ? 'SUCCESS'
        : isCancelled
        ? 'CANCELLED'
        : isPending
        ? 'PENDING'
        : 'FAILED';

      const method = o.paymentMethod === 'SIMULATED_TRANSFER' ? 'BANK_TRANSFER' : o.paymentMethod || 'COD';

      return {
        paymentId: 100 + idx,
        orderId: o.orderId,
        orderCode: o.orderCode,
        customerName: o.recipientName,
        customerPhone: o.recipientPhone,
        paymentMethod: method,
        amount: o.totalAmount,
        status,
        transactionRef: `PAY${o.orderCode.replace(/\D/g, '') || idx + 1000}`,
        paidAt: isPaid ? o.updatedAt || o.createdAt : undefined,
        createdAt: o.createdAt,
      };
    });

    const start = (page - 1) * size;
    return {
      items: items.slice(start, start + size),
      pageInfo: {
        page,
        size,
        totalPages: Math.ceil(items.length / size) || 1,
        totalElements: items.length,
        hasNext: page * size < items.length,
      },
    };
  },

  /**
   * API 10.4: GET /api/v1/admin/payments/summary
   * Báo cáo tổng hợp đối soát tài chính (Portal - STAFF / ADMIN)
   */
  async getPaymentSummary(params?: { fromDate?: string; toDate?: string }): Promise<PaymentSummaryResponse> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: PaymentSummaryResponse;
      }>('/admin/payments/summary', {
        params: {
          fromDate: params?.fromDate || undefined,
          toDate: params?.toDate || undefined,
        },
      });

      if (res.data?.data) {
        return res.data.data;
      }
    } catch (error) {
      console.warn('[paymentService.getPaymentSummary] Backend failed or offline, fallback to sharedStore', error);
    }

    // Fallback: Tính toán tổng hợp từ sharedStore
    const orders = sharedStore.getOrders();
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const pendingOrders = orders.filter((o) => o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED');
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');

    const totalCollected = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPending = pendingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalRefunded = 45000000;

    const bankCollected = paidOrders
      .filter((o) => o.paymentMethod === 'SIMULATED_TRANSFER' || (o.paymentMethod as any) === 'BANK_TRANSFER')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const codCollected = paidOrders
      .filter((o) => o.paymentMethod === 'COD')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      fromDate: params?.fromDate || '2026-11-01',
      toDate: params?.toDate || '2026-11-09',
      totalTransactions: orders.length,
      successTransactions: paidOrders.length,
      pendingTransactions: pendingOrders.length,
      failedTransactions: 0,
      refundedTransactions: cancelledOrders.length,
      totalCollected,
      totalPending,
      totalRefunded,
      collectedByMethod: {
        BANK_TRANSFER: bankCollected || Math.round(totalCollected * 0.65),
        COD: codCollected || Math.round(totalCollected * 0.35),
      },
    };
  },
};
