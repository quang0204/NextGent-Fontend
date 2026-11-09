import { apiClient } from './apiClient';
import { Product, Brand } from '../types/product';
import { ProductReview } from '../types/review';
import { sharedStore } from './sharedStore';
import { reviewService } from './feedbackService';

export interface ProductFilterParams {
  category?: string;
  brand?: string;
  brands?: string[];
  isFlashSale?: boolean;
  minPrice?: number;
  maxPrice?: number;
  rom?: number;
  ram?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'best_seller';
}

export const productService = {
  // Lấy danh sách sản phẩm có bộ lọc đa tiêu chí từ nguồn Single Source of Truth
  async getProducts(params?: ProductFilterParams): Promise<Product[]> {
    try {
      const response = await apiClient.get<Product[]>('/public/products', { params });
      return response.data;
    } catch {
      let results = [...sharedStore.getProducts()];

      // Lọc danh mục (Điện thoại, Laptop, Máy tính bảng, Phụ kiện)
      if (params?.category && params.category!== 'all') {
        const catMap: Record<string, string> = {
          phone: 'Điện thoại',
          laptop: 'Laptop',
          tablet: 'Máy tính bảng',
          accessory: 'Phụ kiện',
        };
        const targetCategory = catMap[params.category] || params.category;
        results = results.filter(p => p.categoryName.toLowerCase().includes(targetCategory.toLowerCase()));
      }

      // Lọc thương hiệu (hỗ trợ chọn đồng thời nhiều hãng)
      if (params?.brands && params.brands.length > 0) {
        const lowerList = params.brands.map(b => b.toLowerCase().trim());
        results = results.filter(p => lowerList.includes(p.brandName.toLowerCase().trim()));
      } else if (params?.brand && params.brand!== 'all') {
        const brandList = params.brand.split(',').map(b => b.toLowerCase().trim()).filter(Boolean);
        if (brandList.length > 0) {
          results = results.filter(p => brandList.includes(p.brandName.toLowerCase().trim()));
        }
      }

      // Lọc Flash sale
      if (params?.isFlashSale!== undefined) {
        results = results.filter(p =>!!p.isFlashSale === params.isFlashSale);
      }

      // Lọc theo khoảng giá (minPrice, maxPrice)
      if (params?.minPrice!== undefined && params?.maxPrice!== undefined) {
        results = results.filter(p => p.variants.some(v => v.salePrice >= params.minPrice! && v.salePrice <= params.maxPrice!));
      } else {
        if (params?.minPrice!== undefined) {
          results = results.filter(p => p.variants.some(v => v.salePrice >= params.minPrice!));
        }
        if (params?.maxPrice!== undefined) {
          results = results.filter(p => p.variants.some(v => v.salePrice <= params.maxPrice!));
        }
      }

      // Lọc theo dung lượng ROM
      if (params?.rom) {
        results = results.filter(p => p.variants.some(v => v.romGb === params.rom));
      }

      // Lọc theo dung lượng RAM (Laptop, Điện thoại)
      if (params?.ram) {
        results = results.filter(p => p.variants.some(v => v.ramGb === params.ram));
      }

      // Lọc theo từ khóa tìm kiếm
      if (params?.search) {
        const q = params.search.toLowerCase();
        results = results.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.brandName.toLowerCase().includes(q) ||
          p.variants.some(v => v.sku.toLowerCase().includes(q))
        );
      }

      // Sắp xếp
      if (params?.sort) {
        switch (params.sort) {
          case 'price_asc':
            results.sort((a, b) => (a.variants[0]?.salePrice || 0) - (b.variants[0]?.salePrice || 0));
            break;
          case 'price_desc':
            results.sort((a, b) => (b.variants[0]?.salePrice || 0) - (a.variants[0]?.salePrice || 0));
            break;
          case 'best_seller':
            results.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
            break;
          case 'newest':
          default:
            results.sort((a, b) => b.productId - a.productId);
            break;
        }
      }

      return results;
    }
  },

  // Lấy chi tiết sản phẩm theo ID
  async getProductById(id: number): Promise<Product | null> {
    try {
      const response = await apiClient.get<Product>(`/public/products/${id}`);
      return response.data;
    } catch {
      return sharedStore.getProductById(id) || null;
    }
  },

  // Lấy danh sách thương hiệu (API 3.6: GET /api/v1/brands)
  async getBrands(category?: string): Promise<Brand[]> {
    try {
      const response = await apiClient.get<any>('/brands');
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data.map((b: any) => ({
          brandId: b.brandId,
          name: b.name,
          logoUrl: b.logoUrl,
          description: b.description,
          slug: b.slug,
        }));
      }
      return response.data;
    } catch {
      return sharedStore.getBrands(category);
    }
  },

  // Lấy đánh giá của sản phẩm (API 12.1)
  async getReviews(productId: number): Promise<ProductReview[]> {
    try {
      const res = await reviewService.getProductReviews(productId);
      return res.items;
    } catch {
      return sharedStore.getReviews(productId);
    }
  },

  // Gửi đánh giá mới với kiểm tra điều kiện đã mua hàng và hoàn tất (API 12.2)
  async submitReview(review: {
    orderItemId?: number;
    productId: number;
    productName?: string;
    userName: string;
    phone: string;
    rating: number;
    comment: string;
    images?: string[];
  }): Promise<{ success: boolean; message: string; review?: ProductReview }> {
    if (review.orderItemId) {
      const res = await reviewService.createReview({
        orderItemId: review.orderItemId,
        rating: review.rating,
        comment: review.comment,
      });
      return res;
    }
    return sharedStore.submitReview(review);
  },

  // Lấy danh sách sản phẩm so sánh
  async getCompareProducts(ids: number[]): Promise<Product[]> {
    const prods = sharedStore.getProducts();
    return prods.filter(p => ids.includes(p.productId));
  }
};
