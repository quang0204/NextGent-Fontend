import { create } from 'zustand';

interface CompareStore {
  productIds: number[];
  addToCompare: (productId: number) => { success: boolean; message: string };
  removeFromCompare: (productId: number) => void;
  clearCompare: () => void;
  isInCompare: (productId: number) => boolean;
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  productIds: [],

  addToCompare: (productId: number) => {
    const current = get().productIds;
    if (current.includes(productId)) {
      return { success: false, message: 'Sản phẩm đã có trong danh sách so sánh' };
    }
    if (current.length >= 3) {
      return { success: false, message: 'Chỉ được so sánh tối đa 3 sản phẩm cùng lúc' };
    }
    set({ productIds: [...current, productId] });
    return { success: true, message: 'Đã thêm vào bảng so sánh' };
  },

  removeFromCompare: (productId: number) => {
    set({ productIds: get().productIds.filter(id => id!== productId) });
  },

  clearCompare: () => {
    set({ productIds: [] });
  },

  isInCompare: (productId: number) => {
    return get().productIds.includes(productId);
  }
}));
