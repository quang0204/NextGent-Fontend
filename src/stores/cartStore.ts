import { create } from 'zustand';
import { CartItem, isCartItemPurchasable, mapBackendCartItemToCartItem } from '../types/cart';
import { cartService } from '../services/cartService';
import { useToastStore } from './toastStore';

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  currentUserId: number | null;
  selectedItemIds: string[];
  buyNowItem: CartItem | null;

  fetchCart: () => Promise<void>;
  switchUser: (userId: number | null) => void;
  syncOnLogin: (userId: number) => Promise<void>;
  addItem: (item: CartItem) => Promise<{ success: boolean; message: string }>;
  removeItem: (id: string) => Promise<void>;
  removeItems: (ids: string[]) => Promise<void>;
  updateQuantity: (id: string, delta: number) => Promise<{ success: boolean; message?: string }>;
  clearCart: () => Promise<void>;
  getTotalCount: () => number;
  getTotalAmount: () => number;
  
  // Selection in cart
  toggleSelectItem: (id: string) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
  setSelectedItemIds: (ids: string[]) => void;
  getSelectedItems: () => CartItem[];
  getSelectedCount: () => number;
  getSelectedTotalAmount: () => number;

  // Buy Now direct item
  setBuyNowItem: (item: CartItem | null) => void;
  clearBuyNowItem: () => void;
}

const isUserAuthenticated = (): boolean => {
  return typeof window !== 'undefined' && !!localStorage.getItem('access_token');
};

export const isCartItemOutOfStock = (item: CartItem): boolean => {
  const effectiveStock = item.availableStock !== undefined ? item.availableStock : item.availableQty;
  return item.inStock === false || effectiveStock <= 0;
};

export const isCartItemSelectable = (item: CartItem): boolean => {
  return item.isAvailable !== false && !isCartItemOutOfStock(item);
};

const getInitialItems = (): { items: CartItem[]; userId: number | null } => {
  try {
    const rawUser = localStorage.getItem('nextpick_user_v2');
    const user = rawUser ? JSON.parse(rawUser) : null;
    const userId = user?.userId || null;
    const items = cartService.getLocalCartItems(userId);
    return { items, userId };
  } catch {
    return { items: [], userId: null };
  }
};

const getInitialBuyNow = (): CartItem | null => {
  try {
    const raw = sessionStorage.getItem('nextpick_buynow_item');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initial = getInitialItems();
const initialBuyNow = getInitialBuyNow();

// Debounce timers per item for optimistic quantity sync
const qtyDebounceTimers: Record<string, any> = {};

export const useCartStore = create<CartStore>((set, get) => ({
  items: initial.items,
  isLoading: false,
  currentUserId: initial.userId,
  selectedItemIds: initial.items.filter(isCartItemSelectable).map((i) => i.id),
  buyNowItem: initialBuyNow,

  fetchCart: async () => {
    if (!isUserAuthenticated()) {
      const local = cartService.getLocalCartItems(get().currentUserId);
      set({ items: local, selectedItemIds: local.filter(isCartItemSelectable).map(i => i.id) });
      return;
    }

    set({ isLoading: true });
    try {
      const data = await cartService.getCart();
      if (data && Array.isArray(data.items)) {
        const mapped = data.items.map(mapBackendCartItemToCartItem);
        const selectableIds = mapped.filter(isCartItemSelectable).map(m => m.id);
        const currentSelected = get().selectedItemIds;
        const retainedSelected = currentSelected.filter((id) => selectableIds.includes(id));

        set({ 
          items: mapped, 
          selectedItemIds: currentSelected.length > 0 ? retainedSelected : selectableIds,
          isLoading: false 
        });
        return;
      }
    } catch (err: any) {
      console.warn('API getCart error, falling back to local cart:', err);
    }
    set({ isLoading: false });
  },

  switchUser: (newUserId: number | null) => {
    set({ currentUserId: newUserId });
    if (newUserId && isUserAuthenticated()) {
      get().fetchCart();
    } else {
      const items = cartService.getLocalCartItems(newUserId);
      set({ items, selectedItemIds: items.filter(isCartItemSelectable).map((i) => i.id) });
    }
  },

  syncOnLogin: async (userId: number) => {
    set({ currentUserId: userId });
    const guestItems = cartService.getLocalCartItems(null);

    if (guestItems.length > 0) {
      try {
        const payload = guestItems.map(g => ({
          variantId: g.variantId,
          quantity: g.quantity
        }));
        const syncRes = await cartService.syncCart(payload);
        
        // Cảnh báo nếu có mặt hàng bị skipped do hết hàng/ngừng kinh doanh
        if (syncRes?.skippedItems && syncRes.skippedItems.length > 0) {
          const reasons = syncRes.skippedItems.map(s => s.reason).filter(Boolean).join(', ');
          useToastStore.getState().showToast(
            `Một số sản phẩm vãng lai không thể đưa vào giỏ: ${reasons}`,
            'warning'
          );
        }

        cartService.clearLocalCart(null);
      } catch (err: any) {
        console.warn('API syncCart err, falling back to local merge:', err);
        await cartService.mergeGuestCartOnLogin(userId);
      }
    }

    await get().fetchCart();
  },

  addItem: async (newItem) => {
    // 1. Nếu đã đăng nhập: Gọi API 7.2 POST /api/v1/cart/items
    if (isUserAuthenticated()) {
      try {
        await cartService.addItem(newItem.variantId, newItem.quantity);
        await get().fetchCart();
        return { 
          success: true, 
          message: `Đã thêm "${newItem.productName}" vào giỏ hàng thành công!` 
        };
      } catch (err: any) {
        const errCode = err.response?.data?.error;
        const errMsg = err.response?.data?.message || err.message;

        if (errCode === 'INSUFFICIENT_STOCK') {
          return { success: false, message: errMsg || 'Số lượng yêu cầu vượt quá tồn kho khả dụng!' };
        }
        if (errCode === 'VARIANT_NOT_FOUND') {
          return { success: false, message: errMsg || 'Biến thể sản phẩm không tồn tại.' };
        }
        return { success: false, message: errMsg || 'Không thể thêm sản phẩm vào giỏ hàng.' };
      }
    }

    // 2. Chế độ khách vãng lai (Guest Mode) lưu trữ localStorage
    let result = { success: true, message: `Đã thêm "${newItem.productName}" vào giỏ hàng!` };

    const state = get();
    const existingIdx = state.items.findIndex((i) => i.variantId === newItem.variantId);
    let updated: CartItem[];
    let updatedSelected = [...state.selectedItemIds];

    if (existingIdx > -1) {
      const currentItem = state.items[existingIdx];
      const newTotalQty = currentItem.quantity + newItem.quantity;

      if (newTotalQty > currentItem.availableQty) {
        return {
          success: false,
          message: `Rất tiếc! Phiên bản này chỉ còn tối đa ${currentItem.availableQty} sản phẩm khả dụng trong kho.`
        };
      }

      updated = [...state.items];
      updated[existingIdx] = {
        ...currentItem,
        quantity: newTotalQty
      };
      if (!updatedSelected.includes(currentItem.id)) {
        updatedSelected.push(currentItem.id);
      }
    } else {
      if (newItem.quantity > newItem.availableQty) {
        return {
          success: false,
          message: `Rất tiếc! Số lượng tồn kho khả dụng chỉ còn ${newItem.availableQty} sản phẩm.`
        };
      }
      updated = [...state.items, newItem];
      if (!updatedSelected.includes(newItem.id)) {
        updatedSelected.push(newItem.id);
      }
    }

    cartService.saveLocalCartItems(updated, state.currentUserId);
    set({ items: updated, selectedItemIds: updatedSelected });
    return result;
  },

  removeItem: async (id) => {
    const item = get().items.find(i => i.id === id);
    const cartItemId = item?.cartItemId || (Number(id) > 0 ? Number(id) : null);

    if (isUserAuthenticated() && cartItemId) {
      try {
        await cartService.removeItem(cartItemId);
        await get().fetchCart();
        return;
      } catch (err) {
        console.warn('API removeItem error, fallback local:', err);
      }
    }

    // Local fallback
    const updated = get().items.filter((i) => i.id !== id);
    const newSelected = get().selectedItemIds.filter((itemId) => itemId !== id);
    cartService.saveLocalCartItems(updated, get().currentUserId);
    set({ items: updated, selectedItemIds: newSelected });
  },

  removeItems: async (idsToRemove: string[]) => {
    for (const id of idsToRemove) {
      await get().removeItem(id);
    }
  },

  updateQuantity: async (id, delta) => {
    const itemToUpdate = get().items.find((i) => i.id === id);
    if (!itemToUpdate) return { success: false, message: 'Sản phẩm không có trong giỏ hàng' };

    if (delta > 0 && itemToUpdate.isAvailable === false) {
      return {
        success: false,
        message: itemToUpdate.unavailableReason || 'Sản phẩm hoặc danh mục hiện tạm ẩn!'
      };
    }

    const oldQty = itemToUpdate.quantity;
    // Khi giảm số lượng mà giỏ đang vượt quá tồn kho còn lại (> 0), hạ thẳng về mức tồn kho hợp lệ
    const newQty =
      delta < 0 && itemToUpdate.availableQty > 0 && oldQty > itemToUpdate.availableQty
        ? Math.min(oldQty + delta, itemToUpdate.availableQty)
        : oldQty + delta;
    if (newQty < 1) return { success: false };

    if (delta > 0 && newQty > itemToUpdate.availableQty) {
      return {
        success: false,
        message:
          itemToUpdate.availableQty <= 0
            ? 'Sản phẩm này hiện tạm thời hết hàng!'
            : `Kho hiện chỉ còn tối đa ${itemToUpdate.availableQty} sản phẩm cho phiên bản này!`
      };
    }

    // 1. Phản hồi tức thì 0ms trên giao diện (Optimistic UI)
    const updated = get().items.map((item) => {
      if (item.id === id) {
        return { ...item, quantity: newQty, inStock: item.availableQty > 0 && newQty <= item.availableQty };
      }
      return item;
    });
    cartService.saveLocalCartItems(updated, get().currentUserId);
    set({ items: updated });

    // 2. Nếu đã đăng nhập: Debounce 350ms trước khi gửi API lên server, loại bỏ 100% race conditions khi click nhanh
    const cartItemId = itemToUpdate.cartItemId || (Number(id) > 0 ? Number(id) : null);
    if (isUserAuthenticated() && cartItemId) {
      if (qtyDebounceTimers[id]) {
        clearTimeout(qtyDebounceTimers[id]);
      }

      qtyDebounceTimers[id] = setTimeout(async () => {
        try {
          await cartService.updateQuantity(cartItemId, newQty);
        } catch (err: any) {
          // Rollback nếu server từ chối (ví dụ hết hàng)
          const fallback = get().items.map((item) => {
            if (item.id === id) {
              return { ...item, quantity: oldQty };
            }
            return item;
          });
          cartService.saveLocalCartItems(fallback, get().currentUserId);
          set({ items: fallback });
          const errMsg = err.response?.data?.message || 'Kho không đủ hàng khả dụng!';
          useToastStore.getState().showToast(errMsg, 'error');
        } finally {
          delete qtyDebounceTimers[id];
        }
      }, 350);
    }

    return { success: true };
  },

  clearCart: async () => {
    if (isUserAuthenticated()) {
      try {
        await cartService.clearCart();
      } catch (err) {
        console.warn('API clearCart error:', err);
      }
    }
    cartService.clearLocalCart(get().currentUserId);
    set({ items: [], selectedItemIds: [] });
  },

  getTotalCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getTotalAmount: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // Selection logic for cart checkout
  toggleSelectItem: (id: string) => {
    set((state) => {
      const target = state.items.find((i) => i.id === id);
      const isSelected = state.selectedItemIds.includes(id);
      if (!isSelected && target && !isCartItemSelectable(target)) {
        return { selectedItemIds: state.selectedItemIds };
      }
      const newSelected = isSelected
        ? state.selectedItemIds.filter((itemId) => itemId !== id)
        : [...state.selectedItemIds, id];
      return { selectedItemIds: newSelected };
    });
  },

  selectAllItems: () => {
    set((state) => ({
      selectedItemIds: state.items.filter(isCartItemSelectable).map((i) => i.id)
    }));
  },

  deselectAllItems: () => {
    set({ selectedItemIds: [] });
  },

  setSelectedItemIds: (ids: string[]) => {
    set({ selectedItemIds: ids });
  },

  getSelectedItems: () => {
    const { items, selectedItemIds } = get();
    return items.filter((i) => selectedItemIds.includes(i.id));
  },

  getSelectedCount: () => {
    const { items, selectedItemIds } = get();
    return items
      .filter((i) => selectedItemIds.includes(i.id) && isCartItemPurchasable(i))
      .reduce((sum, item) => sum + item.quantity, 0);
  },

  getSelectedTotalAmount: () => {
    const { items, selectedItemIds } = get();
    return items
      .filter((i) => selectedItemIds.includes(i.id) && isCartItemPurchasable(i))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // Buy Now direct checkout logic
  setBuyNowItem: (item: CartItem | null) => {
    try {
      if (item) {
        sessionStorage.setItem('nextpick_buynow_item', JSON.stringify(item));
      } else {
        sessionStorage.removeItem('nextpick_buynow_item');
      }
    } catch {}
    set({ buyNowItem: item });
  },

  clearBuyNowItem: () => {
    try {
      sessionStorage.removeItem('nextpick_buynow_item');
    } catch {}
    set({ buyNowItem: null });
  }
}));
