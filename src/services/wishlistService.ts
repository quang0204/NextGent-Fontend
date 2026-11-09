import { apiClient } from './apiClient';
import { sharedStore } from './sharedStore';
import { Product } from '../types/product';

export interface WishlistItem {
  wishlistId: number;
  productId: number;
  productName: string;
  slug?: string;
  thumbnailUrl: string;
  basePrice: number;
  priceFrom: number;
  status: string;
  images: string[];
  specs: string[];
  variantCount: number;
  addedAt: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
  pageInfo: {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
    hasNext: boolean;
  };
}

export interface WishlistToggleResponse {
  productId: number;
  isFavorite: boolean;
  message: string;
}

export const wishlistService = {
  /**
   * API 13.1: GET /api/v1/wishlists
   * Lấy danh sách sản phẩm yêu thích (Client - Auth)
   */
  async getWishlist(page: number = 1, size: number = 10): Promise<WishlistResponse> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: WishlistResponse;
      }>('/wishlists', {
        params: { page, size },
      });

      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[wishlistService.getWishlist] Fallback to local store', err);
    }

    // Fallback sang local store
    const localUser = JSON.parse(localStorage.getItem('nextpick_user_v2') || '{}');
    const key = localUser?.userId ? `nextpick_wishlist_user_${localUser.userId}` : 'nextpick_wishlist_guest';
    const localIds: number[] = JSON.parse(localStorage.getItem(key) || '[1, 2]');
    const allProducts = sharedStore.getProducts();
    const favProducts = allProducts.filter((p) => localIds.includes(p.productId));

    const items: WishlistItem[] = favProducts.map((p, idx) => {
      const minPrice = p.variants?.length > 0
        ? Math.min(...p.variants.map((v) => v.salePrice || v.listPrice))
        : 29990000;
      return {
        wishlistId: idx + 1,
        productId: p.productId,
        productName: p.name,
        thumbnailUrl: p.thumbnail || p.gallery?.[0] || '',
        basePrice: minPrice,
        priceFrom: minPrice,
        status: 'ACTIVE',
        images: p.gallery || [p.thumbnail],
        specs: p.highlights || ['Màn hình cao cấp', 'Chip xử lý mạnh mẽ'],
        variantCount: p.variants?.length || 1,
        addedAt: new Date().toISOString(),
      };
    });

    return {
      items,
      total: items.length,
      pageInfo: {
        page,
        size,
        totalPages: Math.ceil(items.length / size) || 1,
        totalElements: items.length,
        hasNext: false,
      },
    };
  },

  /**
   * API 13.2: POST /api/v1/wishlists/toggle
   * Thêm hoặc bỏ yêu thích sản phẩm (Client - Auth)
   */
  async toggleWishlist(productId: number): Promise<WishlistToggleResponse> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: WishlistToggleResponse;
      }>('/wishlists/toggle', { productId });

      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[wishlistService.toggleWishlist] Fallback to local store', err);
    }

    // Fallback: Toggle cục bộ
    const localUser = JSON.parse(localStorage.getItem('nextpick_user_v2') || '{}');
    const key = localUser?.userId ? `nextpick_wishlist_user_${localUser.userId}` : 'nextpick_wishlist_guest';
    const current: number[] = JSON.parse(localStorage.getItem(key) || '[1, 2]');
    const exists = current.includes(productId);
    const updated = exists ? current.filter((id) => id !== productId) : [...current, productId];
    localStorage.setItem(key, JSON.stringify(updated));

    return {
      productId,
      isFavorite: !exists,
      message: !exists ? 'Đã thêm sản phẩm vào danh sách yêu thích.' : 'Đã bỏ sản phẩm khỏi danh sách yêu thích.',
    };
  },
};
