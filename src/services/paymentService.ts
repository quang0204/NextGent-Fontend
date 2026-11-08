import { apiClient } from './apiClient';
import { serverMessage, unwrapData } from './apiHelpers';
import { cleanParams, mapAdminPage, type AdminPage } from './mappers/adminCommonMapper';
import { mapAdminPaymentRow, type AdminPaymentRow } from './mappers/adminPaymentMapper';
import { asRec, num, pick, str, type Rec } from './mappers/utils';

export type PaymentMethodApi = 'COD' | 'VNPAY' | 'MOMO' | 'BANK_TRANSFER';

export interface CreatePaymentIntentInput {
  orderId: number;
  paymentMethod: PaymentMethodApi;
  /** Ghi de returnUrl mac dinh cua backend (tuy chon). */
  returnUrl?: string;
  note?: string;
}

/** PaymentIntentResponse (backend): thong tin thanh toan cua mot don. Truong tuy loai phuong thuc. */
export interface PaymentIntent {
  paymentId: number;
  orderId: number;
  orderCode: string;
  paymentMethod: string;
  paymentProvider?: string;
  amount: number;
  status: string;
  transactionRef: string;
  /** VNPay / MoMo: URL de chuyen huong thanh toan. */
  paymentUrl?: string;
  /** BANK_TRANSFER: thong tin tai khoan nhan. */
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
  transferContent?: string;
  message?: string;
  expiresAt?: string;
  createdAt?: string;
}

const optStr = (v: unknown): string | undefined => (v === undefined ? undefined : str(v));

export function mapPaymentIntent(raw: Rec): PaymentIntent {
  return {
    paymentId: num(pick(raw, 'paymentId', 'id')),
    orderId: num(pick(raw, 'orderId')),
    orderCode: str(pick(raw, 'orderCode')),
    paymentMethod: str(pick(raw, 'paymentMethod')).toUpperCase(),
    paymentProvider: optStr(pick(raw, 'paymentProvider')),
    amount: num(pick(raw, 'amount')),
    status: str(pick(raw, 'status')).toUpperCase(),
    transactionRef: str(pick(raw, 'transactionRef')),
    paymentUrl: optStr(pick(raw, 'paymentUrl')),
    bankName: optStr(pick(raw, 'bankName')),
    bankAccountNumber: optStr(pick(raw, 'bankAccountNumber')),
    bankAccountName: optStr(pick(raw, 'bankAccountName')),
    bankBranch: optStr(pick(raw, 'bankBranch')),
    transferContent: optStr(pick(raw, 'transferContent')),
    message: optStr(pick(raw, 'message')),
    expiresAt: optStr(pick(raw, 'expiresAt')),
    createdAt: optStr(pick(raw, 'createdAt')),
  };
}

export interface AdminPaymentQuery {
  page?: number;
  size?: number;
  status?: string;
  method?: string;
  search?: string;
  /** yyyy-MM-dd */
  fromDate?: string;
  toDate?: string;
}

/**
 * Thanh toan. Nguon: BACKEND (PaymentController, AdminPaymentsController). Duong dan theo backend:
 * /payments/intent (dac ta ghi create-intent) va /payments/vnpay/return (dac ta ghi vnpay-callback).
 * Khong co du lieu mau: loi duoc nem ra (Error kem thong bao tieng Viet) de noi goi tu xu ly.
 */
export const paymentService = {
  /** 10.1 POST /payments/intent - tao yeu cau thanh toan cho don da tao. */
  async createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    try {
      const res = await apiClient.post('/payments/intent', {
        orderId: input.orderId,
        paymentMethod: input.paymentMethod,
        returnUrl: input.returnUrl,
        note: input.note,
      });
      return mapPaymentIntent(asRec(unwrapData(res.data)) ?? {});
    } catch (e) {
      throw new Error(serverMessage(e, 'Khong the tao yeu cau thanh toan.'));
    }
  },

  /** 10.2 GET /payments/vnpay/return - truyen nguyen cac tham so VNPay redirect ve (window.location.search). */
  async vnpayReturn(params: Record<string, string>): Promise<PaymentIntent> {
    try {
      const res = await apiClient.get('/payments/vnpay/return', { params });
      return mapPaymentIntent(asRec(unwrapData(res.data)) ?? {});
    } catch (e) {
      throw new Error(serverMessage(e, 'Khong the xac nhan ket qua thanh toan VNPay.'));
    }
  },

  /** 10.3 GET /admin/payments - so cai giao dich thanh toan (quan tri). */
  async listAdminPayments(q: AdminPaymentQuery = {}): Promise<AdminPage<AdminPaymentRow>> {
    try {
      const res = await apiClient.get('/admin/payments', {
        params: cleanParams({ page: q.page ?? 1, size: q.size ?? 10, status: q.status, method: q.method, search: q.search, fromDate: q.fromDate, toDate: q.toDate }),
      });
      return mapAdminPage(unwrapData(res.data), mapAdminPaymentRow);
    } catch (e) {
      throw new Error(serverMessage(e, 'Khong the tai danh sach giao dich thanh toan.'));
    }
  },
};
