import type { OrderStatus } from '../../types/order';
import type { PortalShipment, ShipmentStatus } from '../../types/portal';
import { mapOrderStatus } from './orderMapper';
import { listOf, num, optNum, pick, str, type Rec } from './utils';

/**
 * Trang thai van don backend (READY_TO_PICK, PICKED, IN_TRANSIT, DELIVERED, FAILED_DELIVERY, CANCELLED)
 * -> trang thai giao dien (types/portal.ts).
 */
export function mapShipmentStatus(raw: unknown): ShipmentStatus {
  const v = str(raw).toUpperCase().replace(/[\s-]+/g, '_');
  switch (v) {
    case 'READY_TO_PICK':
    case 'WAITING_PICKUP':
    case 'PENDING':
    case 'PREPARING':
      return 'PREPARING';
    case 'PICKED':
    case 'PICKED_UP':
      return 'PICKED_UP';
    case 'IN_TRANSIT':
    case 'SHIPPING':
    case 'RETURNING':
      return 'IN_TRANSIT';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'FAILED_DELIVERY':
    case 'DELIVERY_FAILED':
    case 'FAILED':
    case 'PICKUP_FAILED':
    case 'CANCELLED':   // van don bi huy: giao dien chi co DELIVERY_FAILED ("don hang bi huy")
    case 'CANCELED':
      return 'DELIVERY_FAILED';
    case 'NONE':
      return 'NONE';
    default:
      // Khong doan la da co tien trinh giao hang: tra NONE va canh bao khi dev.
      if (import.meta.env?.DEV) console.warn(`[shipmentMapper] Trang thai van don khong nhan ra: "${str(raw)}"`);
      return 'NONE';
  }
}

/** Trang thai giao dien -> gia tri backend (PUT /admin/shipments/{id}/status). */
export function toApiShipmentStatus(s: ShipmentStatus): string {
  switch (s) {
    case 'PREPARING':
    case 'WAITING_PICKUP':
    case 'PENDING':
      return 'READY_TO_PICK';
    case 'PICKED_UP':
      return 'PICKED';
    case 'IN_TRANSIT':
      return 'IN_TRANSIT';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'DELIVERY_FAILED':
    case 'PICKUP_FAILED':
    case 'FAILED':
      return 'FAILED_DELIVERY';
    default:
      return s;
  }
}

export const isFailedShipmentStatus = (s: ShipmentStatus): boolean =>
  s === 'DELIVERY_FAILED' || s === 'PICKUP_FAILED' || s === 'FAILED';

/** AdminShipmentItemResponse -> PortalShipment. codAmount = tong tien don neu thanh toan COD, nguoc lai 0. */
export function mapPortalShipment(raw: Rec): PortalShipment {
  const method = str(pick(raw, 'paymentMethod')).toUpperCase();
  const explicitCod = optNum(pick(raw, 'codAmount'));
  const total = num(pick(raw, 'orderTotalAmount', 'totalAmount'));
  const failReason = pick(raw, 'failReason');
  const updatedBy = pick(raw, 'updatedBy');
  return {
    shipmentId: num(pick(raw, 'shipmentId', 'id')),
    orderId: num(pick(raw, 'orderId')),
    orderCode: str(pick(raw, 'orderCode')),
    carrier: str(pick(raw, 'carrier')),
    trackingCode: str(pick(raw, 'trackingCode')),
    status: mapShipmentStatus(pick(raw, 'status', 'shipmentStatus')),
    failReason: failReason === undefined ? undefined : str(failReason),
    recipientName: str(pick(raw, 'recipientName')),
    recipientPhone: str(pick(raw, 'recipientPhone')),
    shippingAddress: str(pick(raw, 'shippingAddress')),
    codAmount: explicitCod !== undefined ? explicitCod : method === 'COD' ? total : 0,
    updatedBy: updatedBy === undefined ? undefined : str(updatedBy),
    updatedAt: str(pick(raw, 'updatedAt')),
  };
}

// ---------- 9.1 Tra cuu van don cong khai ----------
export interface ShipmentTrackingItem { productName: string; color: string; quantity: number }
export interface ShipmentTimelineEntry { time: string; status: ShipmentStatus; description: string }
export interface ShipmentTracking {
  shipmentId?: number;
  trackingCode: string;
  orderCode: string;
  carrier: string;
  status: ShipmentStatus;
  statusLabel: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  estimatedDeliveryDate?: string;
  items: ShipmentTrackingItem[];
  timeline: ShipmentTimelineEntry[];
}

/** ShipmentTrackResponse (GET /shipments/track/{trackingCode}) -> ShipmentTracking. */
export function mapShipmentTracking(raw: Rec): ShipmentTracking {
  const eta = pick(raw, 'estimatedDeliveryDate');
  const id = optNum(pick(raw, 'shipmentId'));
  return {
    shipmentId: id,
    trackingCode: str(pick(raw, 'trackingCode')),
    orderCode: str(pick(raw, 'orderCode')),
    carrier: str(pick(raw, 'carrier')),
    status: mapShipmentStatus(pick(raw, 'status')),
    statusLabel: str(pick(raw, 'statusLabel')),
    recipientName: str(pick(raw, 'recipientName')),
    recipientPhone: str(pick(raw, 'recipientPhone')),
    shippingAddress: str(pick(raw, 'shippingAddress')),
    estimatedDeliveryDate: eta === undefined ? undefined : str(eta),
    items: listOf(pick(raw, 'items')).map((r) => ({
      productName: str(pick(r, 'productName')),
      color: str(pick(r, 'color')),
      quantity: num(pick(r, 'quantity'), 1),
    })),
    timeline: listOf(pick(raw, 'timeline')).map((r) => ({
      time: str(pick(r, 'time')),
      status: mapShipmentStatus(pick(r, 'status')),
      description: str(pick(r, 'description')),
    })),
  };
}

// ---------- 9.3 / 9.4 Ket qua cap nhat van don ----------
/** Cung dang { success, message } nhu sharedStore.updateShipmentStatus, kem ket qua dong bo don hang cua backend. */
export interface AdminShipmentActionResult {
  success: boolean;
  message: string;
  shipmentId?: number;
  trackingCode?: string;
  shipmentStatus?: ShipmentStatus;
  synchronizedOrderId?: number;
  synchronizedOrderStatus?: OrderStatus;
  isPaymentCompleted?: boolean;
  inventoryRestocked?: boolean;
  restockedItemsCount?: number;
}

/** ShipmentStatusSyncResponse (PUT /admin/shipments/{id}/status). */
export function mapShipmentSyncResult(raw: Rec, message: string): AdminShipmentActionResult {
  const synced = pick(raw, 'synchronizedOrderStatus');
  const paid = pick(raw, 'isPaymentCompleted');
  return {
    success: true,
    message,
    shipmentId: optNum(pick(raw, 'shipmentId')),
    trackingCode: str(pick(raw, 'trackingCode')),
    shipmentStatus: mapShipmentStatus(pick(raw, 'shipmentStatus', 'status')),
    synchronizedOrderId: optNum(pick(raw, 'synchronizedOrderId')),
    synchronizedOrderStatus: synced === undefined ? undefined : mapOrderStatus(synced),
    isPaymentCompleted: paid === undefined ? undefined : paid === true,
  };
}

/** ShipmentFailDeliveryResponse (POST /admin/shipments/{id}/fail-delivery). */
export function mapFailDeliveryResult(raw: Rec, message: string): AdminShipmentActionResult {
  const orderStatus = pick(raw, 'orderStatus');
  const restocked = pick(raw, 'inventoryRestocked');
  return {
    success: true,
    message,
    shipmentId: optNum(pick(raw, 'shipmentId')),
    trackingCode: str(pick(raw, 'trackingCode')),
    shipmentStatus: mapShipmentStatus(pick(raw, 'shipmentStatus', 'status')),
    synchronizedOrderStatus: orderStatus === undefined ? undefined : mapOrderStatus(orderStatus),
    inventoryRestocked: restocked === undefined ? undefined : restocked === true,
    restockedItemsCount: optNum(pick(raw, 'restockedItemsCount')),
  };
}
