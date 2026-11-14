export type OrderStatus = 
  | 'PENDING_PAYMENT'        // Chờ thanh toán (30 phút với QR)
  | 'WAITING_CONFIRMATION'   // Chờ xác nhận (COD)
  | 'CONFIRMED'              // Đã xác nhận 
  | 'PREPARING'              // Đang chuẩn bị hàng
  | 'PICKED_UP'              // Đã lấy hàng (Bưu tá đã lấy hàng từ kho)
  | 'SHIPPING'               // Đang giao (Đã xuất kho)
  | 'COMPLETED'              // Hoàn tất (Doanh thu thuần)
  | 'CANCELLED';             // Đã hủy (Giải phóng kho)

export interface OrderItemSnapshot {
  orderItemId: number;
  variantId: number;
  productId: number;
  productNameSnapshot: string;
  skuSnapshot: string;
  colorSnapshot: string;
  romSnapshot: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  time: string;
  note: string;
}

export interface OrderDetail {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentMethod: 'COD' | 'SIMULATED_TRANSFER' | 'BANK_TRANSFER' | string;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED' | 'PENDING' | 'PARTIALLY_PAID' | string;
  paymentDeadline?: string;
  shippingFee: number;
  subtotal: number;
  voucherDiscount: number;
  totalAmount: number;
  carrier?: string;
  trackingCode?: string;
  cancelReason?: string;
  returnId?: number;
  returnStatus?: 'PENDING' | 'INSPECTING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | string;
  returnReason?: string;
  returnRejectReason?: string;
  returnInspectionResult?: string;
  returnRefundAmount?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  items: OrderItemSnapshot[];
  statusHistory: OrderStatusHistoryItem[];
}

export interface CreateOrderPayload {
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentMethod: 'COD' | 'SIMULATED_TRANSFER' | 'BANK_TRANSFER' | string;
  shippingMethod?: 'standard' | 'express' | string;
  expectedTotalAmount?: number;
  note?: string;
  voucherCode?: string;
  items: {
    variantId: number;
    quantity: number;
  }[];
}

export interface OrderResponse {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  totalAmount: number;
  paymentDeadline?: string;
  createdAt: string;
}

export interface OrderPipelineSummary {
  pendingPayment: number;
  waitingConfirmation: number;
  confirmed: number;
  preparing: number;
  shipping: number;
  completed: number;
  cancelled: number;
}

export interface AdminOrdersPageResponse {
  content: OrderDetail[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  pipelineSummary?: OrderPipelineSummary;
}
