export interface PortalInventoryItem {
  inventoryId?: number;
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  color: string;
  romGb: number;
  onHandQty: number;      // Tồn thực tế vật lý (Q)
  reservedQty: number;    // Tồn đang giữ chỗ (R)
  availableQty: number;   // Tồn khả dụng (A = Q - R)
  minThreshold: number;   // Ngưỡng an toàn (Low stock alert)
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  updatedAt?: string;
}

export interface StockAdjustmentRecord {
  id: number;
  formCode: string;       // PKK-xxxx hoặc MB05-xxxx
  sku: string;
  productName: string;
  qtySystem: number;      // Số lượng trên phần mềm trước điều chỉnh
  qtyActual: number;      // Số lượng đếm được thực tế kiểm kê
  qtyDiff: number;        // Chênh lệch (+ thừa, - thiếu)
  reason: string;         // Bắt buộc nhập lý do
  performedBy: string;
  createdAt: string;
  status: 'APPROVED' | 'PENDING';
}

export interface StockMovementRecord {
  txnId: number;
  formCode: string;       // PXK, PNK, PKK, MB03, MB05
  sku: string;
  productName: string;
  txnType: 'EXPORT' | 'RETURN' | 'ADJUST' | 'IMPORT' | 'ADJUSTMENT' | string;
  quantityChange: number;
  qtyBefore: number;
  qtyAfter: number;
  orderId?: number;
  reason: string;
  performedBy: string;
  performedAt: string;
}

export interface PortalVoucher {
  voucherId: number;
  code: string;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  usageLimit: number;
  usedCount: number;
  startAt: string;
  expiredAt: string;
  isActive: boolean;
}

export interface PortalUser {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED';
  lockReason?: string;
  createdAt: string;
  totalOrders: number;
}

export interface PortalAuditLog {
  logId: number;
  performedBy: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}

export interface PortalSupportTicket {
  ticketId: number;
  customerName: string;
  phone: string;
  category: string;
  content: string;
  status: 'WAITING' | 'RESOLVED' | 'REJECTED';
  reply?: string;
  handledBy?: string;
  createdAt: string;
  handledAt?: string;
}

// Bảng Categories (Bảng 3 Database)
export interface PortalCategory {
  categoryId: number;
  parentId: number | null;
  name: string;
  description: string;
  isVisible: boolean;
  sortOrder: number;
  productCount?: number;
}

// Bảng Brands (Bảng 4 Database)
export interface PortalBrandItem {
  brandId: number;
  name: string;
  logoUrl?: string;
  description: string;
  isVisible: boolean;
  productCount?: number;
}

// Bảng Return_Requests (Bảng 21 Database)
export type ReturnRequestStatus = 'PENDING' | 'INSPECTING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';

export interface PortalReturnRequest {
  returnId: number;
  orderId: number;
  orderCode: string;
  userId: number;
  requestedBy: string;
  phone: string;
  reason: string;
  status: ReturnRequestStatus;
  inspectionResult?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  refundAmount?: number;
  rejectReason?: string;
  createdAt: string;
  items: {
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }[];
}

// Bảng Shipments (Bảng 19 Database)
export type ShipmentStatus = 
  | 'NONE'              // Chưa tạo vận đơn (Đơn hàng đang xử lý)
  | 'PREPARING'         // Đang chuẩn bị hàng (Trạng thái đầu tiên khi đơn hàng vừa đẩy sang)
  | 'PICKED_UP'         // Đã lấy hàng (Bưu tá đã nhận kiện hàng)
  | 'IN_TRANSIT'        // Đang giao hàng (Đang luân chuyển bưu cục)
  | 'DELIVERED'         // Giao thành công (Khách đã nhận máy)
  | 'DELIVERY_FAILED'   // Giao thất bại (Đồng bộ: Đơn hàng bị hủy)
  | 'WAITING_PICKUP'    // Tương thích: Đang chuẩn bị hàng
  | 'PENDING'           // Tương thích: Đang chuẩn bị hàng
  | 'PICKUP_FAILED'     // Tương thích: Giao thất bại
  | 'FAILED'            // Tương thích: Giao thất bại
  | 'READY_TO_PICK'
  | 'PICKED'
  | 'FAILED_DELIVERY'
  | 'CANCELLED';

export interface PortalShipment {
  shipmentId: number;
  orderId: number;
  orderCode: string;
  carrier: string; // 'Giao Hàng Nhanh' | 'ViettelPost' | 'GHTK' | 'Hỏa tốc 2H'
  trackingCode: string;
  status: ShipmentStatus;
  failReason?: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  codAmount: number;
  updatedBy?: string;
  updatedAt: string;
}

// Bảng FAQs (Bảng 24 Database)
export interface PortalFaqItem {
  faqId: number;
  topic: string;
  question: string;
  answer: string;
  isVisible: boolean;
  sortOrder: number;
}

// Bảng Promotions (Bảng 11 Database) & Promotion_Variants (Bảng 12 Database)
export type PromotionStatus = 'ACTIVE' | 'UPCOMING' | 'PAUSED' | 'ENDED';

export interface PortalPromotionVariant {
  promoVariantId: number;
  promotionId: number;
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  color: string;
  romGb: number;
  listPrice: number;
  promoPrice: number;
}

export interface PortalPromotion {
  promotionId: number;
  name: string;
  description?: string;
  startAt: string;
  endAt: string;
  status: PromotionStatus;
  createdBy: string;
  createdAt: string;
  variants: PortalPromotionVariant[];
}
