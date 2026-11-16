import { Product } from '../types/product';
import { OrderDetail } from '../types/order';
import { 
  PortalInventoryItem, 
  StockAdjustmentRecord, 
  StockMovementRecord, 
  PortalVoucher, 
  PortalAuditLog, 
  PortalSupportTicket,
  PortalCategory,
  PortalBrandItem,
  PortalReturnRequest,
  PortalShipment,
  PortalFaqItem,
  PortalPromotion
} from '../types/portal';
import { ProductReview } from '../types/review';
import { MOCK_PRODUCTS, MOCK_REVIEWS, MOCK_ORDERS_DETAIL } from './mockData';
import { 
  PORTAL_INVENTORY_ITEMS, 
  PORTAL_STOCK_ADJUSTMENTS, 
  PORTAL_STOCK_MOVEMENTS, 
  PORTAL_VOUCHERS, 
  PORTAL_AUDIT_LOGS, 
  PORTAL_TICKETS, 
  PORTAL_CATEGORIES, 
  PORTAL_BRANDS, 
  PORTAL_SHIPMENTS, 
  PORTAL_RETURN_REQUESTS, 
  PORTAL_FAQS,
  PORTAL_PROMOTIONS
} from './portalMockData';

// Vệ sinh và chuẩn hóa dữ liệu biến thể sản phẩm
export const sanitizeProducts = (loadedProds: Product[]): Product[] => {
  if (!Array.isArray(loadedProds) || loadedProds.length === 0) {
    return [];
  }

  return loadedProds.filter(Boolean).map(p => {
    const defaultProd = MOCK_PRODUCTS.find(dp => dp.productId === p.productId);
    const rawVariants = Array.isArray(p.variants) && p.variants.length > 0
      ? p.variants
      : (defaultProd?.variants || [{
          variantId: (p.productId || Date.now()) + 1,
          productId: p.productId || Date.now(),
          sku: `SKU-${p.productId || Date.now()}`,
          color: 'Tiêu chuẩn',
          colorHex: '#000000',
          ramGb: 8,
          romGb: 128,
          connectionType: '5G',
          listPrice: 20000000,
          salePrice: 18000000,
          onHandQty: 10,
          reservedQty: 0,
          availableQty: 10,
          imageUrl: p.thumbnail || '',
          isActive: true
        }]);

    return {
      ...p,
      productId: p.productId || Date.now(),
      name: p.name || defaultProd?.name || 'Sản phẩm chưa đặt tên',
      brandName: p.brandName || defaultProd?.brandName || 'Khác',
      categoryName: p.categoryName || defaultProd?.categoryName || 'Điện thoại',
      thumbnail: p.thumbnail || defaultProd?.thumbnail || 'https://placehold.co/400x400/f8fafc/64748b?text=Device',
      gallery: Array.isArray(p.gallery) && p.gallery.length > 0 ? p.gallery : [p.thumbnail || defaultProd?.thumbnail || ''],
      specGroups: Array.isArray(p.specGroups) ? p.specGroups : (defaultProd?.specGroups || []),
      highlights: Array.isArray(p.highlights) ? p.highlights : (defaultProd?.highlights || []),
      variants: rawVariants.filter(Boolean).map((v: any, vIdx: number) => {
        let price = Number(v.salePrice);
        if (!price || price <= 0 || isNaN(price)) {
          const defaultVariant = defaultProd?.variants?.find(dv => dv.sku === v.sku);
          price = defaultVariant?.salePrice || v.listPrice || 29490000;
        }
        return {
          ...v,
          variantId: v.variantId || ((p.productId || Date.now()) + vIdx + 1),
          productId: p.productId || Date.now(),
          sku: v.sku || `SKU-${p.productId || Date.now()}-${vIdx + 1}`,
          color: v.color || 'Tiêu chuẩn',
          colorHex: v.colorHex || '#000000',
          ramGb: Number(v.ramGb) || 8,
          romGb: Number(v.romGb) || 128,
          connectionType: v.connectionType || '5G',
          listPrice: Number(v.listPrice) && Number(v.listPrice) > 0 ? Number(v.listPrice) : Math.round(price * 1.15),
          salePrice: price,
          onHandQty: Number(v.onHandQty) >= 0 ? Number(v.onHandQty) : 10,
          reservedQty: Number(v.reservedQty) >= 0 ? Number(v.reservedQty) : 0,
          availableQty: Number(v.availableQty) >= 0 ? Number(v.availableQty) : (Number(v.onHandQty) || 10),
          imageUrl: v.imageUrl || p.thumbnail || defaultProd?.thumbnail || '',
          isActive: v.isActive !== false
        };
      })
    };
  });
};

export const cleanLogNote = (note: string): string => {
  if (!note) return '';
  return note
    .replace(/\s*\(Phiếu xuất kho MB0[1-5]\)/gi, ' (Phiếu xuất kho)')
    .replace(/\s*\(Phiếu MB0[1-5]\)/gi, '')
    .replace(/\s*\(MB0[1-5][^)]*\)/gi, '')
    .replace(/\s*Phiếu xuất kho MB0[1-5]/gi, 'Phiếu xuất kho')
    .replace(/\s*Phiếu MB0[1-5]/gi, '')
    .replace(/\s*MB0[1-5]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const sanitizeOrderNotes = (order: OrderDetail): OrderDetail => {
  if (!order) return order;
  const isCompleted = order.status === 'COMPLETED';
  const isRefunded = order.paymentStatus === 'REFUNDED' || order.paymentStatus === 'PARTIALLY_REFUNDED';
  const effectivePaymentStatus = (isCompleted && !isRefunded) ? 'PAID' : (order.paymentStatus || 'UNPAID');

  return {
    ...order,
    paymentStatus: effectivePaymentStatus,
    statusHistory: order.statusHistory ? order.statusHistory.map(h => ({
      ...h,
      note: cleanLogNote(h.note)
    })) : []
  };
};

export interface DefaultSeedState {
  products: Product[];
  inventories: PortalInventoryItem[];
  orders: OrderDetail[];
  vouchers: PortalVoucher[];
  movements: StockMovementRecord[];
  adjustments: StockAdjustmentRecord[];
  auditLogs: PortalAuditLog[];
  tickets: PortalSupportTicket[];
  reviews: ProductReview[];
  categories: PortalCategory[];
  portalBrands: PortalBrandItem[];
  shipments: PortalShipment[];
  returnRequests: PortalReturnRequest[];
  faqs: PortalFaqItem[];
  promotions: PortalPromotion[];
}

export const getDefaultSeedState = (): DefaultSeedState => ({
  products: sanitizeProducts(MOCK_PRODUCTS),
  inventories: [...PORTAL_INVENTORY_ITEMS],
  orders: MOCK_ORDERS_DETAIL.map(sanitizeOrderNotes),
  vouchers: [...PORTAL_VOUCHERS],
  movements: [...PORTAL_STOCK_MOVEMENTS],
  adjustments: [...PORTAL_STOCK_ADJUSTMENTS],
  auditLogs: [...PORTAL_AUDIT_LOGS],
  tickets: [...PORTAL_TICKETS],
  reviews: [...MOCK_REVIEWS],
  categories: [...PORTAL_CATEGORIES],
  portalBrands: [...PORTAL_BRANDS],
  shipments: [...PORTAL_SHIPMENTS],
  returnRequests: [...PORTAL_RETURN_REQUESTS],
  faqs: [...PORTAL_FAQS],
  promotions: [...PORTAL_PROMOTIONS],
});
