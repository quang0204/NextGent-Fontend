export interface CartItem {
  id: string; // cartItemId dạng chuỗi hoặc variantId
  cartItemId?: number;
  productId: number;
  variantId: number;
  productName: string;
  sku: string;
  color: string;
  storage: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  quantity: number;
  availableQty: number;
  isFlashSale?: boolean;
  lineTotal?: number;
  availableStock?: number;
  inStock?: boolean;
  isAvailable?: boolean;
  unavailableReason?: string;
  ramGb?: number;
  romGb?: number;
  addedAt?: string;
}

export interface BackendCartItem {
  cartItemId: number;
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  color: string;
  ramGb: number;
  romGb: number;
  imageUrl: string;
  listPrice: number;
  currentPrice: number;
  isFlashSale: boolean;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  inStock: boolean;
  isAvailable?: boolean;
  unavailableReason?: string;
  addedAt?: string;
}

export interface BackendCartData {
  cartId: number;
  userId: number;
  items: BackendCartItem[];
  totalQuantity: number;
  subtotal: number;
  updatedAt?: string;
}

export interface AddToCartResponse {
  cartItemId: number;
  variantId: number;
  quantity: number;
  totalCartItems: number;
}

export interface UpdateQuantityResponse {
  cartItemId: number;
  variantId: number;
  quantity: number;
  lineTotal: number;
  newSubtotal: number;
}

export interface RemoveCartItemResponse {
  deletedItemId: number;
  remainingItems: number;
  newSubtotal: number;
}

export interface SkippedItem {
  variantId: number;
  requestedQuantity: number;
  reason: string;
}

export interface SyncCartResponse {
  cartId: number;
  totalItems: number;
  syncedCount: number;
  subtotal: number;
  skippedItems?: SkippedItem[];
}

export const mapBackendCartItemToCartItem = (b: BackendCartItem): CartItem => ({
  id: String(b.cartItemId),
  cartItemId: b.cartItemId,
  productId: b.productId,
  variantId: b.variantId,
  productName: b.productName,
  sku: b.sku,
  color: b.color || '',
  storage: b.romGb ? (b.romGb >= 1024 ? `${b.romGb / 1024}TB` : `${b.romGb}GB`) : '',
  price: b.currentPrice,
  originalPrice: b.listPrice || b.currentPrice,
  imageUrl: b.imageUrl,
  quantity: b.quantity,
  availableQty: b.availableStock ?? 999,
  isFlashSale: b.isFlashSale ?? false,
  inStock: b.inStock ?? true,
  isAvailable: b.isAvailable ?? true,
  unavailableReason: b.unavailableReason,
  availableStock: b.availableStock,
  lineTotal: b.lineTotal,
  ramGb: b.ramGb,
  romGb: b.romGb,
  addedAt: b.addedAt,
});

