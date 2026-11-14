import { apiClient } from './apiClient';
import { Product, ProductVariant, Brand, AdminProductDetailResponse } from '../types/product';
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
  cpu?: string;
  requirement?: string;
  connectionType?: string;
  minDiscount?: number;
  isInstallment0?: boolean;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'best_seller' | 'discount_desc' | 'rating_desc';
  page?: number;
  limit?: number;
  brandId?: number;
  categoryId?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'best_seller' | 'discount_desc' | 'rating_desc';
}

export interface CreateProductImagePayload {
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface CreateProductSpecPayload {
  groupName: string;
  specName: string;
  specValue: string;
  sortOrder?: number;
}

export interface CreateProductVariantPayload {
  sku: string;
  color?: string;
  ramGb?: number;
  romGb?: number;
  connectionType?: string;
  attributes?: Record<string, any>;
  listPrice: number;
  salePrice?: number;
  compareAtPrice?: number;
  initialOnHandQty: number;
  minThreshold?: number;
}

export interface CreateAdminProductPayload {
  categoryId: number;
  brandId: number;
  name: string;
  description?: string;
  warrantyPolicy?: string;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  images?: CreateProductImagePayload[];
  specs?: CreateProductSpecPayload[];
  variants: CreateProductVariantPayload[];
}

export interface UpdateAdminProductPayload {
  name?: string;
  categoryId?: number;
  brandId?: number;
  description?: string;
  warrantyPolicy?: string;
  specs?: Array<{
    specId?: number;
    groupName: string;
    specName: string;
    specValue: string;
    sortOrder?: number;
  }>;
  images?: Array<{
    imageId?: number;
    imageUrl: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
}

export interface AddAdminVariantPayload {
  sku: string;
  color?: string;
  ramGb?: number;
  romGb?: number;
  connectionType?: string;
  attributes?: Record<string, any>;
  listPrice: number;
  salePrice?: number;
  compareAtPrice?: number;
  initialOnHandQty: number;
  minThreshold?: number;
  imageUrl?: string;
}

export interface UpdateAdminVariantPayload {
  sku?: string;
  listPrice?: number;
  salePrice?: number;
  compareAtPrice?: number;
  isActive?: boolean;
  color?: string;
  ramGb?: number;
  romGb?: number;
  connectionType?: string;
  imageUrl?: string;
  attributes?: Record<string, any>;
  minThreshold?: number;
}

const mapApiProductToFrontend = (it: any): Product => {
  const brandName = it.brand?.name || it.brandName || (typeof it.brand === 'string' ? it.brand : 'Khác');
  const categoryName = it.category?.name || it.categoryName || (typeof it.category === 'string' ? it.category : 'Điện thoại');
  const thumbnail = it.primaryImage || it.thumbnail || (it.images?.[0]?.imageUrl) || (typeof it.images?.[0] === 'string' ? it.images[0] : '') || '';
  const gallery = it.images && it.images.length > 0
    ? it.images.map((img: any) => typeof img === 'string' ? img : img.imageUrl)
    : [thumbnail].filter(Boolean);

  const specGroups = it.specs && Array.isArray(it.specs)
    ? it.specs.map((g: any) => ({
        groupName: g.groupName || 'Thông số chung',
        items: (g.items || []).map((s: any) => ({
          name: s.specName || s.name || '',
          value: s.specValue || s.value || '',
        })),
      }))
    : (it.specGroups || []);

  const variants = it.variants && Array.isArray(it.variants) && it.variants.length > 0
    ? it.variants.map((v: any, idx: number) => {
        const avail = v.availableQty !== undefined ? Number(v.availableQty) : 20;
        const onHand = v.onHandQty !== undefined ? Number(v.onHandQty) : avail;
        const reserved = v.reservedQty !== undefined ? Number(v.reservedQty) : Math.max(0, onHand - avail);
        const rawCompareAt = Number(v.compareAtPrice || v.listPrice || 0);
        const rawSale = Number(v.salePrice || v.promoPrice || v.price || 0);
        const effectiveSalePrice = rawSale > 0 ? rawSale : (rawCompareAt > 0 ? rawCompareAt : Number(it.salePrice || it.minPrice || 0));
        let effectiveListPrice = rawCompareAt > 0 ? rawCompareAt : Number(it.originalPrice || it.maxPrice || 0);
        if (effectiveListPrice < effectiveSalePrice) {
          effectiveListPrice = effectiveSalePrice > 0 ? Math.round(effectiveSalePrice * 1.15) : effectiveSalePrice;
        }

        return {
          variantId: v.variantId || (it.productId * 100 + idx + 1),
          productId: it.productId,
          sku: v.sku || `${it.productId}-VAR-${idx + 1}`,
          variantName: v.variantName,
          color: v.color || (it.availableColors?.[idx] || 'Mặc định'),
          ramGb: v.ramGb !== undefined ? v.ramGb : 8,
          romGb: v.romGb !== undefined ? v.romGb : 0,
          connectionType: v.connectionType || '5G',
          attributes: v.attributes,
          listPrice: effectiveListPrice,
          salePrice: effectiveSalePrice,
          availableQty: avail,
          onHandQty: onHand,
          reservedQty: reserved,
          imageUrl: v.imageUrl || thumbnail,
          isActive: v.isActive ?? true,
        };
      })
    : (it.availableColors || ['Mặc định']).map((color: string, cIdx: number) => ({
        variantId: it.productId * 100 + cIdx + 1,
        productId: it.productId,
        sku: `${it.name.replace(/\s+/g, '-').toUpperCase()}-${cIdx + 1}`,
        color,
        ramGb: 0,
        romGb: 0,
        connectionType: undefined,
        listPrice: Number(it.maxPrice || it.originalPrice || it.minPrice || it.salePrice || 0),
        salePrice: Number(it.salePrice ?? it.minPrice ?? it.originalPrice ?? 0),
        availableQty: 20,
        onHandQty: 20,
        reservedQty: 0,
        imageUrl: thumbnail,
        isActive: it.isAvailable ?? true,
      }));

  return {
    productId: it.productId,
    name: it.name,
    brandName,
    categoryName,
    categoryId: it.category?.categoryId || it.categoryId,
    brandId: it.brand?.brandId || it.brandId,
    description: it.description,
    status: it.status || (it.isAvailable !== false ? 'ACTIVE' : 'INACTIVE'),
    warrantyPolicy: it.warrantyPolicy || 'Bảo hành 12 tháng chính hãng',
    thumbnail,
    gallery,
    variants,
    rating: it.rating ?? 5,
    reviewCount: it.reviewCount ?? 0,
    specGroups,
    highlights: it.highlights || [
      `Màn hình: ${it.specs?.[0]?.items?.[0]?.specValue || 'OLED'}`,
      `Hiệu năng: ${it.specs?.[1]?.items?.[0]?.specValue || 'Chip cao cấp'}`
    ],
    isInstallment0: it.isInstallment0 ?? true,
    isFlashSale: it.isFlashSale ?? Boolean(it.promotion || (it.discountPercent && it.discountPercent > 0)),
    soldCount: it.soldCount ?? 0,
  };
};


const fetchActivePromotionsRaw = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get<any>('/promotions/active');
    if (Array.isArray(res.data?.data)) {
      return res.data.data;
    }
  } catch {
    // Fallback sang sharedStore nếu backend offline
  }
  return sharedStore.getPromotions().filter((p) => p.status === 'ACTIVE');
};

export const applyActivePromotionsToProducts = async (
  products: Product[],
  preloadedPromos?: any[]
): Promise<Product[]> => {
  if (!products.length) return products;
  const promos = preloadedPromos ?? (await fetchActivePromotionsRaw());
  if (!promos.length) return products;

  const promoByVariantId = new Map<number, { promoPrice: number; listPrice: number }>();
  const promoBySku = new Map<string, { promoPrice: number; listPrice: number }>();
  const flashProductIds = new Set<number>();

  for (const promo of promos) {
    for (const v of promo?.variants || []) {
      const promoPrice = Number(v.promoPrice || 0);
      if (promoPrice <= 0) continue;
      const listPrice = Number(v.listPrice || 0);
      if (v.productId) flashProductIds.add(Number(v.productId));

      const vid = Number(v.variantId || 0);
      if (vid > 0) {
        const cur = promoByVariantId.get(vid);
        if (!cur || promoPrice < cur.promoPrice) {
          promoByVariantId.set(vid, { promoPrice, listPrice });
        }
      }
      if (v.sku) {
        const skuKey = String(v.sku).toUpperCase();
        const cur = promoBySku.get(skuKey);
        if (!cur || promoPrice < cur.promoPrice) {
          promoBySku.set(skuKey, { promoPrice, listPrice });
        }
      }
    }
  }

  return products.map((prod) => {
    let hasPromo = flashProductIds.has(Number(prod.productId));
    const nextVariants = (prod.variants || []).map((vr) => {
      const match =
        promoByVariantId.get(Number(vr.variantId)) ||
        (vr.sku ? promoBySku.get(vr.sku.toUpperCase()) : undefined);
      if (!match) return vr;
      hasPromo = true;
      const baseListPrice = Math.max(Number(vr.listPrice || 0), Number(vr.salePrice || 0), match.listPrice);
      return {
        ...vr,
        listPrice: baseListPrice,
        salePrice: match.promoPrice,
      };
    });
    return hasPromo ? { ...prod, isFlashSale: true, variants: nextVariants } : prod;
  });
};

export const productService = {
  /**
   * API 4.1: GET /api/v1/products
   * Danh sách sản phẩm kèm bộ lọc đa tiêu chí
   */
  async getProducts(params?: ProductFilterParams): Promise<Product[]> {
    const classifyProductCategory = (p: Product): 'phone' | 'laptop' | 'tablet' | 'accessory' => {
      const pName = (p.name || '').toLowerCase();
      const cName = (p.categoryName || '').toLowerCase();
      const catId = Number(p.categoryId || 0);
      const hasRom = Array.isArray(p.variants) && p.variants.some(v => (v.romGb || 0) >= 32);

      // 1. Nhận diện chính xác theo tên sản phẩm (chống lệch danh mục do dữ liệu test cũ)
      if (
        pName.includes('tai nghe') || pName.includes('airpods') || pName.includes('earbuds') ||
        pName.includes('củ sạc') || pName.includes('sạc dự phòng') || pName.includes('pin dự phòng') ||
        pName.includes('cáp') || pName.includes('dây sạc') || pName.includes('loa ') ||
        pName.includes('loa bluetooth') || pName.includes('ốp lưng') || pName.includes('bao da') ||
        pName.includes('kính cường lực') || pName.includes('magsafe') || pName.includes('anker') ||
        pName.includes('marshall') || pName.includes('chuột') || pName.includes('bàn phím') ||
        pName.includes('adapter') || pName.includes('hub ') || pName.includes('phụ kiện')
      ) {
        return 'accessory';
      }

      if (
        pName.includes('laptop') || pName.includes('lap top') || pName.includes('macbook') ||
        pName.includes('mac book') || pName.includes('thinkpad') || pName.includes('zenbook') ||
        pName.includes('vivobook') || pName.includes('legion') || pName.includes('ideapad') ||
        pName.includes('rog ') || pName.includes('tuf ') || pName.includes('máy tính xách tay')
      ) {
        return 'laptop';
      }

      if (
        pName.includes('ipad') || pName.includes('i pad') || pName.includes('galaxy tab') ||
        pName.includes('samsung tab') || pName.includes('xiaomi pad') || pName.includes('redmi pad') ||
        pName.includes('matepad') || pName.includes('máy tính bảng') || pName.includes('tablet')
      ) {
        return 'tablet';
      }

      if (
        pName.includes('iphone') || pName.includes('i phone') || pName.includes('điện thoại') ||
        pName.includes('smartphone') || pName.includes('galaxy s') || pName.includes('galaxy z') ||
        pName.includes('galaxy a') || pName.includes('redmi note') || pName.includes('xiaomi 1') ||
        pName.includes('oppo') || pName.includes('vivo') || pName.includes('realme') || pName.includes('pixel')
      ) {
        return 'phone';
      }

      // 2. Nhận diện theo tên danh mục hoặc ID danh mục
      if (
        catId === 4 || catId === 12 || catId === 13 || catId === 14 ||
        cName.includes('phụ kiện') || cName.includes('âm thanh') || cName.includes('tai nghe') ||
        cName.includes('sạc') || cName.includes('cáp') || cName.includes('loa')
      ) {
        return hasRom ? 'phone' : 'accessory';
      }

      if (
        catId === 3 || catId === 10 || catId === 11 ||
        cName.includes('laptop') || cName.includes('macbook') || cName.includes('pc') || cName.includes('máy tính xách tay')
      ) {
        return 'laptop';
      }

      if (
        catId === 2 || catId === 8 || catId === 9 ||
        cName.includes('máy tính bảng') || cName.includes('tablet') || cName.includes('ipad')
      ) {
        return 'tablet';
      }

      return 'phone';
    };

    const matchesCategory = (p: Product, catKey?: string) => {
      if (!catKey || catKey === 'all') return true;
      if (catKey === 'phone' || catKey === 'laptop' || catKey === 'tablet' || catKey === 'accessory') {
        return classifyProductCategory(p) === catKey;
      }
      return (p.categoryName || '').toLowerCase().includes(catKey.toLowerCase());
    };

    let fetchedProducts: Product[] | null = null;

    try {
      // Backend giới hạn pageSize <= 50 mỗi trang; tải toàn bộ để lọc danh mục chính xác
      const queryParams: any = {
        page: 1,
        limit: 50,
      };
      if (params?.search) queryParams.search = params.search;
      if (params?.brandId) queryParams.brandId = params.brandId;
      if (params?.categoryId) queryParams.categoryId = params.categoryId;
      if (params?.minPrice !== undefined) queryParams.minPrice = params.minPrice;
      if (params?.maxPrice !== undefined) queryParams.maxPrice = params.maxPrice;
      if (params?.ram) queryParams.ram = params.ram;
      if (params?.rom) queryParams.rom = params.rom;
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      else if (params?.sort) queryParams.sortBy = params.sort;

      const response = await apiClient.get<any>('/products', { params: queryParams });
      if (response.data?.data) {
        const items = response.data.data.items || response.data.data;
        if (Array.isArray(items)) {
          const prods = await Promise.all(
            items.map(async (it: any) => {
              try {
                const det = await apiClient.get<any>("/products/" + it.productId);
                if (det.data?.data?.variants && Array.isArray(det.data.data.variants) && det.data.data.variants.length > 0) {
                  return mapApiProductToFrontend({
                    ...it,
                    ...det.data.data,
                    variants: det.data.data.variants
                  });
                }
              } catch {}
              return mapApiProductToFrontend(it);
            })
          );
          const withPromos = await applyActivePromotionsToProducts(prods);
          if (!params?.search && !params?.categoryId && !params?.brandId && params?.minPrice === undefined && params?.maxPrice === undefined) {
            sharedStore.setProducts(withPromos);
          }
          fetchedProducts = withPromos;
        }
      }
    } catch (err) {
      console.warn('[productService.getProducts] Fallback to sharedStore', err);
    }

    let results = fetchedProducts !== null ? [...fetchedProducts] : [...sharedStore.getProducts()];

    // 1. Lọc danh mục
    if (params?.category && params.category !== 'all') {
      results = results.filter(p => matchesCategory(p, params.category));
    }

    // 2. Lọc thương hiệu (hỗ trợ chọn đồng thời nhiều hãng)
    if (params?.brands && params.brands.length > 0) {
      const lowerList = params.brands.map(b => b.toLowerCase().trim());
      results = results.filter(p => lowerList.includes(p.brandName.toLowerCase().trim()));
    } else if (params?.brand && params.brand !== 'all') {
      const brandList = params.brand.split(',').map(b => b.toLowerCase().trim()).filter(Boolean);
      if (brandList.length > 0) {
        results = results.filter(p => brandList.includes(p.brandName.toLowerCase().trim()));
      }
    }

    // 3. Lọc Flash sale
    if (params?.isFlashSale !== undefined) {
      results = results.filter(p => !p.isFlashSale === !params.isFlashSale);
    }

    // 4. Lọc theo khoảng giá
    if (params?.minPrice !== undefined && params?.maxPrice !== undefined) {
      results = results.filter(p => p.variants.some(v => v.salePrice >= params.minPrice! && v.salePrice <= params.maxPrice!));
    } else {
      if (params?.minPrice !== undefined) {
        results = results.filter(p => p.variants.some(v => v.salePrice >= params.minPrice!));
      }
      if (params?.maxPrice !== undefined) {
        results = results.filter(p => p.variants.some(v => v.salePrice <= params.maxPrice!));
      }
    }

    // 5. Lọc theo dung lượng ROM / Ổ cứng SSD
    if (params?.rom) {
      results = results.filter(p => p.variants.some(v => v.romGb === params.rom));
    }

    // 6. Lọc theo dung lượng RAM
    if (params?.ram) {
      results = results.filter(p => p.variants.some(v => v.ramGb === params.ram));
    }

    // 7. Lọc theo CPU (Apple Silicon, Intel, AMD)
    if (params?.cpu) {
      const lowerCpu = params.cpu.toLowerCase();
      results = results.filter(p => {
        const text = `${p.name} ${p.description || ''} ${JSON.stringify(p.specGroups || [])}`.toLowerCase();
        return text.includes(lowerCpu);
      });
    }

    // 8. Lọc theo Chuẩn kết nối (Wifi, 5G, USB-C, Lightning, Bluetooth...)
    if (params?.connectionType) {
      const lowerConn = params.connectionType.toLowerCase();
      results = results.filter(p => 
        p.variants.some(v => v.connectionType?.toLowerCase().includes(lowerConn)) ||
        JSON.stringify(p.specGroups || []).toLowerCase().includes(lowerConn) ||
        p.name.toLowerCase().includes(lowerConn)
      );
    }

    // 9. Lọc theo Nhu cầu sử dụng
    if (params?.requirement) {
      const req = params.requirement.toLowerCase();
      results = results.filter(p => {
        const text = `${p.name} ${p.description || ''} ${JSON.stringify(p.specGroups || [])} ${JSON.stringify(p.highlights || [])}`.toLowerCase();
        if (req === 'gaming') {
          return text.includes('gaming') || text.includes('rog') || text.includes('120hz') || text.includes('144hz') || text.includes('tản nhiệt') || text.includes('rtx');
        }
        if (req === 'camera') {
          return text.includes('camera') || text.includes('leica') || text.includes('zoom') || text.includes('chụp ảnh') || text.includes('lyt-900') || text.includes('48mp');
        }
        if (req === 'battery') {
          return text.includes('5000') || text.includes('6000') || text.includes('pin trâu') || text.includes('sạc nhanh');
        }
        if (req === 'foldable') {
          return text.includes('fold') || text.includes('flip') || text.includes('gập');
        }
        if (req === 'office') {
          return text.includes('văn phòng') || text.includes('mỏng nhẹ') || text.includes('macbook air') || text.includes('zenbook');
        }
        if (req === 'graphic') {
          return text.includes('đồ họa') || text.includes('macbook pro') || text.includes('creators') || text.includes('m3 max') || text.includes('rtx');
        }
        return text.includes(req);
      });
    }

    // 10. Lọc theo % giảm giá tối thiểu
    if (params?.minDiscount) {
      results = results.filter(p => {
        return p.variants.some(v => {
          if (!v.listPrice || v.listPrice <= v.salePrice) return false;
          const disc = Math.round(((v.listPrice - v.salePrice) / v.listPrice) * 100);
          return disc >= params.minDiscount!;
        });
      });
    }

    // 11. Lọc theo Trả góp 0%
    if (params?.isInstallment0) {
      results = results.filter(p => p.isInstallment0);
    }

    // 12. Lọc theo từ khóa tìm kiếm
    if (params?.search) {
      const q = params.search.toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.brandName.toLowerCase().includes(q) ||
        p.variants.some(v => v.sku.toLowerCase().includes(q))
      );
    }

    // 13. Sắp xếp đa dạng
    const s = params?.sortBy || params?.sort || 'newest';
    switch (s) {
      case 'price_asc':
        results.sort((a, b) => (a.variants[0]?.salePrice || 0) - (b.variants[0]?.salePrice || 0));
        break;
      case 'price_desc':
        results.sort((a, b) => (b.variants[0]?.salePrice || 0) - (a.variants[0]?.salePrice || 0));
        break;
      case 'best_seller':
        results.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      case 'rating_desc':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'discount_desc':
        results.sort((a, b) => {
          const discA = a.variants[0]?.listPrice ? Math.max(0, a.variants[0].listPrice - a.variants[0].salePrice) : 0;
          const discB = b.variants[0]?.listPrice ? Math.max(0, b.variants[0].listPrice - b.variants[0].salePrice) : 0;
          return discB - discA;
        });
        break;
      case 'newest':
      default:
        results.sort((a, b) => b.productId - a.productId);
        break;
    }

    return results;
  },

  /**
   * API 4.2: GET /api/v1/products/featured
   * Danh sách sản phẩm nổi bật (FLASH_SALE hoặc BEST_SELLER)
   */
  async getFeaturedProducts(type: 'FLASH_SALE' | 'BEST_SELLER' = 'FLASH_SALE', limit: number = 8): Promise<Product[]> {
    try {
      const res = await apiClient.get<any>('/products/featured', { params: { type, limit } });
      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data.map(mapApiProductToFrontend);
      }
    } catch (err) {
      console.warn('[productService.getFeaturedProducts] Fallback to sharedStore', err);
    }
    const all = sharedStore.getProducts();
    if (type === 'FLASH_SALE') {
      return all.filter(p => p.isFlashSale).slice(0, limit);
    }
    return [...all].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, limit);
  },

  /**
   * API 4.3: GET /api/v1/products/{id}
   * Chi tiết sản phẩm (Specs, Images & SKU Variants)
   */
  async getProductById(id: number): Promise<Product | null> {
    try {
      const response = await apiClient.get<any>(`/products/${id}`);
      if (response.data?.data) {
        const mapped = mapApiProductToFrontend(response.data.data);
        const [withPromos] = await applyActivePromotionsToProducts([mapped]);
        const finalProd = withPromos || mapped;
        sharedStore.syncExternalProduct(finalProd);
        return finalProd;
      }
    } catch (err) {
      console.warn('[productService.getProductById] Fallback to sharedStore', err);
    }
    return sharedStore.getProductById(id) || null;
  },

  /**
   * API 4.4: GET /api/v1/products/{id}/related
   * Gợi ý sản phẩm liên quan
   */
  async getRelatedProducts(id: number, limit: number = 4): Promise<Product[]> {
    try {
      const res = await apiClient.get<any>(`/products/${id}/related`, { params: { limit } });
      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data.map(mapApiProductToFrontend);
      }
    } catch (err) {
      console.warn('[productService.getRelatedProducts] Fallback to sharedStore', err);
    }
    const all = sharedStore.getProducts();
    return all.filter(p => p.productId !== id).slice(0, limit);
  },

  /**
   * API 4.4: GET /api/v1/admin/products/{id}
   * Chi tiết sản phẩm quản trị (bất kể ACTIVE hay INACTIVE) kèm tồn kho, specsId và schema
   */
  async getAdminProductDetail(id: number): Promise<AdminProductDetailResponse | null> {
    try {
      const res = await apiClient.get<any>(`/admin/products/${id}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[productService.getAdminProductDetail] Fallback to sharedStore', err);
    }
    const local = sharedStore.getProductById(id);
    if (!local) return null;
    const invs = sharedStore.getInventories().filter(i => i.productId === id);
    const invMap = new Map(invs.map(i => [i.variantId, i]));

    return {
      productId: local.productId,
      name: local.name,
      categoryId: local.categoryId || 1,
      categoryName: local.categoryName,
      brandId: local.brandId || 1,
      brandName: local.brandName,
      description: local.warrantyPolicy || '',
      warrantyPolicy: local.warrantyPolicy || '',
      status: local.status || 'ACTIVE',
      effectiveVariantSchema: local.variantSchema,
      images: (local.gallery && local.gallery.length > 0 ? local.gallery : [local.thumbnail]).map((img, idx) => ({
        imageId: idx + 1,
        imageUrl: img,
        objectKey: img,
        bucket: 'products',
        isPrimary: idx === 0,
        sortOrder: idx + 1
      })),
      specs: (local.specGroups || []).flatMap(g => (g.items || []).map((it, idx) => ({
        specId: idx + 1,
        groupName: g.groupName,
        specName: it.name,
        specValue: it.value,
        sortOrder: it.sortOrder || idx + 1
      }))),
      variants: (local.variants || []).map(v => {
        const inv = invMap.get(v.variantId);
        return {
          variantId: v.variantId,
          sku: v.sku,
          variantName: v.variantName,
          color: v.color,
          ramGb: v.ramGb,
          romGb: v.romGb,
          connectionType: v.connectionType,
          attributes: v.attributes,
          listPrice: v.listPrice,
          isActive: v.isActive !== false,
          hasTransactions: false,
          inventory: inv ? {
            inventoryId: inv.inventoryId || v.variantId,
            onHandQty: inv.onHandQty,
            reservedQty: inv.reservedQty,
            availableQty: inv.availableQty,
            minThreshold: inv.minThreshold || 5
          } : undefined
        };
      })
    };
  },

  /**
   * API 4.5: POST /api/v1/admin/products
   * Khai báo sản phẩm mới (Master-Detail)
   */
  async createAdminProduct(payload: CreateAdminProductPayload): Promise<any> {
    try {
      const res = await apiClient.post<any>('/admin/products', payload);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[productService.createAdminProduct] Fallback to sharedStore', err);
    }
    return null;
  },

  /**
   * API 4.6: PUT /api/v1/admin/products/{id}
   * Cập nhật thông tin chung & Thông số kỹ thuật
   */
  async updateAdminProduct(id: number, payload: UpdateAdminProductPayload): Promise<any> {
    try {
      const res = await apiClient.put<any>(`/admin/products/${id}`, payload);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[productService.updateAdminProduct] Fallback to sharedStore', err);
    }
    return null;
  },

  /**
   * API 4.7: POST /api/v1/admin/products/{id}/variants
   * Thêm biến thể SKU mới cho sản phẩm có sẵn
   */
  async addAdminVariant(productId: number, payload: AddAdminVariantPayload): Promise<any> {
    try {
      const res = await apiClient.post<any>(`/admin/products/${productId}/variants`, payload);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[productService.addAdminVariant] Fallback to sharedStore', err);
    }
    return null;
  },

  /**
   * API 4.8: PUT /api/v1/admin/products/variants/{varId}
   * Cập nhật giá niêm yết hoặc Bật/Tắt biến thể SKU
   */
  async updateAdminVariant(varId: number, payload: UpdateAdminVariantPayload): Promise<any> {
    try {
      const res = await apiClient.put<any>(`/admin/products/variants/${varId}`, payload);
      if (res.data?.data) {
        return res.data.data;
      }
      return res.data;
    } catch (err) {
      console.warn('[productService.updateAdminVariant] error', err);
      throw err;
    }
  },

  /**
   * API 4.9: PATCH /api/v1/admin/products/{id}/status
   * Bật/Tắt trạng thái kinh doanh của sản phẩm
   */
  async updateProductStatus(id: number, status: 'ACTIVE' | 'INACTIVE', reason?: string): Promise<any> {
    sharedStore.updateProductStatus(id, status);
    try {
      const res = await apiClient.patch<any>(`/admin/products/${id}/status`, { status, reason });
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[productService.updateProductStatus] Fallback to sharedStore', err);
    }
    return null;
  },

  // Lấy danh sách thương hiệu (API 3.6: GET /api/v1/brands)
  async getBrands(category?: string): Promise<Brand[]> {
    try {
      const response = await apiClient.get<any>('/brands');
      if (response.data?.data && Array.isArray(response.data.data)) {
        sharedStore.syncExternalBrands(response.data.data);
        return response.data.data.map((b: any) => ({
          brandId: b.brandId,
          name: b.name,
          logoUrl: b.logoUrl,
          description: b.description,
          slug: b.slug,
          productCount: b.totalProducts || 0,
          categorySlugs: ['phone', 'laptop', 'tablet', 'accessory']
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
    /** File ảnh gốc người dùng chọn — được tải lên MinIO rồi gửi uploadIds cho backend. */
    imageFiles?: File[];
  }): Promise<{ success: boolean; message: string; review?: ProductReview }> {
    const { imageFiles = [], ...rest } = review;
    if (review.orderItemId) {
      let uploadIds: string[] = [];
      if (imageFiles.length > 0) {
        try {
          uploadIds = await reviewService.uploadReviewImages(imageFiles);
        } catch (err: any) {
          console.warn('[productService.submitReview] Upload ảnh đánh giá thất bại', err);
          return {
            success: false,
            message:
              err?.response?.data?.message ||
              err?.message ||
              'Không tải được ảnh đánh giá lên. Vui lòng thử lại.',
          };
        }
      }
      const res = await reviewService.createReview({
        orderItemId: review.orderItemId,
        rating: review.rating,
        comment: review.comment,
        ...(uploadIds.length > 0 ? { uploadIds } : {}),
      });
      return res;
    }
    return sharedStore.submitReview(rest);
  },

  // Lấy danh sách sản phẩm so sánh
  async getCompareProducts(ids: number[]): Promise<Product[]> {
    const prods = sharedStore.getProducts();
    return prods.filter(p => ids.includes(p.productId));
  },

  // =========================================================================
  // Storage APIs cho Sản phẩm (MinIO Presigned URL)
  // =========================================================================
  async createPresignedUrls(payload: {
    storageType: 'PRODUCTS';
    productId?: number;
    files: Array<{ fileName: string; contentType: string; fileSize: number }>;
  }): Promise<{ success: boolean; data: any[]; message?: string }> {
    const res = await apiClient.post<any>('/storage/presigned-urls', payload);
    return res.data;
  },

  async uploadBinaryToMinio(uploadUrl: string, file: File | Blob): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    if (!response.ok) {
      throw new Error(`Tải lên MinIO thất bại (HTTP ${response.status})`);
    }
  },

  async confirmUpload(payload: {
    uploadId: string;
    objectKey: string;
    isPrimary?: boolean;
    sortOrder?: number;
  }): Promise<{ success: boolean; data: any; message?: string }> {
    const res = await apiClient.post<any>('/storage/confirm', payload);
    return res.data;
  },
};
