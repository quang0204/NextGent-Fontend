import { create } from 'zustand';

export interface CompareProductInput {
  productId: number;
  name?: string;
  categoryId?: number;
  categoryName?: string;
  rootCategoryId?: number | null;
  rootCategoryName?: string | null;
  parentCategoryId?: number | null;
}

interface CompareStore {
  productIds: number[];
  rootCategoryId: number | null;
  rootCategoryName: string | null;
  selectedVariantIds: Record<number, number>; // productId -> variantId
  addToCompare: (
    productOrId: number | CompareProductInput,
    variantId?: number
  ) => { success: boolean; message: string };
  removeFromCompare: (productId: number) => void;
  clearCompare: () => void;
  isInCompare: (productId: number) => boolean;
  setSelectedVariant: (productId: number, variantId: number) => void;
  setRootCategoryInfo: (id: number | null, name: string | null) => void;
}

const STORAGE_KEY = 'nextpick_compare_state_v1';

const getInitialState = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          productIds: Array.isArray(parsed.productIds) ? parsed.productIds : [],
          rootCategoryId: parsed.rootCategoryId ?? null,
          rootCategoryName: parsed.rootCategoryName ?? null,
          selectedVariantIds: parsed.selectedVariantIds || {},
        };
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return {
    productIds: [],
    rootCategoryId: null,
    rootCategoryName: null,
    selectedVariantIds: {},
  };
};

const saveState = (state: {
  productIds: number[];
  rootCategoryId: number | null;
  rootCategoryName: string | null;
  selectedVariantIds: Record<number, number>;
}) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota error
  }
};

const initial = getInitialState();

export const useCompareStore = create<CompareStore>((set, get) => ({
  productIds: initial.productIds,
  rootCategoryId: initial.rootCategoryId,
  rootCategoryName: initial.rootCategoryName,
  selectedVariantIds: initial.selectedVariantIds,

  addToCompare: (productOrId: number | CompareProductInput, variantId?: number) => {
    const isObj = typeof productOrId === 'object' && productOrId !== null;
    const productId = isObj ? productOrId.productId : productOrId;
    const incomingRootId = isObj
      ? (productOrId.rootCategoryId ?? productOrId.parentCategoryId ?? productOrId.categoryId ?? null)
      : null;
    const incomingRootName = isObj
      ? (productOrId.rootCategoryName ?? productOrId.categoryName ?? null)
      : null;
    const incomingName = isObj ? productOrId.name : `Sản phẩm #${productId}`;

    const current = get().productIds;
    if (current.includes(productId)) {
      return { success: false, message: 'Sản phẩm đã có trong danh sách so sánh' };
    }
    if (current.length >= 3) {
      return { success: false, message: 'Chỉ được so sánh tối đa 3 sản phẩm cùng lúc' };
    }

    // Không áp dụng so sánh cho ngành hàng Phụ kiện di động & Âm thanh
    const isAccessory = Boolean(
      Number(incomingRootId) === 4 ||
      incomingRootName?.toLowerCase().includes('phụ kiện') ||
      (isObj && (
        (productOrId as any).categoryName?.toLowerCase().includes('phụ kiện') ||
        (productOrId as any).categoryName?.toLowerCase().includes('tai nghe') ||
        (productOrId as any).categoryName?.toLowerCase().includes('loa') ||
        (productOrId as any).categoryName?.toLowerCase().includes('củ sạc') ||
        (productOrId as any).categoryName?.toLowerCase().includes('cáp')
      ))
    );
    if (isAccessory) {
      return {
        success: false,
        message: 'Tính năng so sánh không áp dụng cho ngành hàng Phụ kiện di động & Âm thanh.',
      };
    }

    const currentRootId = get().rootCategoryId;
    const currentRootName = get().rootCategoryName;

    // Ràng buộc cùng danh mục cha (Root Category)
    if (current.length > 0 && currentRootId !== null && incomingRootId !== null) {
      if (Number(currentRootId) !== Number(incomingRootId)) {
        return {
          success: false,
          message: `Không thể so sánh các sản phẩm khác danh mục cha! Sản phẩm "${incomingName}" thuộc nhóm "${incomingRootName || 'khác'}", không cùng danh mục cha với nhóm "${currentRootName || 'sản phẩm trước'}" (chỉ cho phép so sánh điện thoại với điện thoại, laptop với laptop,...).`,
        };
      }
    }

    const newProductIds = [...current, productId];
    const newRootId = current.length === 0 ? incomingRootId : (currentRootId ?? incomingRootId);
    const newRootName = current.length === 0 ? incomingRootName : (currentRootName ?? incomingRootName);
    const newVariants = { ...get().selectedVariantIds };
    if (variantId) {
      newVariants[productId] = variantId;
    }

    const newState = {
      productIds: newProductIds,
      rootCategoryId: newRootId,
      rootCategoryName: newRootName,
      selectedVariantIds: newVariants,
    };

    set(newState);
    saveState(newState);

    return { success: true, message: 'Đã thêm vào bảng so sánh' };
  },

  removeFromCompare: (productId: number) => {
    const newProductIds = get().productIds.filter((id) => id !== productId);
    const newVariants = { ...get().selectedVariantIds };
    delete newVariants[productId];

    const newState = {
      productIds: newProductIds,
      rootCategoryId: newProductIds.length === 0 ? null : get().rootCategoryId,
      rootCategoryName: newProductIds.length === 0 ? null : get().rootCategoryName,
      selectedVariantIds: newVariants,
    };
    set(newState);
    saveState(newState);
  },

  clearCompare: () => {
    const newState = {
      productIds: [],
      rootCategoryId: null,
      rootCategoryName: null,
      selectedVariantIds: {},
    };
    set(newState);
    saveState(newState);
  },

  isInCompare: (productId: number) => {
    return get().productIds.includes(productId);
  },

  setSelectedVariant: (productId: number, variantId: number) => {
    const newVariants = { ...get().selectedVariantIds, [productId]: variantId };
    const newState = {
      productIds: get().productIds,
      rootCategoryId: get().rootCategoryId,
      rootCategoryName: get().rootCategoryName,
      selectedVariantIds: newVariants,
    };
    set(newState);
    saveState(newState);
  },

  setRootCategoryInfo: (id: number | null, name: string | null) => {
    const newState = {
      productIds: get().productIds,
      rootCategoryId: id,
      rootCategoryName: name,
      selectedVariantIds: get().selectedVariantIds,
    };
    set(newState);
    saveState(newState);
  },
}));
