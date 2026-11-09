import { create } from 'zustand';
import { wishlistService } from '../services/wishlistService';

interface WishlistStore {
  productIds: number[];
  currentUserId: number | null;
  switchUser: (userId: number | null) => void;
  toggleWishlist: (productId: number) => boolean; // returns true if added, false if removed
  isInWishlist: (productId: number) => boolean;
  getCount: () => number;
  syncWithBackend: () => Promise<void>;
}

const getWishlistKey = (userId?: number | null): string => {
  if (!userId) {
    return 'nextpick_wishlist_guest';
  }
  return `nextpick_wishlist_user_${userId}`;
};

const getInitialWishlist = (): { productIds: number[]; userId: number | null } => {
  try {
    const rawUser = localStorage.getItem('nextpick_user_v2');
    const user = rawUser ? JSON.parse(rawUser) : null;
    const userId = user?.userId || null;
    const key = getWishlistKey(userId);

    const raw = localStorage.getItem(key);
    if (raw) {
      return { productIds: JSON.parse(raw), userId };
    }

    // Migration fallback nếu có dữ liệu demo từ trước
    const oldRaw = localStorage.getItem('nextpick_wishlist_v1');
    const initialIds = oldRaw ? JSON.parse(oldRaw) : [1, 2];
    localStorage.setItem(key, JSON.stringify(initialIds));
    return { productIds: initialIds, userId };
  } catch {
    return { productIds: [1, 2], userId: null };
  }
};

const initial = getInitialWishlist();

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  productIds: initial.productIds,
  currentUserId: initial.userId,

  switchUser: (newUserId: number | null) => {
    const key = getWishlistKey(newUserId);
    try {
      const raw = localStorage.getItem(key);
      const ids = raw ? JSON.parse(raw) : (newUserId ? [] : [1, 2]);
      set({ currentUserId: newUserId, productIds: ids });
    } catch {
      set({ currentUserId: newUserId, productIds: [] });
    }
  },

  toggleWishlist: (productId: number) => {
    const current = get().productIds;
    const exists = current.includes(productId);
    let updated: number[];
    if (exists) {
      updated = current.filter(id => id !== productId);
    } else {
      updated = [...current, productId];
    }
    const key = getWishlistKey(get().currentUserId);
    localStorage.setItem(key, JSON.stringify(updated));
    set({ productIds: updated });

    // Gọi API 13.2 ngầm để đồng bộ backend
    wishlistService.toggleWishlist(productId).catch(err => {
      console.warn('[wishlistStore] toggleWishlist API failed, kept local state', err);
    });

    return !exists;
  },

  isInWishlist: (productId: number) => {
    return get().productIds.includes(productId);
  },

  getCount: () => {
    return get().productIds.length;
  },

  syncWithBackend: async () => {
    try {
      const res = await wishlistService.getWishlist();
      if (res?.items) {
        const ids = res.items.map(it => it.productId);
        const key = getWishlistKey(get().currentUserId);
        localStorage.setItem(key, JSON.stringify(ids));
        set({ productIds: ids });
      }
    } catch (err) {
      console.warn('[wishlistStore] syncWithBackend failed', err);
    }
  }
}));
