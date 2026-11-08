import { num, pick, str, type Rec } from './utils';

/** Mot giao dich trong so cai thanh toan (AdminPaymentItemResponse). Giu nguyen gia tri backend. */
export interface AdminPaymentRow {
  paymentId: number;
  orderId: number;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  /** COD | VNPAY | MOMO | BANK_TRANSFER */
  paymentMethod: string;
  paymentProvider: string;
  amount: number;
  /** PENDING | PROCESSING | SUCCESS | FAILED | REFUNDED | CANCELLED */
  status: string;
  transactionRef: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function mapAdminPaymentRow(raw: Rec): AdminPaymentRow {
  const paidAt = pick(raw, 'paidAt');
  return {
    paymentId: num(pick(raw, 'paymentId', 'id')),
    orderId: num(pick(raw, 'orderId')),
    orderCode: str(pick(raw, 'orderCode')),
    customerName: str(pick(raw, 'customerName')),
    customerPhone: str(pick(raw, 'customerPhone')),
    paymentMethod: str(pick(raw, 'paymentMethod')).toUpperCase(),
    paymentProvider: str(pick(raw, 'paymentProvider')),
    amount: num(pick(raw, 'amount')),
    status: str(pick(raw, 'status')).toUpperCase(),
    transactionRef: str(pick(raw, 'transactionRef')),
    paidAt: paidAt === undefined ? undefined : str(paidAt),
    createdAt: str(pick(raw, 'createdAt')),
    updatedAt: str(pick(raw, 'updatedAt')),
  };
}
