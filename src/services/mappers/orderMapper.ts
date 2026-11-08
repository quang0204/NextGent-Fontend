import type { OrderDetail, OrderItemSnapshot, OrderResponse, OrderStatus, OrderStatusHistoryItem } from '../../types/order';
import { asRec, listOf, num, optNum, pick, str, type Rec } from './utils';

const KNOWN: OrderStatus[] = ['PENDING_PAYMENT', 'WAITING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'SHIPPING', 'COMPLETED', 'CANCELLED'];

/**
 * Trang thai backend -> trang thai cua giao dien. Dac ta API dung PENDING_CONFIRMATION, giao dien dung WAITING_CONFIRMATION.
 * Khi nhom backend chot ten trang thai, chi can sua bang nay.
 */
export function mapOrderStatus(raw: unknown): OrderStatus {
  const v = str(raw).toUpperCase().replace(/[\s-]+/g, '_');
  switch (v) {
    case 'PENDING_CONFIRMATION':
    case 'PENDING_CONFIRM':
    case 'WAITING_CONFIRM':
      return 'WAITING_CONFIRMATION';
    case 'READY_TO_PICK':
    case 'WAITING_PICKUP':
      return 'PREPARING';
    case 'IN_TRANSIT':
    case 'RETURNING':
      return 'SHIPPING';
    case 'DELIVERED':
      return 'COMPLETED';
    case 'CANCELED':
    case 'FAILED_DELIVERY':   // Dac ta 9.4: giao that bai -> tu dong huy don va hoan kho
      return 'CANCELLED';
    default:
      if ((KNOWN as string[]).includes(v)) return v as OrderStatus;
      // Trang thai la: khong doan la 'dang chuan bi/giao'. Roi ve trang thai dau (cho xac nhan) va canh bao khi dev.
      if (import.meta.env?.DEV) console.warn(`[orderMapper] Trang thai don khong nhan ra: "${str(raw)}"`);
      return 'WAITING_CONFIRMATION';
  }
}

/** Giao dien chi co COD va SIMULATED_TRANSFER (chuyen khoan mo phong); API dung BANK_TRANSFER. */
export const toApiPaymentMethod = (m: 'COD' | 'SIMULATED_TRANSFER'): string => (m === 'COD' ? 'COD' : 'BANK_TRANSFER');
export const fromApiPaymentMethod = (m: unknown): 'COD' | 'SIMULATED_TRANSFER' => (str(m).toUpperCase() === 'COD' ? 'COD' : 'SIMULATED_TRANSFER');
export const toPaymentStatus = (m: unknown): 'UNPAID' | 'PAID' | 'REFUNDED' => {
  const v = str(m).toUpperCase();
  return v === 'PAID' ? 'PAID' : v === 'REFUNDED' ? 'REFUNDED' : 'UNPAID';
};

const PAYMENT_WINDOW_MS = 30 * 60 * 1000;   // FR13: giu cho 30 phut voi chuyen khoan mo phong

/** Ket qua POST /orders -> OrderResponse. */
export function mapOrderResponse(raw: Rec, method: 'COD' | 'SIMULATED_TRANSFER'): OrderResponse {
  const createdAt = str(pick(raw, 'createdAt'), new Date().toISOString());
  const deadlineRaw = pick(raw, 'paymentDeadline', 'paymentExpiresAt', 'expiresAt');
  const deadline = deadlineRaw !== undefined
    ? str(deadlineRaw)
    : method === 'SIMULATED_TRANSFER' ? new Date(new Date(createdAt).getTime() + PAYMENT_WINDOW_MS).toISOString() : undefined;
  return {
    orderId: num(pick(raw, 'orderId', 'id')),
    orderCode: str(pick(raw, 'orderCode')),
    status: mapOrderStatus(pick(raw, 'status', 'orderStatus')),
    totalAmount: num(pick(raw, 'totalAmount', 'total')),
    paymentDeadline: deadline,
    createdAt,
  };
}

function mapItem(raw: Rec): OrderItemSnapshot {
  const rom = pick(raw, 'romSnapshot', 'rom', 'romGb');
  return {
    orderItemId: num(pick(raw, 'orderItemId', 'id')),
    variantId: num(pick(raw, 'variantId')),
    productId: num(pick(raw, 'productId')),
    productNameSnapshot: str(pick(raw, 'productNameSnapshot', 'productName', 'name')),
    skuSnapshot: str(pick(raw, 'skuSnapshot', 'sku')),
    colorSnapshot: str(pick(raw, 'colorSnapshot', 'color')),
    romSnapshot: rom === undefined ? '' : /^\d+$/.test(str(rom)) ? `${str(rom)}GB` : str(rom),
    unitPrice: num(pick(raw, 'unitPrice', 'price')),
    quantity: num(pick(raw, 'quantity', 'qty'), 1),
    lineTotal: num(pick(raw, 'lineTotal'), num(pick(raw, 'unitPrice', 'price')) * num(pick(raw, 'quantity', 'qty'), 1)),
    imageUrl: str(pick(raw, 'imageUrl', 'thumbnail')),
  };
}

function mapHistory(raw: unknown, fallbackStatus: OrderStatus, createdAt: string): OrderStatusHistoryItem[] {
  const rows = listOf(raw);
  if (rows.length === 0) return [{ status: fallbackStatus, time: createdAt, note: '' }];
  return rows.map((r) => ({
    status: mapOrderStatus(pick(r, 'status', 'toStatus')),
    time: str(pick(r, 'time', 'changedAt', 'createdAt')),
    note: str(pick(r, 'note', 'reason', 'message')),
  }));
}

/** Chi tiet / phan tu danh sach don -> OrderDetail. Truong thieu duoc dien mac dinh de giao dien khong loi. */
export function mapOrderDetail(raw: Rec): OrderDetail {
  const createdAt = str(pick(raw, 'createdAt'), new Date().toISOString());
  const status = mapOrderStatus(pick(raw, 'status', 'orderStatus'));
  const method = fromApiPaymentMethod(pick(raw, 'paymentMethod'));
  const deadline = pick(raw, 'paymentDeadline', 'paymentExpiresAt');
  const subtotal = num(pick(raw, 'subtotal'), num(pick(raw, 'totalAmount')));
  return {
    orderId: num(pick(raw, 'orderId', 'id')),
    orderCode: str(pick(raw, 'orderCode')),
    status,
    recipientName: str(pick(raw, 'recipientName')),
    recipientPhone: str(pick(raw, 'recipientPhone', 'phone')),
    shippingAddress: str(pick(raw, 'shippingAddress', 'address')),
    paymentMethod: method,
    paymentStatus: toPaymentStatus(pick(raw, 'paymentStatus')),
    paymentDeadline: deadline === undefined ? undefined : str(deadline),
    shippingFee: num(pick(raw, 'shippingFee'), 0),
    subtotal,
    voucherDiscount: num(pick(raw, 'voucherDiscount'), 0),
    totalAmount: num(pick(raw, 'totalAmount', 'total'), subtotal),
    carrier: pick(raw, 'carrier') === undefined ? undefined : str(pick(raw, 'carrier')),
    trackingCode: pick(raw, 'trackingCode') === undefined ? undefined : str(pick(raw, 'trackingCode')),
    cancelReason: pick(raw, 'cancelReason') === undefined ? undefined : str(pick(raw, 'cancelReason')),
    createdAt,
    updatedAt: str(pick(raw, 'updatedAt'), createdAt),
    completedAt: pick(raw, 'completedAt') === undefined ? undefined : str(pick(raw, 'completedAt')),
    items: (Array.isArray(raw.items) ? (raw.items as unknown[]) : []).map(asRec).filter((x): x is Rec => !!x).map(mapItem),
    statusHistory: mapHistory(pick(raw, 'statusHistory', 'timeline', 'history'), status, createdAt),
  };
}

export const orderIdOf = (raw: Rec): number | undefined => optNum(pick(raw, 'orderId', 'id'));
