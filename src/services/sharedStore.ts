import { Product, ProductVariant, Brand } from '../types/product';
import { OrderDetail, OrderStatus, CreateOrderPayload, OrderResponse, OrderItemSnapshot } from '../types/order';
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
  PortalPromotion,
  PortalPromotionVariant
} from '../types/portal';
import { ProductReview } from '../types/review';
import { BRANDS } from './mockData';
import { PORTAL_PROMOTIONS } from './portalMockData';
import { notificationService } from './notificationService';
import { 
  getDefaultSeedState, 
  cleanLogNote, 
  sanitizeOrderNotes, 
  sanitizeProducts 
} from './sharedStoreSeeds';

export { cleanLogNote, sanitizeOrderNotes, sanitizeProducts };

const saveToStorage = (key: string, data: any) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(data));
    }
  } catch {
    // ignore storage quota errors
  }
};

const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
};
const STORAGE_KEY_PRODUCTS = 'ng_db_products_v3';
const STORAGE_KEY_INVENTORY = 'ng_db_inventory_v2';
const STORAGE_KEY_ORDERS = 'ng_db_orders_v2';
const STORAGE_KEY_VOUCHERS = 'ng_db_vouchers_v2';
const STORAGE_KEY_MOVEMENTS = 'ng_db_movements_v2';
const STORAGE_KEY_ADJUSTMENTS = 'ng_db_adjustments_v2';
const STORAGE_KEY_AUDIT = 'ng_db_audit_v2';
const STORAGE_KEY_TICKETS = 'ng_db_tickets_v2';
const STORAGE_KEY_REVIEWS = 'ng_db_reviews_v2';
const STORAGE_KEY_CATEGORIES = 'ng_db_categories_v3';
const STORAGE_KEY_BRANDS = 'ng_db_brands_v2';
const STORAGE_KEY_SHIPMENTS = 'ng_db_shipments_v2';
const STORAGE_KEY_RETURNS = 'ng_db_returns_v2';
const STORAGE_KEY_FAQS = 'ng_db_faqs_v2';
const STORAGE_KEY_PROMOTIONS = 'ng_db_promotions_v2';

const initialSeed = getDefaultSeedState();

let products: Product[] = loadFromStorage(STORAGE_KEY_PRODUCTS, initialSeed.products);
let inventories: PortalInventoryItem[] = loadFromStorage(STORAGE_KEY_INVENTORY, initialSeed.inventories);
let orders: OrderDetail[] = loadFromStorage(STORAGE_KEY_ORDERS, initialSeed.orders);
let vouchers: PortalVoucher[] = loadFromStorage(STORAGE_KEY_VOUCHERS, initialSeed.vouchers);
let movements: StockMovementRecord[] = loadFromStorage(STORAGE_KEY_MOVEMENTS, initialSeed.movements);
let adjustments: StockAdjustmentRecord[] = loadFromStorage(STORAGE_KEY_ADJUSTMENTS, initialSeed.adjustments);
let auditLogs: PortalAuditLog[] = loadFromStorage(STORAGE_KEY_AUDIT, initialSeed.auditLogs);
let tickets: PortalSupportTicket[] = loadFromStorage(STORAGE_KEY_TICKETS, initialSeed.tickets);
let reviews: ProductReview[] = loadFromStorage(STORAGE_KEY_REVIEWS, initialSeed.reviews);
let categories: PortalCategory[] = loadFromStorage(STORAGE_KEY_CATEGORIES, initialSeed.categories);
let portalBrands: PortalBrandItem[] = loadFromStorage(STORAGE_KEY_BRANDS, initialSeed.portalBrands);
let shipments: PortalShipment[] = loadFromStorage(STORAGE_KEY_SHIPMENTS, initialSeed.shipments);
let returnRequests: PortalReturnRequest[] = loadFromStorage(STORAGE_KEY_RETURNS, initialSeed.returnRequests);
let faqs: PortalFaqItem[] = loadFromStorage(STORAGE_KEY_FAQS, initialSeed.faqs);
let promotions: PortalPromotion[] = loadFromStorage(STORAGE_KEY_PROMOTIONS, initialSeed.promotions);

// Listeners thông báo cập nhật
type Listener = () => void;
const listeners: Set<Listener> = new Set();

const notify = () => {
  listeners.forEach(l => l());
};

export const sharedStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // KHÔI PHỤC DỮ LIỆU GỐC CHUẨN
  resetToDefault() {
    const fresh = getDefaultSeedState();
    products = fresh.products;
    inventories = fresh.inventories;
    orders = fresh.orders;
    vouchers = fresh.vouchers;
    movements = fresh.movements;
    adjustments = fresh.adjustments;
    auditLogs = fresh.auditLogs;
    tickets = fresh.tickets;
    reviews = fresh.reviews;
    categories = fresh.categories;
    portalBrands = fresh.portalBrands;
    shipments = fresh.shipments;
    returnRequests = fresh.returnRequests;
    faqs = fresh.faqs;
    promotions = fresh.promotions;

    notify();
  },

  // GETTERS
  getProducts(): Product[] {
    return products;
  },



  setProducts(prods: Product[]) {

    products = prods;

    saveToStorage(STORAGE_KEY_PRODUCTS, products);

    for (const p of prods) {

      if (p.variants) {

        for (const v of p.variants) {

          let existing = inventories.find(inv => Number(inv.variantId) === Number(v.variantId));

          const onHand = v.onHandQty ?? v.availableQty ?? 25;

          const reserved = v.reservedQty ?? 0;

          const avail = v.availableQty !== undefined ? v.availableQty : Math.max(0, onHand - reserved);

          if (!existing) {

            const newInv: PortalInventoryItem = {
              inventoryId: v.variantId,
              variantId: v.variantId,
              productId: p.productId,
              productName: p.name,
              sku: v.sku || ("SKU-" + v.variantId),
              color: v.color,
              romGb: v.romGb,
              onHandQty: onHand,
              reservedQty: reserved,
              availableQty: avail,
              minThreshold: 5,
              status: avail > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
            };
            inventories.push(newInv);

          } else {

            existing.onHandQty = onHand;

            existing.availableQty = avail;

            existing.sku = v.sku || existing.sku;

            existing.productName = p.name || existing.productName;

          }

        }

      }

    }

    saveToStorage(STORAGE_KEY_INVENTORY, inventories);

    notify();

  },



  syncExternalProduct(prod: Product) {

    const idx = products.findIndex(p => p.productId === prod.productId);

    if (idx !== -1) {

      products[idx] = prod;

    } else {

      products.unshift(prod);

    }

    this.setProducts(products);

  },

  getProductById(id: number): Product | undefined {
    return products.find(p => p.productId === id);
  },

  addProduct(newProd: Product): boolean {
    products.unshift(newProd);
    saveToStorage(STORAGE_KEY_PRODUCTS, products);
    notify();
    return true;
  },

  deleteProduct(productId: number): boolean {
    products = products.filter(p => p.productId !== productId);
    inventories = inventories.filter(i => i.productId !== productId);
    saveToStorage(STORAGE_KEY_PRODUCTS, products);
    saveToStorage(STORAGE_KEY_INVENTORY, inventories);
    notify();
    return true;
  },

  updateProduct(productId: number, data: Partial<Product>): boolean {
    const idx = products.findIndex(p => p.productId === productId);
    if (idx === -1) return false;
    const updated = { ...products[idx], ...data };
    if (data.status === 'INACTIVE' && Array.isArray(updated.variants)) {
      updated.variants = updated.variants.map(v => ({ ...v, isActive: false }));
    } else if (data.status === 'ACTIVE' && Array.isArray(updated.variants)) {
      updated.variants = updated.variants.map(v => ({ ...v, isActive: true }));
    }
    products[idx] = updated;
    saveToStorage(STORAGE_KEY_PRODUCTS, products);
    notify();
    return true;
  },

  updateProductStatus(productId: number, status: 'ACTIVE' | 'INACTIVE'): boolean {
    return this.updateProduct(productId, { status });
  },

  updateVariant(productId: number, variantId: number, data: Partial<ProductVariant>): boolean {
    const prod = products.find(p => p.productId === productId);
    if (!prod || !Array.isArray(prod.variants)) return false;
    const vIdx = prod.variants.findIndex(v => v.variantId === variantId);
    if (vIdx === -1) return false;
    prod.variants[vIdx] = { ...prod.variants[vIdx], ...data };
    saveToStorage(STORAGE_KEY_PRODUCTS, products);
    notify();
    return true;
  },

  syncExternalBrands(brandsList: any[]) {

    if (!Array.isArray(brandsList)) return;

    portalBrands = brandsList.map((b, idx) => ({

      brandId: b.brandId,

      name: b.name,

      slug: (b as any).slug || b.name.toLowerCase().replace(/\s+/g, '-'),

      logoUrl: b.logoUrl,

      description: b.description,

      isVisible: b.isVisible !== false,

      productCount: b.totalProducts || 0,

      createdAt: new Date().toISOString()

    }));

    saveToStorage(STORAGE_KEY_BRANDS, portalBrands);
    notify();

  },



  getBrands(category?: string): Brand[] {
    const sourceBrands: Brand[] = portalBrands.length > 0
      ? portalBrands
          .filter(b => b.isVisible !== false)
          .map(b => ({
            brandId: b.brandId,
            name: b.name,
            slug: b.slug || b.name.toLowerCase().replace(/\s+/g, '-'),
            logoUrl: b.logoUrl,
          }))
      : BRANDS;

    if (!category || category === 'all') {
      return sourceBrands;
    }

    const lowerCat = category.toLowerCase();
    const currentProds = this.getProducts();

    let filtered = currentProds;
    if (lowerCat === 'phone') {
      filtered = currentProds.filter(p => p.categoryName.toLowerCase().includes('điện thoại'));
    } else if (lowerCat === 'laptop') {
      filtered = currentProds.filter(p => p.categoryName.toLowerCase().includes('laptop'));
    } else if (lowerCat === 'tablet') {
      filtered = currentProds.filter(p => p.categoryName.toLowerCase().includes('máy tính bảng'));
    } else if (lowerCat === 'accessory') {
      filtered = currentProds.filter(p => p.categoryName.toLowerCase().includes('phụ kiện'));
    } else if (lowerCat === 'sale') {
      filtered = currentProds.filter(p =>!!p.isFlashSale);
    }

    const brandsInProducts = new Set(filtered.map(p => p.brandName.toLowerCase().trim()));

    return sourceBrands.filter(b =>
      brandsInProducts.has(b.name.toLowerCase().trim()) ||
      brandsInProducts.has(b.slug.toLowerCase().trim())
    );
  },

  getInventories(): PortalInventoryItem[] {
    return inventories;
  },

  getOrders(): OrderDetail[] {
    return [...orders].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (Number(b.orderId) || 0) - (Number(a.orderId) || 0);
    }).map(sanitizeOrderNotes);
  },

  syncExternalOrders(remoteOrders: OrderDetail[]) {
    if (!Array.isArray(remoteOrders)) return;
    for (const ro of remoteOrders) {
      const idx = orders.findIndex(o => Number(o.orderId) === Number(ro.orderId) || o.orderCode === ro.orderCode);
      if (idx !== -1) {
        const localStatus = orders[idx].status;
        const preserveLocalPreparing = (localStatus === 'PREPARING' && ro.status === 'CONFIRMED');
        const preserveLocalPickedUp = (localStatus === 'PICKED_UP' && (ro.status === 'CONFIRMED' || ro.status === 'PREPARING'));
        const finalStatus = preserveLocalPreparing ? 'PREPARING' : (preserveLocalPickedUp ? 'PICKED_UP' : ro.status);
        orders[idx] = { 
          ...orders[idx], 
          ...ro,
          status: finalStatus,
          statusHistory: (preserveLocalPreparing || preserveLocalPickedUp) ? orders[idx].statusHistory : (ro.statusHistory?.length ? ro.statusHistory : orders[idx].statusHistory)
        };
      } else {
        orders.push(ro);
      }
    }
    // Luôn sắp xếp đơn hàng mới nhất lên đầu
    orders.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (Number(b.orderId) || 0) - (Number(a.orderId) || 0);
    });
    saveToStorage(STORAGE_KEY_ORDERS, orders);
  },

  getOrderById(orderId: number): OrderDetail | undefined {
    const o = orders.find(ord => ord.orderId === orderId);
    return o ? sanitizeOrderNotes(o) : undefined;
  },

  getOrderByCode(code: string): OrderDetail | undefined {
    const trimmed = code.trim().toUpperCase().replace('#', '');
    const o = orders.find(ord => ord.orderCode.toUpperCase().includes(trimmed));
    return o ? sanitizeOrderNotes(o) : undefined;
  },

  getVouchers(): PortalVoucher[] {
    return vouchers;
  },

  setVouchers(newVouchers: PortalVoucher[]): void {
    vouchers = newVouchers;
    saveToStorage(STORAGE_KEY_VOUCHERS, vouchers);
    notify();
  },

  getMovements(): StockMovementRecord[] {
    return movements;
  },

  getAdjustments(): StockAdjustmentRecord[] {
    return adjustments;
  },

  getAuditLogs(): PortalAuditLog[] {
    return auditLogs;
  },

  getTickets(): PortalSupportTicket[] {
    return tickets;
  },

  addTicket(ticket: PortalSupportTicket): void {
    const existingIdx = tickets.findIndex(t => t.ticketId === ticket.ticketId);
    if (existingIdx >= 0) {
      tickets[existingIdx] = { ...tickets[existingIdx], ...ticket };
    } else {
      tickets.unshift(ticket);
    }
    saveToStorage(STORAGE_KEY_TICKETS, tickets);
    notify();
  },

  updateTicket(ticketId: number, data: Partial<PortalSupportTicket>): void {
    const idx = tickets.findIndex(t => t.ticketId === ticketId);
    if (idx >= 0) {
      tickets[idx] = { ...tickets[idx], ...data };
      saveToStorage(STORAGE_KEY_TICKETS, tickets);
      notify();
    }
  },

  setTickets(newTickets: PortalSupportTicket[]): void {
    tickets = newTickets;
    saveToStorage(STORAGE_KEY_TICKETS, tickets);
    notify();
  },

  syncTicketsFromBackend(remoteTickets: PortalSupportTicket[]): void {
    let changed = false;
    remoteTickets.forEach(rt => {
      const idx = tickets.findIndex(t => t.ticketId === rt.ticketId);
      if (idx >= 0) {
        if (tickets[idx].status !== rt.status || tickets[idx].reply !== rt.reply) {
          tickets[idx] = { ...tickets[idx], ...rt };
          changed = true;
        }
      } else {
        tickets.unshift(rt);
        changed = true;
      }
    });
    if (changed) {
      saveToStorage(STORAGE_KEY_TICKETS, tickets);
    }
  },

  isReviewHidden(reviewId: number): boolean {
    return reviews.some(r => Number(r.reviewId) === Number(reviewId) && r.status === 'HIDDEN');
  },

  getReviews(productId?: number, includeHidden = false): ProductReview[] {
    const normalized = reviews.map(r => ({
      ...r,
      status: r.status === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED',
    }));
    const byProduct = productId
      ? normalized.filter(r => Number(r.productId) === Number(productId))
      : normalized;
    return includeHidden ? byProduct : byProduct.filter(r => r.status !== 'HIDDEN');
  },

  updateReviewStatus(
    reviewId: number,
    status: 'PUBLISHED' | 'HIDDEN',
    reviewSnapshot?: ProductReview
  ): ProductReview | null {
    const id = Number(reviewId);
    const idx = reviews.findIndex(r => Number(r.reviewId) === id);
    let updated: ProductReview | null = null;
    if (idx !== -1) {
      reviews[idx] = { ...reviews[idx], status };
      updated = reviews[idx];
    } else if (reviewSnapshot) {
      updated = { ...reviewSnapshot, status };
      reviews = [updated, ...reviews];
    }
    saveToStorage(STORAGE_KEY_REVIEWS, reviews);
    notify();
    return updated;
  },

  replyReview(reviewId: number, replyText: string): ProductReview | null {
    const idx = reviews.findIndex(r => Number(r.reviewId) === Number(reviewId));
    if (idx === -1) return null;
    reviews[idx] = {
      ...reviews[idx],
      storeReply: replyText,
      reply: replyText,
      repliedAt: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEY_REVIEWS, reviews);
    notify();
    return reviews[idx];
  },

  // ================= BẢNG 3: CATEGORIES =================
  getCategories(): PortalCategory[] {
    return categories;
  },

  setCategories(newCats: PortalCategory[]): void {
    categories = newCats;
    saveToStorage(STORAGE_KEY_CATEGORIES, categories);
    notify();
  },

  addCategory(data: Omit<PortalCategory, 'categoryId' | 'productCount'>): PortalCategory {
    const newCat: PortalCategory = {...data,
      categoryId: Date.now(),
      productCount: 0
    };
    categories.push(newCat);
    saveToStorage(STORAGE_KEY_CATEGORIES, categories);
    notify();
    return newCat;
  },

  updateCategory(id: number, data: Partial<PortalCategory>): boolean {
    const idx = categories.findIndex(c => c.categoryId === id);
    if (idx === -1) return false;
    categories[idx] = {...categories[idx],...data };
    saveToStorage(STORAGE_KEY_CATEGORIES, categories);
    notify();
    return true;
  },

  deleteCategory(id: number): { success: boolean; message: string } {
    const cat = categories.find(c => c.categoryId === id);
    if (!cat) return { success: false, message: 'Danh mục không tồn tại' };

    // Kiểm tra ràng buộc toàn vẹn: không cho xóa nếu có sản phẩm hoặc có danh mục con
    const hasProducts = products.some(p => p.categoryName.toLowerCase() === cat.name.toLowerCase());
    if (hasProducts) {
      return {
        success: false,
        message: `Ràng buộc toàn vẹn: Không thể xóa danh mục "${cat.name}" vì đang có sản phẩm liên kết!`
      };
    }
    const hasChildren = categories.some(c => c.parentId === id);
    if (hasChildren) {
      return {
        success: false,
        message: `Không thể xóa danh mục "${cat.name}" vì đang có danh mục cấp con trực thuộc!`
      };
    }

    categories = categories.filter(c => c.categoryId!== id);
    saveToStorage(STORAGE_KEY_CATEGORIES, categories);
    notify();
    return { success: true, message: `Đã xóa danh mục "${cat.name}" thành công!` };
  },

  toggleCategoryVisibility(id: number): boolean {
    const cat = categories.find(c => c.categoryId === id);
    if (!cat) return false;
    cat.isVisible =!cat.isVisible;
    saveToStorage(STORAGE_KEY_CATEGORIES, categories);
    notify();
    return true;
  },

  // ================= BẢNG 4: BRANDS =================
  getPortalBrands(): PortalBrandItem[] {
    return portalBrands;
  },

  addBrand(data: Omit<PortalBrandItem, 'brandId' | 'productCount'>): PortalBrandItem {
    const newBrand: PortalBrandItem = {...data,
      brandId: Date.now(),
      productCount: 0
    };
    portalBrands.push(newBrand);
    saveToStorage(STORAGE_KEY_BRANDS, portalBrands);
    notify();
    return newBrand;
  },

  updateBrand(id: number, data: Partial<PortalBrandItem>): boolean {
    const idx = portalBrands.findIndex(b => b.brandId === id);
    if (idx === -1) return false;
    portalBrands[idx] = {...portalBrands[idx],...data };
    saveToStorage(STORAGE_KEY_BRANDS, portalBrands);
    notify();
    return true;
  },

  deleteBrand(id: number): { success: boolean; message: string } {
    const b = portalBrands.find(br => br.brandId === id);
    if (!b) return { success: false, message: 'Thương hiệu không tồn tại' };

    const hasProducts = products.some(p => p.brandName.toLowerCase() === b.name.toLowerCase());
    if (hasProducts) {
      return {
        success: false,
        message: `Ràng buộc toàn vẹn: Không thể xóa thương hiệu "${b.name}" vì có sản phẩm đang kinh doanh!`
      };
    }

    portalBrands = portalBrands.filter(br => br.brandId!== id);
    saveToStorage(STORAGE_KEY_BRANDS, portalBrands);
    notify();
    return { success: true, message: `Đã xóa thương hiệu "${b.name}" thành công!` };
  },

  toggleBrandVisibility(id: number): boolean {
    const b = portalBrands.find(br => br.brandId === id);
    if (!b) return false;
    b.isVisible =!b.isVisible;
    saveToStorage(STORAGE_KEY_BRANDS, portalBrands);
    notify();
    return true;
  },

  // ================= BẢNG 19: SHIPMENTS =================
  getShipments(): PortalShipment[] {
    return shipments;
  },



  syncExternalShipments(remoteShipments: PortalShipment[]) {

    if (!Array.isArray(remoteShipments)) return;

    for (const rs of remoteShipments) {

      const idx = shipments.findIndex(s => 

        Number(s.shipmentId) === Number(rs.shipmentId) || 

        (s.trackingCode && s.trackingCode === rs.trackingCode) ||

        (s.orderCode && s.orderCode === rs.orderCode)

      );

      if (idx !== -1) {

        shipments[idx] = { ...shipments[idx], ...rs };

      } else {

        shipments.push(rs);

      }

    }

    saveToStorage(STORAGE_KEY_SHIPMENTS, shipments);

  },

  createShipmentForOrder(order: OrderDetail, carrier = 'Giao Hàng Nhanh Express', staffName = 'Hệ thống tự động'): PortalShipment {
    const existing = shipments.find(s => s.orderId === order.orderId || s.orderCode === order.orderCode);
    if (existing) {
      existing.status = 'PREPARING';
      existing.updatedAt = new Date().toISOString();
      order.carrier = existing.carrier || carrier;
      order.trackingCode = existing.trackingCode;
      saveToStorage(STORAGE_KEY_SHIPMENTS, shipments);
      saveToStorage(STORAGE_KEY_ORDERS, orders);
      notify();
      return existing;
    }

    const newShipment: PortalShipment = {
      shipmentId: Date.now() + Math.floor(Math.random() * 100),
      orderId: order.orderId,
      orderCode: order.orderCode,
      carrier,
      trackingCode: `GHN-${order.orderCode.replace(/[^0-9]/g, '') || Math.floor(10000000 + Math.random() * 90000000)}`,
      status: 'PREPARING', // Trạng thái đầu tiên của bên vận đơn khi vừa đẩy sang: Đang chuẩn bị hàng
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      shippingAddress: order.shippingAddress,
      codAmount: order.paymentMethod === 'COD' && order.paymentStatus === 'UNPAID'? order.totalAmount: 0,
      updatedBy: staffName,
      updatedAt: new Date().toISOString()
    };

    shipments.unshift(newShipment);
    saveToStorage(STORAGE_KEY_SHIPMENTS, shipments);

    order.carrier = newShipment.carrier;
    order.trackingCode = newShipment.trackingCode;
    saveToStorage(STORAGE_KEY_ORDERS, orders);

    this.addAuditLog({
      performedBy: staffName,
      action: 'CREATE_SHIPMENT',
      entityName: 'Shipments',
      entityId: newShipment.trackingCode,
      oldValue: 'Chưa tạo vận đơn',
      newValue: `Khởi tạo vận đơn tự động: Đang chuẩn bị hàng (${newShipment.carrier})`
    });

    notify();
    return newShipment;
  },

  updateShipmentStatus(
    shipmentId: number, 
    status: PortalShipment['status'], 
    failReason?: string, 
    staffName = 'Điều phối viên giao vận',
    shipmentContext?: Partial<PortalShipment>
  ): { success: boolean; message: string } {
    let ship = shipments.find(s => 
      Number(s.shipmentId) === Number(shipmentId) || 
      (shipmentContext?.trackingCode && s.trackingCode === shipmentContext.trackingCode) ||
      (shipmentContext?.orderCode && s.orderCode === shipmentContext.orderCode) ||
      (shipmentContext?.orderId && Number(s.orderId) === Number(shipmentContext.orderId))
    );

    if (!ship && shipmentContext) {
      ship = {
        shipmentId: Number(shipmentId) || Date.now(),
        orderId: Number(shipmentContext.orderId || 0),
        orderCode: shipmentContext.orderCode || ("DH-" + shipmentId),
        carrier: shipmentContext.carrier || 'Giao Hàng Nhanh Express',
        trackingCode: shipmentContext.trackingCode || ("GHN-" + shipmentId),
        status,
        recipientName: shipmentContext.recipientName || 'Khách hàng',
        recipientPhone: shipmentContext.recipientPhone || '',
        shippingAddress: shipmentContext.shippingAddress || '',
        codAmount: shipmentContext.codAmount || 0,
        failReason,
        updatedBy: staffName,
        updatedAt: new Date().toISOString()
      };
      shipments.unshift(ship);
    }

    if (!ship) return { success: false, message: 'Không tìm thấy vận đơn tương ứng' };

    const oldStatus = ship.status;
    ship.status = status;
    if (failReason) ship.failReason = failReason;
    ship.updatedBy = staffName;
    ship.updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEY_SHIPMENTS, shipments);

    const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

    // ĐỒNG BỘ TỰ ĐỘNG SANG BẢNG ORDERS THEO ĐÚNG TIẾN TRÌNH VẬN HÀNH
    const targetOrderCode = ship.orderCode || shipmentContext?.orderCode;
    const targetOrderId = ship.orderId || shipmentContext?.orderId;
    const targetTracking = ship.trackingCode || shipmentContext?.trackingCode;

    const ord = orders.find(o => 
      (targetOrderCode && (o.orderCode === targetOrderCode || o.orderCode.toUpperCase().includes(targetOrderCode.toUpperCase()))) ||
      (targetOrderId && (Number(o.orderId) === Number(targetOrderId) || String(o.orderId) === String(targetOrderId))) ||
      (targetTracking && o.trackingCode === targetTracking)
    );
    if (ord) {
      if (status === 'PREPARING') {
        ord.status = 'PREPARING';
      } else if (status === 'PICKED_UP') {
        ord.status = 'PICKED_UP';
        ord.carrier = ship.carrier;
        ord.trackingCode = ship.trackingCode;
        ord.statusHistory = ord.statusHistory || [];
        ord.statusHistory.unshift({
          status: 'PICKED_UP',
          time: nowTimeStr,
          note: "Bưu tá đã lấy hàng từ kho thành công (Vận đơn " + ship.trackingCode + ": Đã lấy hàng)."
        });
      } else if (status === 'IN_TRANSIT') {
        ord.status = 'SHIPPING';
        ord.carrier = ship.carrier;
        ord.trackingCode = ship.trackingCode;
        ord.statusHistory = ord.statusHistory || [];
        ord.statusHistory.unshift({
          status: 'SHIPPING',
          time: nowTimeStr,
          note: "Kiện hàng đang trên đường vận chuyển tới địa chỉ người nhận (Vận đơn " + ship.trackingCode + ": Đang giao hàng)."
        });
      } else if (status === 'DELIVERED') {
        ord.status = 'COMPLETED';
        ord.paymentStatus = 'PAID';
        ord.completedAt = new Date().toISOString();
        ord.statusHistory = ord.statusHistory || [];
        ord.statusHistory.unshift({
          status: 'COMPLETED',
          time: nowTimeStr,
          note: "Khách hàng đã nhận thiết bị thành công (Vận đơn " + ship.trackingCode + ": Giao thành công). Ghi nhận doanh thu thuần."
        });
      } else if (status === 'DELIVERY_FAILED' || status === 'FAILED' || status === 'PICKUP_FAILED') {
        ord.status = 'RETURNING';
        ord.carrier = ship.carrier;
        ord.trackingCode = ship.trackingCode;
        ord.cancelReason = failReason ? `Giao hàng thất bại: ${failReason}` : 'Giao hàng thất bại';
        if (ord.paymentStatus === 'PAID') {
          ord.paymentStatus = 'REFUND_PENDING';
        }
        ord.statusHistory = ord.statusHistory || [];
        ord.statusHistory.unshift({
          status: 'RETURNING',
          time: nowTimeStr,
          note: `Giao hàng không thành công (Vận đơn ${ship.trackingCode}${failReason ? `: ${failReason}` : ''}). Kiện hàng đang hoàn về kho.`
        });
      }

      ord.updatedAt = new Date().toISOString();
      saveToStorage(STORAGE_KEY_ORDERS, orders);

      const shipmentNotifTitles: Partial<Record<string, string>> = {
        PICKED_UP: "Bưu tá đã lấy kiện hàng #" + ord.orderCode,
        IN_TRANSIT: "Đơn hàng #" + ord.orderCode + " đang trên đường giao!",
        DELIVERED: "Giao hàng thành công đơn #" + ord.orderCode,
        DELIVERY_FAILED: "Giao hàng không thành công #" + ord.orderCode,
      };
      if (shipmentNotifTitles[status]) {
        notificationService.notifyOrderProgress({
          userId: (ord as any).userId || 1,
          orderId: ord.orderId,
          orderCode: ord.orderCode,
          status: status === 'DELIVERY_FAILED' ? 'RETURNING' : status,
          note: ord.statusHistory?.[0]?.note || ("Vận đơn " + ship.trackingCode + " đã cập nhật: " + status + "."),
        });
      }
    }

    this.addAuditLog({
      performedBy: staffName,
      action: 'UPDATE_SHIPMENT_STATUS',
      entityName: 'Shipments',
      entityId: ship.trackingCode,
      oldValue: oldStatus,
      newValue: "Cập nhật sang " + status + (failReason ? (" (Lý do: " + failReason + ")") : "") + " - Tự động đồng bộ Orders"
    });

    notify();
    return { success: true, message: "Cập nhật vận đơn " + ship.trackingCode + " sang " + status + " và đồng bộ Đơn hàng thành công!" };
  },

  // ================= BẢNG 21: RETURN_REQUESTS =================
  getReturnRequests(): PortalReturnRequest[] {
    return returnRequests;
  },

  syncExternalReturns(remoteReturns: PortalReturnRequest[]) {
    if (!Array.isArray(remoteReturns)) return;
    for (const rr of remoteReturns) {
      const idx = returnRequests.findIndex(r => r.returnId === rr.returnId || (r.orderCode && rr.orderCode && r.orderCode.replace(/^#/, '') === rr.orderCode.replace(/^#/, '')));
      if (idx !== -1) {
        returnRequests[idx] = { ...returnRequests[idx], ...rr };
      } else {
        returnRequests.unshift(rr);
      }

      // Đồng bộ sang order
      const ord = orders.find(o => {
        const matchId = o.orderId && rr.orderId && Number(o.orderId) === Number(rr.orderId);
        const oCode = (o.orderCode || '').trim().toLowerCase().replace(/^#/, '');
        const rCode = (rr.orderCode || '').trim().toLowerCase().replace(/^#/, '');
        const matchCode = Boolean(oCode && rCode && (oCode === rCode || oCode.includes(rCode) || rCode.includes(oCode)));
        return matchId || matchCode;
      });

      if (ord) {
        ord.returnId = rr.returnId;
        ord.returnStatus = rr.status;
        ord.returnReason = rr.reason;
        if (rr.rejectReason) ord.returnRejectReason = rr.rejectReason;
        if (rr.inspectionResult) ord.returnInspectionResult = rr.inspectionResult;
        if (rr.refundAmount !== undefined) ord.returnRefundAmount = rr.refundAmount;
        if (rr.status === 'APPROVED') {
          const isPartial = rr.refundAmount !== undefined && rr.refundAmount < ord.totalAmount;
          ord.paymentStatus = isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED';
        }
      }
    }
    saveToStorage(STORAGE_KEY_RETURNS, returnRequests);
    saveToStorage(STORAGE_KEY_ORDERS, orders);
    notify();
  },

  createReturnRequest(req: Omit<PortalReturnRequest, 'returnId' | 'status' | 'createdAt'>): PortalReturnRequest {
    const newReq: PortalReturnRequest = {
      ...req,
      returnId: Date.now(),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    returnRequests.unshift(newReq);
    saveToStorage(STORAGE_KEY_RETURNS, returnRequests);

    // Đồng bộ trực tiếp sang orders để giao diện trang Đơn hàng nhận diện ngay
    const ord = orders.find(o => {
      const matchId = o.orderId && req.orderId && Number(o.orderId) === Number(req.orderId);
      const oCode = (o.orderCode || '').trim().toLowerCase().replace(/^#/, '');
      const rCode = (req.orderCode || '').trim().toLowerCase().replace(/^#/, '');
      const matchCode = Boolean(oCode && rCode && (oCode === rCode || oCode.includes(rCode) || rCode.includes(oCode)));
      return matchId || matchCode;
    });
    if (ord) {
      ord.returnId = newReq.returnId;
      ord.returnStatus = 'PENDING';
      ord.returnReason = req.reason;
      saveToStorage(STORAGE_KEY_ORDERS, orders);
    }

    notificationService.notifyOrderProgress({
      orderId: req.orderId,
      orderCode: req.orderCode,
      status: 'RETURNING',
      note: `Đã tiếp nhận yêu cầu đổi trả (${req.reason}). Kỹ thuật viên NextGen sẽ kiểm định và liên hệ trong 24-48h.`,
    });

    this.addAuditLog({
      performedBy: req.requestedBy,
      action: 'CREATE_RETURN_REQUEST',
      entityName: 'Return_Requests',
      entityId: `RMA-${newReq.returnId}`,
      oldValue: 'None',
      newValue: `Yêu cầu đổi trả cho đơn #${req.orderCode}: ${req.reason}`
    });

    notify();
    return newReq;
  },

  inspectReturnRequest(returnId: number, result: string, staffName: string): boolean {
    const r = returnRequests.find(rq => rq.returnId === returnId);
    if (!r) return false;
    r.status = 'INSPECTING';
    r.inspectionResult = result;
    r.inspectedBy = staffName;
    r.inspectedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEY_RETURNS, returnRequests);

    this.addAuditLog({
      performedBy: staffName,
      action: 'INSPECT_RETURN_REQUEST',
      entityName: 'Return_Requests',
      entityId: `RMA-${returnId}`,
      oldValue: 'PENDING',
      newValue: `Thẩm định: ${result}`
    });

    notify();
    return true;
  },

  approveAndRefundReturn(returnId: number, refundAmount: number, staffName: string): boolean {
    const r = returnRequests.find(rq => rq.returnId === returnId);
    if (!r) return false;
    r.status = 'APPROVED';
    r.refundAmount = refundAmount;
    saveToStorage(STORAGE_KEY_RETURNS, returnRequests);

    // Đồng bộ sang orders
    const ord = orders.find(o => {
      const matchId = o.orderId && r.orderId && Number(o.orderId) === Number(r.orderId);
      const oCode = (o.orderCode || '').trim().toLowerCase().replace(/^#/, '');
      const rCode = (r.orderCode || '').trim().toLowerCase().replace(/^#/, '');
      const matchCode = Boolean(oCode && rCode && (oCode === rCode || oCode.includes(rCode) || rCode.includes(oCode)));
      return matchId || matchCode;
    });
    if (ord) {
      const allApprovedReturns = returnRequests.filter(rq => rq.status === 'APPROVED' && (
        (rq.orderId && ord.orderId && Number(rq.orderId) === Number(ord.orderId)) ||
        (rq.orderCode && ord.orderCode && rq.orderCode.replace(/^#/, '') === ord.orderCode.replace(/^#/, ''))
      ));
      const totalRefunded = allApprovedReturns.reduce((sum, rq) => sum + (rq.refundAmount || 0), 0);
      const isPartial = totalRefunded < ord.totalAmount;
      ord.paymentStatus = isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED';
      ord.returnStatus = 'APPROVED';
      ord.returnRefundAmount = totalRefunded > 0 ? totalRefunded : refundAmount;
      saveToStorage(STORAGE_KEY_ORDERS, orders);
    }

    // Kích hoạt Phiếu nhập kho hoàn hàng
    const newMovement: StockMovementRecord = {
      txnId: Date.now(),
      formCode: 'PNK-RET-' + Math.floor(1000 + Math.random() * 9000),
      sku: r.items[0]?.sku || 'SKU-UNKNOWN',
      productName: r.items[0]?.productName || 'Sản phẩm đổi trả',
      txnType: 'RETURN',
      quantityChange: r.items.reduce((s, i) => s + i.quantity, 0),
      qtyBefore: 15,
      qtyAfter: 15 + r.items.reduce((s, i) => s + i.quantity, 0),
      reason: `Nhập lại kho theo Phiếu đổi trả RMA-${returnId}`,
      performedBy: staffName,
      performedAt: new Date().toISOString()
    };
    movements = [newMovement,...movements];
    saveToStorage(STORAGE_KEY_MOVEMENTS, movements);

    notificationService.notifyOrderProgress({
      orderId: r.orderId,
      orderCode: r.orderCode,
      status: 'REFUNDED',
      note: `Yêu cầu đổi trả RMA-${returnId} đã được duyệt hoàn tất. Số tiền hoàn: ${formatCurrencyVND(refundAmount)}.`,
    });

    this.addAuditLog({
      performedBy: staffName,
      action: 'APPROVE_RETURN_REFUND',
      entityName: 'Return_Requests',
      entityId: `RMA-${returnId}`,
      oldValue: 'INSPECTING',
      newValue: `Chấp thuận đổi trả & Hoàn tiền: ${formatCurrencyVND(refundAmount)} (Nhập kho)`
    });

    notify();
    return true;
  },

  rejectReturnRequest(returnId: number, rejectReason: string, staffName: string): boolean {
    const r = returnRequests.find(rq => rq.returnId === returnId);
    if (!r) return false;
    r.status = 'REJECTED';
    r.rejectReason = rejectReason;
    saveToStorage(STORAGE_KEY_RETURNS, returnRequests);

    // Đồng bộ sang orders
    const ord = orders.find(o => {
      const matchId = o.orderId && r.orderId && Number(o.orderId) === Number(r.orderId);
      const oCode = (o.orderCode || '').trim().toLowerCase().replace(/^#/, '');
      const rCode = (r.orderCode || '').trim().toLowerCase().replace(/^#/, '');
      const matchCode = Boolean(oCode && rCode && (oCode === rCode || oCode.includes(rCode) || rCode.includes(oCode)));
      return matchId || matchCode;
    });
    if (ord) {
      ord.returnStatus = 'REJECTED';
      ord.returnRejectReason = rejectReason;
      saveToStorage(STORAGE_KEY_ORDERS, orders);
    }

    notificationService.createNotification({
      userId: 1,
      orderId: r.orderId,
      orderCode: r.orderCode,
      title: `Yêu cầu đổi trả #${r.orderCode} bị từ chối`,
      content: `Yêu cầu đổi trả cho đơn #${r.orderCode} đã bị từ chối. Lý do: ${rejectReason}.`,
      type: 'ORDER',
    });

    this.addAuditLog({
      performedBy: staffName,
      action: 'REJECT_RETURN_REQUEST',
      entityName: 'Return_Requests',
      entityId: `RMA-${returnId}`,
      oldValue: r.status,
      newValue: `Từ chối đổi trả: ${rejectReason}`
    });

    notify();
    return true;
  },

  // ================= BẢNG 24: FAQS =================
  getFaqs(): PortalFaqItem[] {
    return faqs.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  addFaq(data: Omit<PortalFaqItem, 'faqId'>): PortalFaqItem {
    const newFaq: PortalFaqItem = {...data,
      faqId: Date.now()
    };
    faqs.push(newFaq);
    saveToStorage(STORAGE_KEY_FAQS, faqs);
    notify();
    return newFaq;
  },

  updateFaq(id: number, data: Partial<PortalFaqItem>): boolean {
    const idx = faqs.findIndex(f => f.faqId === id);
    if (idx === -1) return false;
    faqs[idx] = {...faqs[idx],...data };
    saveToStorage(STORAGE_KEY_FAQS, faqs);
    notify();
    return true;
  },

  deleteFaq(id: number): boolean {
    faqs = faqs.filter(f => f.faqId!== id);
    saveToStorage(STORAGE_KEY_FAQS, faqs);
    notify();
    return true;
  },

  toggleFaqVisibility(id: number): boolean {
    const f = faqs.find(item => item.faqId === id);
    if (!f) return false;
    f.isVisible =!f.isVisible;
    saveToStorage(STORAGE_KEY_FAQS, faqs);
    notify();
    return true;
  },

  reorderFaq(id: number, direction: 'UP' | 'DOWN'): boolean {
    const idx = faqs.findIndex(f => f.faqId === id);
    if (idx === -1) return false;
    if (direction === 'UP' && idx > 0) {
      const temp = faqs[idx].sortOrder;
      faqs[idx].sortOrder = faqs[idx - 1].sortOrder;
      faqs[idx - 1].sortOrder = temp;
      const t = faqs[idx];
      faqs[idx] = faqs[idx - 1];
      faqs[idx - 1] = t;
    } else if (direction === 'DOWN' && idx < faqs.length - 1) {
      const temp = faqs[idx].sortOrder;
      faqs[idx].sortOrder = faqs[idx + 1].sortOrder;
      faqs[idx + 1].sortOrder = temp;
      const t = faqs[idx];
      faqs[idx] = faqs[idx + 1];
      faqs[idx + 1] = t;
    }
    saveToStorage(STORAGE_KEY_FAQS, faqs);
    notify();
    return true;
  },

  // ================= BẢNG 11 & 12: PROMOTIONS & PROMOTION_VARIANTS =================
  getPromotions(): PortalPromotion[] {
    return promotions.map(p => {
      if (!p.variants || p.variants.length === 0) {
        const found = PORTAL_PROMOTIONS.find(dp => dp.promotionId === p.promotionId || dp.name === p.name);
        if (found?.variants && found.variants.length > 0) {
          return { ...p, variants: found.variants };
        }
      }
      return p;
    });
  },

  syncExternalPromotions(externalPromos: PortalPromotion[]) {
    promotions = externalPromos.map(ep => {
      let variants = ep.variants && ep.variants.length > 0 ? ep.variants : [];
      if (variants.length === 0) {
        const local = promotions.find(p => p.promotionId === ep.promotionId || p.name === ep.name)
          || PORTAL_PROMOTIONS.find(p => p.promotionId === ep.promotionId || p.name === ep.name);
        if (local?.variants && local.variants.length > 0) {
          variants = local.variants;
        }
      }
      return {
        ...ep,
        variants,
      };
    });
    saveToStorage(STORAGE_KEY_PROMOTIONS, promotions);
    notify();
  },

  addPromotion(data: Omit<PortalPromotion, 'promotionId' | 'createdAt'>): PortalPromotion {
    const newPromo: PortalPromotion = {...data,
      promotionId: Date.now(),
      createdAt: new Date().toISOString()
    };

    promotions = [newPromo,...promotions];
    saveToStorage(STORAGE_KEY_PROMOTIONS, promotions);

    // Cập nhật giá khuyến mãi cho biến thể nếu chiến dịch đang ACTIVE
    if (newPromo.status === 'ACTIVE') {
      products = products.map(p => ({...p,
        variants: p.variants.map(v => {
          const promoItem = newPromo.variants.find(pv => pv.variantId === v.variantId);
          if (promoItem && promoItem.promoPrice > 0) {
            return {...v,
              salePrice: promoItem.promoPrice
            };
          }
          return v;
        })
      }));
      saveToStorage(STORAGE_KEY_PRODUCTS, products);
    }

    this.addAuditLog({
      performedBy: data.createdBy || 'Quản trị viên',
      action: 'CREATE_PROMOTION',
      entityName: 'Promotions',
      entityId: `PROMO-${newPromo.promotionId}`,
      oldValue: 'None',
      newValue: `Tạo chiến dịch: "${newPromo.name}" áp dụng cho ${newPromo.variants.length} SKU`
    });

    notify();
    return newPromo;
  },

  togglePromotionStatus(id: number): boolean {
    const p = promotions.find(item => item.promotionId === id);
    if (!p) return false;

    const oldStatus = p.status;
    p.status = p.status === 'ACTIVE'? 'PAUSED': 'ACTIVE';
    saveToStorage(STORAGE_KEY_PROMOTIONS, promotions);

    // Đồng bộ lại giá bán sản phẩm
    if (p.status === 'ACTIVE') {
      products = products.map(prod => ({...prod,
        variants: prod.variants.map(v => {
          const promoItem = p.variants.find(pv => pv.variantId === v.variantId);
          if (promoItem) {
            return {...v, salePrice: promoItem.promoPrice };
          }
          return v;
        })
      }));
    } else {
      products = products.map(prod => ({...prod,
        variants: prod.variants.map(v => {
          const promoItem = p.variants.find(pv => pv.variantId === v.variantId);
          if (promoItem) {
            return {...v, salePrice: v.listPrice || promoItem.listPrice };
          }
          return v;
        })
      }));
    }
    saveToStorage(STORAGE_KEY_PRODUCTS, products);

    this.addAuditLog({
      performedBy: 'Quản trị viên',
      action: 'TOGGLE_PROMOTION_STATUS',
      entityName: 'Promotions',
      entityId: `PROMO-${id}`,
      oldValue: oldStatus,
      newValue: p.status
    });

    notify();
    return true;
  },

  deletePromotion(id: number): boolean {
    const p = promotions.find(item => item.promotionId === id);
    if (!p) return false;

    promotions = promotions.filter(item => item.promotionId!== id);
    saveToStorage(STORAGE_KEY_PROMOTIONS, promotions);

    this.addAuditLog({
      performedBy: 'Quản trị viên',
      action: 'DELETE_PROMOTION',
      entityName: 'Promotions',
      entityId: `PROMO-${id}`,
      oldValue: p.name,
      newValue: 'DELETED'
    });

    notify();
    return true;
  },

  // NGHIỆP VỤ 1: TẠO ĐƠN HÀNG & GIỮ CHỖ TỒN KHO
  createOrder(payload: CreateOrderPayload, userRole = 'CUSTOMER', userName = 'Khách hàng'): OrderResponse {
    // 1. Kiểm tra tồn khả dụng cho từng biến thể
    for (const item of payload.items) {
      const inv = inventories.find(i => i.variantId === item.variantId);
      if (!inv || inv.availableQty < item.quantity) {
        throw new Error(`Sản phẩm ${inv?.productName || 'yêu cầu'} (SKU: ${inv?.sku}) chỉ còn ${inv?.availableQty || 0} sản phẩm khả dụng.`);
      }
    }

    // 2. Kiểm tra Voucher nếu có
    let voucherDiscount = 0;
    let appliedVoucherCode: string | undefined = undefined;
    if (payload.voucherCode) {
      const cleanCode = payload.voucherCode.trim().toUpperCase();
      const v = vouchers.find(vc => vc.code === cleanCode);
      if (v && v.isActive && v.usedCount < v.usageLimit) {
        const nowMs = Date.now();
        const startMs = v.startAt ? new Date(v.startAt).getTime() : NaN;
        const endMs = v.expiredAt ? new Date(v.expiredAt).getTime() : NaN;
        const isStarted = !Number.isFinite(startMs) || nowMs >= startMs;
        const isNotExpired = !Number.isFinite(endMs) || nowMs <= endMs;

        // Tạm tính subtotal để kiểm tra điều kiện
        let tempSubtotal = 0;
        for (const it of payload.items) {
          for (const p of products) {
            const variant = p.variants.find(vr => vr.variantId === it.variantId);
            if (variant) {
              tempSubtotal += variant.salePrice * it.quantity;
            }
          }
        }

        if (isStarted && isNotExpired && tempSubtotal >= v.minOrderValue) {
          const isPercent = v.discountType === 'PERCENT' || (v.discountType as any) === 'PERCENTAGE';
          if (!isPercent) {
            voucherDiscount = Math.min(v.discountValue, tempSubtotal);
          } else {
            const calculated = Math.round((tempSubtotal * v.discountValue) / 100);
            voucherDiscount = v.maxDiscount ? Math.min(calculated, v.maxDiscount) : calculated;
            voucherDiscount = Math.min(voucherDiscount, tempSubtotal);
          }
          appliedVoucherCode = v.code;
          // Tăng lượt sử dụng voucher
          v.usedCount += 1;
          saveToStorage(STORAGE_KEY_VOUCHERS, vouchers);
        }
      }
    }

    // 3. Thực hiện giữ chỗ tồn kho (Reserve Stock): Tăng reservedQty, Giảm availableQty
    for (const it of payload.items) {
      // Cập nhật bảng inventories
      inventories = inventories.map(inv => {
        if (inv.variantId === it.variantId) {
          const newReserved = inv.reservedQty + it.quantity;
          const newAvail = Math.max(0, inv.onHandQty - newReserved);
          return {...inv,
            reservedQty: newReserved,
            availableQty: newAvail,
            status: newAvail <= 0? 'OUT_OF_STOCK': newAvail <= inv.minThreshold? 'LOW_STOCK': 'IN_STOCK'
          };
        }
        return inv;
      });

      // Đồng bộ vào products.variants
      products = products.map(prod => {
        const hasVariant = prod.variants.some(vr => vr.variantId === it.variantId);
        if (hasVariant) {
          return {...prod,
            variants: prod.variants.map(vr => {
              if (vr.variantId === it.variantId) {
                const newReserved = vr.reservedQty + it.quantity;
                const newAvail = Math.max(0, vr.onHandQty - newReserved);
                return {...vr,
                  reservedQty: newReserved,
                  availableQty: newAvail
                };
              }
              return vr;
            })
          };
        }
        return prod;
      });
    }
    saveToStorage(STORAGE_KEY_INVENTORY, inventories);
    saveToStorage(STORAGE_KEY_PRODUCTS, products);

    // 4. Tạo chi tiết đơn hàng (Snapshot Data - Bảng 3.2.3)
    const orderItemsSnapshot: OrderItemSnapshot[] = payload.items.map(it => {
      let matchedProd = products[0];
      let matchedVariant = matchedProd.variants[0];

      for (const p of products) {
        const v = p.variants.find(vr => vr.variantId === it.variantId);
        if (v) {
          matchedProd = p;
          matchedVariant = v;
          break;
        }
      }

      const unitPrice = matchedVariant.salePrice;
      const lineTotal = unitPrice * it.quantity;

      return {
        orderItemId: Date.now() + Math.floor(Math.random() * 1000),
        variantId: it.variantId,
        productId: matchedProd.productId,
        productNameSnapshot: matchedProd.name,
        skuSnapshot: matchedVariant.sku,
        colorSnapshot: matchedVariant.color,
        romSnapshot: (matchedVariant.romGb && matchedVariant.romGb > 0)
          ? (matchedVariant.romGb >= 1024 ? '1TB' : `${matchedVariant.romGb}GB`)
          : (matchedVariant.variantName || 'Tiêu chuẩn'),
        unitPrice,
        quantity: it.quantity,
        lineTotal,
        imageUrl: matchedVariant.imageUrl || matchedProd.thumbnail
      };
    });

    const calculatedSubtotal = orderItemsSnapshot.reduce((sum, item) => sum + item.lineTotal, 0);
    const shippingFee = 0;
    const finalTotalAmount = Math.max(0, calculatedSubtotal - voucherDiscount + shippingFee);

    const isCOD = payload.paymentMethod === 'COD';
    const deadline = isCOD? undefined: new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const mockOrderCode = 'DH' + Math.floor(100000 + Math.random() * 900000);
    const newOrderId = Date.now();

    const initialStatus: OrderStatus = isCOD? 'WAITING_CONFIRMATION': 'PENDING_PAYMENT';

    const newOrder: OrderDetail = {
      orderId: newOrderId,
      orderCode: mockOrderCode,
      status: initialStatus,
      recipientName: payload.recipientName,
      recipientPhone: payload.recipientPhone,
      shippingAddress: payload.shippingAddress,
      paymentMethod: payload.paymentMethod,
      paymentStatus: 'UNPAID',
      paymentDeadline: deadline,
      shippingFee,
      subtotal: calculatedSubtotal,
      voucherDiscount,
      totalAmount: finalTotalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: orderItemsSnapshot,
      statusHistory: [
        {
          status: initialStatus,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
          note: isCOD? 'Đơn hàng được tạo thành công, hệ thống tự động khóa giữ chỗ tồn kho .': 'Đơn chờ chuyển khoản mô phỏng qua mã QR, giữ chỗ kho trong 30 phút.'
        }
      ]
    };

    orders = [newOrder,...orders];
    saveToStorage(STORAGE_KEY_ORDERS, orders);

    notificationService.notifyOrderProgress({
      userId: 1,
      orderId: newOrderId,
      orderCode: mockOrderCode,
      status: initialStatus,
      note: isCOD
        ? 'Đơn hàng được tạo thành công, hệ thống tự động khóa giữ chỗ tồn kho.'
        : 'Đơn chờ chuyển khoản mô phỏng qua mã QR, giữ chỗ kho trong 30 phút.',
    });

    // Ghi Audit Log
    this.addAuditLog({
      performedBy: userName,
      action: 'CREATE_ORDER',
      entityName: 'Orders',
      entityId: mockOrderCode,
      oldValue: 'None',
      newValue: `Tạo đơn hàng ${mockOrderCode} (${formatCurrencyVND(finalTotalAmount)}) - Giữ chỗ ${payload.items.reduce((s, i) => s + i.quantity, 0)} máy`
    });

    notify();

    return {
      orderId: newOrderId,
      orderCode: mockOrderCode,
      status: initialStatus,
      totalAmount: finalTotalAmount,
      paymentDeadline: deadline,
      createdAt: newOrder.createdAt
    };
  },

  // Tự động kiểm tra và hủy các đơn hàng chờ thanh toán QR đã hết hạn (30 phút), nhả tồn kho
  checkAndCancelExpiredOrders(): number {
    const now = Date.now();
    let count = 0;
    const expiredList = orders.filter(o => {
      if (o.status !== 'PENDING_PAYMENT' || o.paymentStatus === 'PAID') return false;
      const deadline = o.paymentDeadline ? new Date(o.paymentDeadline).getTime() : (o.createdAt ? new Date(o.createdAt).getTime() + 30 * 60 * 1000 : 0);
      return deadline > 0 && now >= deadline;
    });

    for (const exp of expiredList) {
      this.cancelOrder(
        exp.orderId,
        'Hết hạn thời gian thanh toán qua mã QR (30 phút) - Hệ thống tự động giải phóng tồn kho giữ chỗ.',
        'Hệ thống tự động'
      );
      count++;
    }
    return count;
  },

  updateOrderPaymentStatus(orderId: number, paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED' | 'PENDING' | 'PARTIALLY_PAID' | string, note?: string): boolean {
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return false;
    order.paymentStatus = paymentStatus as any;
    if (paymentStatus === 'PAID' && order.status === 'PENDING_PAYMENT') {
      order.status = 'WAITING_CONFIRMATION';
    }
    order.updatedAt = new Date().toISOString();
    if (note) {
      order.statusHistory.unshift({
        status: order.status,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        note
      });
    }
    saveToStorage(STORAGE_KEY_ORDERS, orders);
    notify();
    return true;
  },

  // NGHIỆP VỤ 2: HỦY ĐƠN HÀNG & GIẢI PHÓNG TỒN GIỮ CHỖ
  cancelOrder(orderId: number, reason: string, performedBy = 'Khách hàng'): boolean {
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return false;

    // Chỉ cho phép hủy khi đang Chờ thanh toán hoặc Chờ xác nhận
    if (order.status!== 'PENDING_PAYMENT' && order.status!== 'WAITING_CONFIRMATION') {
      return false;
    }

    // 1. Cập nhật trạng thái đơn
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    order.updatedAt = new Date().toISOString();
    order.statusHistory.unshift({
      status: 'CANCELLED',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      note: `${performedBy} hủy đơn: ${reason}. Giải phóng tồn kho giữ chỗ về tồn khả dụng.`
    });

    // 2. Giải phóng tồn kho giữ chỗ (Hoàn lại availableQty)
    for (const it of order.items) {
      inventories = inventories.map(inv => {
        if (inv.variantId === it.variantId) {
          const newReserved = Math.max(0, inv.reservedQty - it.quantity);
          const newAvail = Math.max(0, inv.onHandQty - newReserved);
          return {...inv,
            reservedQty: newReserved,
            availableQty: newAvail,
            status: newAvail <= 0? 'OUT_OF_STOCK': newAvail <= inv.minThreshold? 'LOW_STOCK': 'IN_STOCK'
          };
        }
        return inv;
      });

      products = products.map(prod => {
        const hasVariant = prod.variants.some(vr => vr.variantId === it.variantId);
        if (hasVariant) {
          return {...prod,
            variants: prod.variants.map(vr => {
              if (vr.variantId === it.variantId) {
                const newReserved = Math.max(0, vr.reservedQty - it.quantity);
                const newAvail = Math.max(0, vr.onHandQty - newReserved);
                return {...vr,
                  reservedQty: newReserved,
                  availableQty: newAvail
                };
              }
              return vr;
            })
          };
        }
        return prod;
      });
    }

    saveToStorage(STORAGE_KEY_ORDERS, orders);
    saveToStorage(STORAGE_KEY_INVENTORY, inventories);



    notificationService.notifyOrderProgress({
      userId: (order as any).userId || 1,
      orderId: order.orderId,
      orderCode: order.orderCode,
      status: 'CANCELLED',
      note: reason,
    });
    saveToStorage(STORAGE_KEY_PRODUCTS, products);

    this.addAuditLog({
      performedBy,
      action: 'CANCEL_ORDER',
      entityName: 'Orders',
      entityId: order.orderCode,
      oldValue: 'WAITING_CONFIRMATION',
      newValue: `CANCELLED (Lý do: ${reason}). Đã hoàn trả tồn kho giữ chỗ.`
    });

    notify();
    return true;
  },

  // NGHIỆP VỤ 3: ĐIỀU PHỐI VÒNG ĐỜI ĐƠN HÀNG TUẦN TỰ
  transitionOrderStatus(
    orderId: number, 
    nextStatus: OrderStatus, 
    options?: {
      performedBy?: string;
      reason?: string;
      carrier?: string;
      trackingCode?: string;
    }
  ): { success: boolean; message: string } {
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return { success: false, message: 'Không tìm thấy đơn hàng' };

    const currentStatus = order.status;
    const staffName = options?.performedBy || 'Nhân viên vận hành (Staff)';
    const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

    // Kiểm tra tính tuần tự nghiêm ngặt (Hình 1.18)
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      'PENDING': ['CONFIRMED', 'WAITING_CONFIRMATION', 'PENDING_PAYMENT', 'CANCELLED'],
      'PENDING_PAYMENT': ['WAITING_CONFIRMATION', 'CANCELLED'],
      'WAITING_CONFIRMATION': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['PICKED_UP', 'SHIPPING', 'RETURNING', 'CANCELLED'],
      'PICKED_UP': ['SHIPPING', 'RETURNING', 'CANCELLED'],
      'SHIPPING': ['COMPLETED', 'RETURNING', 'CANCELLED'],
      'RETURNING': ['CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    };

    if (!validTransitions[currentStatus]?.includes(nextStatus)) {
      return { 
        success: false, 
        message: `Quy trình tuần tự nghiêm ngặt: Không thể chuyển trực tiếp từ ${currentStatus} sang ${nextStatus}!` 
      };
    }

    // XỬ LÝ THEO TỪNG TRẠNG THÁI
    if (nextStatus === 'WAITING_CONFIRMATION') {
      order.status = 'WAITING_CONFIRMATION';
      order.paymentStatus = 'PAID';
      order.statusHistory.unshift({
        status: 'WAITING_CONFIRMATION',
        time: nowTimeStr,
        note: `Khách hàng đã thanh toán trực tuyến qua mã thành công. Đơn chuyển sang Chờ xác nhận.`
      });

    } else if (nextStatus === 'CONFIRMED') {
      order.status = 'CONFIRMED';
      order.statusHistory.unshift({
        status: 'CONFIRMED',
        time: nowTimeStr,
        note: `Nhân viên ${staffName} đã kiểm tra hợp lệ và xác nhận đơn hàng . Chờ bộ phận kho chuẩn bị hàng.`
      });

    } else if (nextStatus === 'PREPARING') {
      order.status = 'PREPARING';
      order.statusHistory.unshift({
        status: 'PREPARING',
        time: nowTimeStr,
        note: 'Bộ phận kho đang chuẩn bị hàng, kiểm đếm đóng gói và hệ thống đã đẩy sang bảng Vận đơn (Đã lấy hàng).'
      });

      // TỰ ĐỘNG ĐẨY SANG BẢNG VẬN ĐƠN KHI ĐƠN HÀNG SANG "ĐANG CHUẨN BỊ HÀNG" (PREPARING)
      this.createShipmentForOrder(order, options?.carrier || 'Giao Hàng Nhanh Express', staffName);

    } else if (nextStatus === 'SHIPPING') {
      // ĐÂY LÀ THỜI ĐIỂM XUẤT KHO THỰC TẾ: Trừ onHandQty và trừ reservedQty
      order.status = 'SHIPPING';
      order.carrier = options?.carrier || order.carrier || 'Giao Hàng Nhanh Express (Mô phỏng)';
      order.trackingCode = options?.trackingCode || order.trackingCode || `GHN-${order.orderCode.replace(/\D/g, '') || Math.floor(10000000 + Math.random() * 90000000)}`;
      order.statusHistory.unshift({
        status: 'SHIPPING',
        time: nowTimeStr,
        note: `Đã đóng gói hoàn tất, xuất kho vật lý (Phiếu xuất kho). Bàn giao đơn vị giao vận: ${order.carrier} (Mã VĐ: ${order.trackingCode}). Vận đơn: Đang vận chuyển.`
      });

      // Đồng bộ sang bảng Shipments: chuyển sang "Đang vận chuyển" (IN_TRANSIT)
      const ship = shipments.find(s => s.orderCode === order.orderCode || s.orderId === order.orderId);
      if (ship) {
        ship.status = 'IN_TRANSIT';
        ship.carrier = order.carrier;
        ship.trackingCode = order.trackingCode;
        ship.updatedBy = staffName;
        ship.updatedAt = new Date().toISOString();
        saveToStorage(STORAGE_KEY_SHIPMENTS, shipments);
      } else {
        const newShip = this.createShipmentForOrder(order, order.carrier, staffName);
        newShip.status = 'IN_TRANSIT';
        saveToStorage(STORAGE_KEY_SHIPMENTS, shipments);
      }

      // 1. Trừ tồn kho vật lý và giải phóng lượng giữ chỗ
      for (const it of order.items) {
        inventories = inventories.map(inv => {
          if (inv.variantId === it.variantId) {
            const newOnHand = Math.max(0, inv.onHandQty - it.quantity);
            const newReserved = Math.max(0, inv.reservedQty - it.quantity);
            const newAvail = Math.max(0, newOnHand - newReserved);
            return {...inv,
              onHandQty: newOnHand,
              reservedQty: newReserved,
              availableQty: newAvail,
              status: newAvail <= 0? 'OUT_OF_STOCK': newAvail <= inv.minThreshold? 'LOW_STOCK': 'IN_STOCK'
            };
          }
          return inv;
        });

        products = products.map(prod => {
          const hasVariant = prod.variants.some(vr => vr.variantId === it.variantId);
          if (hasVariant) {
            return {...prod,
              variants: prod.variants.map(vr => {
                if (vr.variantId === it.variantId) {
                  const newOnHand = Math.max(0, vr.onHandQty - it.quantity);
                  const newReserved = Math.max(0, vr.reservedQty - it.quantity);
                  const newAvail = Math.max(0, newOnHand - newReserved);
                  return {...vr,
                    onHandQty: newOnHand,
                    reservedQty: newReserved,
                    availableQty: newAvail
                  };
                }
                return vr;
              })
            };
          }
          return prod;
        });

        // 2. Sinh bản ghi xuất kho vào lịch sử bất biến
        const newIssueMovement: StockMovementRecord = {
          txnId: Date.now() + Math.floor(Math.random() * 100),
          formCode: `PXK-${order.orderCode.replace('#', '')}`,
          sku: it.skuSnapshot,
          productName: it.productNameSnapshot,
          txnType: 'EXPORT',
          quantityChange: -it.quantity,
          qtyBefore: (inventories.find(i => i.variantId === it.variantId)?.onHandQty || 0) + it.quantity,
          qtyAfter: inventories.find(i => i.variantId === it.variantId)?.onHandQty || 0,
          reason: `Xuất bán theo đơn hàng ${order.orderCode} `,
          performedBy: staffName,
          performedAt: nowTimeStr
        };
        movements = [newIssueMovement,...movements];
      }

      saveToStorage(STORAGE_KEY_MOVEMENTS, movements);
      saveToStorage(STORAGE_KEY_INVENTORY, inventories);
      saveToStorage(STORAGE_KEY_PRODUCTS, products);

      this.addAuditLog({
        performedBy: staffName,
        action: 'TRANSITION_ORDER',
        entityName: 'Orders',
        entityId: order.orderCode,
        oldValue: 'PREPARING',
        newValue: `SHIPPING - Xuất kho thực tế ${order.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm `
      });

    } else if (nextStatus === 'COMPLETED') {
      // THỜI ĐIỂM DUY NHẤT GHI NHẬN DOANH THU THUẦN
      order.status = 'COMPLETED';
      order.paymentStatus = 'PAID';
      order.completedAt = new Date().toISOString();
      order.statusHistory.unshift({
        status: 'COMPLETED',
        time: nowTimeStr,
        note: `Khách hàng đã nhận hàng và hoàn tất thanh toán. Hệ thống chính thức ghi nhận ${formatCurrencyVND(order.totalAmount)} vào doanh thu bán hàng.`
      });

      // Đồng bộ sang bảng Shipments: chuyển sang DELIVERED (Đã vận chuyển thành công)
      const ship = shipments.find(s => s.orderCode === order.orderCode || s.orderId === order.orderId);
      if (ship) {
        ship.status = 'DELIVERED';
        ship.updatedBy = staffName;
        ship.updatedAt = new Date().toISOString();
        saveToStorage(STORAGE_KEY_SHIPMENTS, shipments);
      }

      this.addAuditLog({
        performedBy: staffName,
        action: 'COMPLETE_ORDER',
        entityName: 'Orders',
        entityId: order.orderCode,
        oldValue: 'SHIPPING',
        newValue: `COMPLETED - Ghi nhận doanh thu thuần: ${formatCurrencyVND(order.totalAmount)}`
      });

    } else if (nextStatus === 'CANCELLED') {
      order.status = 'CANCELLED';
      order.cancelReason = options?.reason || 'Hủy đơn theo yêu cầu';
      order.statusHistory.unshift({
        status: 'CANCELLED',
        time: nowTimeStr,
        note: `Đơn hàng đã được chuyển sang trạng thái Đã hủy. Lý do: ${order.cancelReason}`
      });

      // Giải phóng tồn kho giữ chỗ nếu chưa xuất kho
      if (currentStatus === 'WAITING_CONFIRMATION' || currentStatus === 'CONFIRMED' || currentStatus === 'PREPARING') {
        for (const it of order.items) {
          inventories = inventories.map(inv => {
            if (inv.variantId === it.variantId) {
              const newReserved = Math.max(0, inv.reservedQty - it.quantity);
              const newAvail = Math.max(0, inv.onHandQty - newReserved);
              return {...inv,
                reservedQty: newReserved,
                availableQty: newAvail,
                status: newAvail <= 0? 'OUT_OF_STOCK': newAvail <= inv.minThreshold? 'LOW_STOCK': 'IN_STOCK'
              };
            }
            return inv;
          });
        }
        saveToStorage(STORAGE_KEY_INVENTORY, inventories);
      }

      // Đồng bộ sang bảng Shipments
      const ship = shipments.find(s => s.orderCode === order.orderCode || s.orderId === order.orderId);
      if (ship && ship.status!== 'DELIVERED' && ship.status!== 'PICKUP_FAILED' && ship.status!== 'DELIVERY_FAILED') {
        if (currentStatus === 'CONFIRMED' || currentStatus === 'PREPARING') {
          ship.status = 'PICKUP_FAILED';
          ship.failReason = options?.reason || order.cancelReason || 'Lấy hàng không thành công';
        } else if (currentStatus === 'SHIPPING') {
          ship.status = 'DELIVERY_FAILED';
          ship.failReason = options?.reason || order.cancelReason || 'Giao hàng không thành công';
        }
        ship.updatedBy = staffName;
        ship.updatedAt = new Date().toISOString();
        saveToStorage(STORAGE_KEY_SHIPMENTS, shipments);
      }
    }

    notificationService.notifyOrderProgress({
      userId: (order as any).userId || 1,
      orderId: order.orderId,
      orderCode: order.orderCode,
      status: nextStatus,
      note: options?.reason || order.statusHistory?.[0]?.note,
    });



    order.updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEY_ORDERS, orders);
    notify();

    return { success: true, message: `Chuyển trạng thái đơn ${order.orderCode} sang ${nextStatus} thành công!` };
  },

  // NGHIỆP VỤ 4: HOÀN KHO CHO ĐƠN GIAO THẤT BẠI HOẶC ĐỔI TRẢ 
  processReturnRestock(
    orderId: number, 
    isRestockCondition: boolean, 
    reason: string, 
    staffName = 'Nguyễn Thanh Hùng (Thủ kho)'
  ): boolean {
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return false;

    const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    const isCompletedReturn = order.status === 'COMPLETED';

    // Cập nhật trạng thái đơn
    if (!isCompletedReturn) {
      order.status = 'CANCELLED';
      order.cancelReason = `Giao thất bại: ${reason} | Thẩm định: ${isRestockCondition? 'Nguyên seal -> Nhập lại kho bán': 'Móp méo/Hỏng seal -> Cách ly kiểm định'}`;
    }

    order.statusHistory.unshift({
      status: isCompletedReturn? 'COMPLETED': 'CANCELLED',
      time: nowTimeStr,
      note: `Lập Phiếu hoàn kho. Kết quả thẩm định ngoại quan: ${isRestockCondition? 'Đủ điều kiện, đã nhập lại tồn kho bán lẻ.': 'Không đủ điều kiện bán lẻ, chuyển kho thanh lý/kiểm định.'}`
    });

    // Nếu hàng nguyên seal đủ điều kiện -> cộng lại onHandQty và availableQty
    if (isRestockCondition) {
      for (const it of order.items) {
        inventories = inventories.map(inv => {
          if (inv.variantId === it.variantId) {
            const newOnHand = inv.onHandQty + it.quantity;
            const newAvail = newOnHand - inv.reservedQty;
            return {...inv,
              onHandQty: newOnHand,
              availableQty: newAvail,
              status: newAvail <= 0? 'OUT_OF_STOCK': newAvail <= inv.minThreshold? 'LOW_STOCK': 'IN_STOCK'
            };
          }
          return inv;
        });

        products = products.map(prod => {
          const hasVariant = prod.variants.some(vr => vr.variantId === it.variantId);
          if (hasVariant) {
            return {...prod,
              variants: prod.variants.map(vr => {
                if (vr.variantId === it.variantId) {
                  const newOnHand = vr.onHandQty + it.quantity;
                  const newAvail = newOnHand - vr.reservedQty;
                  return {...vr,
                    onHandQty: newOnHand,
                    availableQty: newAvail
                  };
                }
                return vr;
              })
            };
          }
          return prod;
        });

        // Ghi lịch sử nhập lại kho
        const newReturnMovement: StockMovementRecord = {
          txnId: Date.now() + Math.floor(Math.random() * 100),
          formCode: `PNK-${order.orderCode.replace('#', '')}`,
          sku: it.skuSnapshot,
          productName: it.productNameSnapshot,
          txnType: 'RETURN',
          quantityChange: it.quantity,
          qtyBefore: (inventories.find(i => i.variantId === it.variantId)?.onHandQty || 0) - it.quantity,
          qtyAfter: inventories.find(i => i.variantId === it.variantId)?.onHandQty || 0,
          reason: `Nhập hoàn kho hàng nguyên seal theo đơn ${order.orderCode} `,
          performedBy: staffName,
          performedAt: nowTimeStr
        };
        movements = [newReturnMovement,...movements];
      }

      saveToStorage(STORAGE_KEY_MOVEMENTS, movements);
      saveToStorage(STORAGE_KEY_INVENTORY, inventories);
      saveToStorage(STORAGE_KEY_PRODUCTS, products);
    }

    order.updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEY_ORDERS, orders);

    this.addAuditLog({
      performedBy: staffName,
      action: 'RESTOCK',
      entityName: 'Orders',
      entityId: order.orderCode,
      oldValue: order.status,
      newValue: `Hoàn kho (${isRestockCondition? 'Nhập lại kho khả dụng': 'Cách ly kiểm định'}) - Lý do: ${reason}`
    });

    notify();
    return true;
  },

  // NGHIỆP VỤ 5: ĐIỀU CHỈNH TỒN KHO KIỂM KÊ 
  createStockAdjustment(
    sku: string, 
    actualCount: number, 
    reason: string, 
    performedBy = 'Nguyễn Thanh Hùng (Thủ kho)'
  ): { success: boolean; message: string } {
    const inv = inventories.find(i => i.sku.toLowerCase() === sku.toLowerCase());
    if (!inv) return { success: false, message: 'Không tìm thấy SKU trong kho!' };

    if (actualCount < inv.reservedQty) {
      return {
        success: false,
        message: `Lỗi toàn vẹn dữ liệu: Số lượng thực tế kiểm kê (${actualCount}) không được nhỏ hơn số lượng đang giữ chỗ cho khách (${inv.reservedQty})!`
      };
    }

    const formCode = `PKK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const diff = actualCount - inv.onHandQty;
    const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

    // 1. Thêm bản ghi điều chỉnh
    const newAdj: StockAdjustmentRecord = {
      id: Date.now(),
      formCode,
      sku: inv.sku,
      productName: `${inv.productName} (${inv.color})`,
      qtySystem: inv.onHandQty,
      qtyActual: actualCount,
      qtyDiff: diff,
      reason,
      performedBy,
      createdAt: nowTimeStr,
      status: 'APPROVED'
    };
    adjustments = [newAdj,...adjustments];
    saveToStorage(STORAGE_KEY_ADJUSTMENTS, adjustments);

    // 2. Cập nhật tồn kho
    const oldOnHand = inv.onHandQty;
    inventories = inventories.map(item => {
      if (item.sku.toLowerCase() === sku.toLowerCase()) {
        const newOnHand = actualCount;
        const newAvail = newOnHand - item.reservedQty;
        return {...item,
          onHandQty: newOnHand,
          availableQty: newAvail,
          status: newAvail <= 0? 'OUT_OF_STOCK': newAvail <= item.minThreshold? 'LOW_STOCK': 'IN_STOCK'
        };
      }
      return item;
    });

    products = products.map(prod => {
      const hasVariant = prod.variants.some(vr => vr.sku.toLowerCase() === sku.toLowerCase());
      if (hasVariant) {
        return {...prod,
          variants: prod.variants.map(vr => {
            if (vr.sku.toLowerCase() === sku.toLowerCase()) {
              const newOnHand = actualCount;
              const newAvail = newOnHand - vr.reservedQty;
              return {...vr,
                onHandQty: newOnHand,
                availableQty: newAvail
              };
            }
            return vr;
          })
        };
      }
      return prod;
    });

    // 3. Ghi biến động kho bất biến
    const newMovement: StockMovementRecord = {
      txnId: Date.now(),
      formCode,
      sku: inv.sku,
      productName: inv.productName,
      txnType: 'ADJUST',
      quantityChange: diff,
      qtyBefore: oldOnHand,
      qtyAfter: actualCount,
      reason: `Điều chỉnh kiểm kê kho: ${reason}`,
      performedBy,
      performedAt: nowTimeStr
    };
    movements = [newMovement,...movements];

    saveToStorage(STORAGE_KEY_INVENTORY, inventories);
    saveToStorage(STORAGE_KEY_PRODUCTS, products);
    saveToStorage(STORAGE_KEY_MOVEMENTS, movements);

    this.addAuditLog({
      performedBy,
      action: 'STOCK_ADJUSTMENT',
      entityName: 'Inventories',
      entityId: sku,
      oldValue: `onHandQty: ${oldOnHand}`,
      newValue: `onHandQty: ${actualCount} (Lệch: ${diff > 0? '+': ''}${diff}) - Phiếu ${formCode}`
    });

    notify();
    return { success: true, message: `Lập và duyệt Phiếu điều chỉnh tồn kho ${formCode} thành công!` };
  },

  // NGHIỆP VỤ 6: ĐÁNH GIÁ SẢN PHẨM GẮN VỚI ORDER_ITEM_ID
  submitReview(payload: {
    orderItemId?: number;
    productId: number;
    productName?: string;
    userName: string;
    phone: string;
    rating: number;
    comment: string;
    images?: string[];
  }): { success: boolean; message: string; review?: ProductReview } {
    // 1. Kiểm tra nếu đã đánh giá dòng sản phẩm này rồi (chống trùng lặp theo order_item_id)
    if (payload.orderItemId) {
      const alreadyReviewed = reviews.some(r => r.orderItemId === payload.orderItemId);
      if (alreadyReviewed) {
        return {
          success: false,
          message: 'Dòng sản phẩm trong đơn hàng này đã được đánh giá trước đó. Mỗi sản phẩm đã mua chỉ được gửi một đánh giá duy nhất.'
        };
      }
    }

    // 2. Ràng buộc nghiệp vụ: Chỉ đơn hàng 'Hoàn tất' (COMPLETED) mới được đánh giá
    const cleanPhone = payload.phone.trim();
    let verifiedOrderItemId = payload.orderItemId;

    if (!verifiedOrderItemId) {
      // Tìm dòng order_item_id hợp lệ của khách hàng nếu chưa truyền
      const matchingOrder = orders.find(o => 
        o.status === 'COMPLETED' && 
        (o.recipientPhone.includes(cleanPhone) || o.recipientName.toLowerCase().includes(payload.userName.toLowerCase())) &&
        o.items.some(i => i.productId === payload.productId &&!reviews.some(r => r.orderItemId === i.orderItemId))
      );

      if (!matchingOrder) {
        return {
          success: false,
          message: 'Ràng buộc nghiệp vụ (Bảng 22 Reviews): Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua hàng và đơn hàng đạt trạng thái "Hoàn tất". Hãy đánh giá từ mục "Đơn hàng của tôi" của bạn!'
        };
      }

      const matchingItem = matchingOrder.items.find(i => i.productId === payload.productId &&!reviews.some(r => r.orderItemId === i.orderItemId));
      verifiedOrderItemId = matchingItem?.orderItemId;
    } else {
      // Kiểm tra orderItemId có thuộc đơn COMPLETED hay không
      const itemExistsInCompleted = orders.some(o => 
        o.status === 'COMPLETED' && o.items.some(i => i.orderItemId === payload.orderItemId)
      );
      if (!itemExistsInCompleted) {
        return {
          success: false,
          message: 'Đơn hàng chứa sản phẩm này chưa đạt trạng thái "Hoàn tất" (Giao hàng thành công) để mở quyền đánh giá.'
        };
      }
    }

    const maskedPhone = cleanPhone? `${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-3)}`: '098****321';

    const newRev: ProductReview = {
      reviewId: Date.now(),
      orderItemId: verifiedOrderItemId,
      productId: payload.productId,
      productName: payload.productName,
      userName: payload.userName.trim(),
      userPhoneMasked: maskedPhone,
      rating: payload.rating,
      comment: payload.comment.trim(),
      images: payload.images,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      isBuyerVerified: true // Nhãn đã mua hàng và xác thực qua order_item_id
    };

    reviews = [newRev,...reviews];
    saveToStorage(STORAGE_KEY_REVIEWS, reviews);

    // Ghi nhận Audit Log
    this.addAuditLog({
      performedBy: payload.userName,
      action: 'SUBMIT_REVIEW',
      entityName: 'Reviews',
      entityId: String(newRev.reviewId),
      oldValue: 'None',
      newValue: `Đánh giá ${payload.rating} sao cho sản phẩm ID ${payload.productId} (Order Item ID: ${verifiedOrderItemId})`
    });

    notify();

    return {
      success: true,
      message: 'Cảm ơn bạn! Đánh giá đã được ghi nhận thành công và liên kết với mã mặt hàng đã mua.',
      review: newRev
    };
  },

  // GHI AUDIT LOG BẤT BIẾN
  addAuditLog(entry: {
    performedBy: string;
    action: string;
    entityName: string;
    entityId: string;
    oldValue: string;
    newValue: string;
  }) {
    const log: PortalAuditLog = {
      logId: Date.now() + Math.floor(Math.random() * 100),...entry,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    };
    auditLogs = [log,...auditLogs];
    saveToStorage(STORAGE_KEY_AUDIT, auditLogs);
  }
};

function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
