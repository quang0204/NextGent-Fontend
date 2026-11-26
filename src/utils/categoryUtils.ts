import React from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Watch,
  LayoutGrid,
} from 'lucide-react';
import type { CategoryItem } from '../services/categoryService';
import type { Product } from '../types/product';

export type LegacyCategoryKey = 'phone' | 'laptop' | 'tablet' | 'accessory';

/**
 * Fallback danh sách danh mục gốc khi API chưa phản hồi hoặc offline,
 * khớp với ID seed trong Database (1–4 và 15: Đồng hồ thông minh).
 */
export const DEFAULT_ROOT_CATEGORIES: CategoryItem[] = [
  {
    categoryId: 1,
    parentId: null,
    name: 'Điện thoại di động',
    slug: 'dien-thoai-di-dong',
    description: 'Các dòng smartphone chính hãng bảo hành điện tử',
    isVisible: true,
    productCount: 0,
    children: [
      { categoryId: 5, parentId: 1, name: 'iPhone (Apple)', slug: 'iphone-apple', description: '', isVisible: true, productCount: 0 },
      { categoryId: 6, parentId: 1, name: 'Samsung Galaxy', slug: 'samsung-galaxy', description: '', isVisible: true, productCount: 0 },
      { categoryId: 7, parentId: 1, name: 'Xiaomi', slug: 'xiaomi', description: '', isVisible: true, productCount: 0 },
    ],
  },
  {
    categoryId: 2,
    parentId: null,
    name: 'Máy tính bảng',
    slug: 'may-tinh-bang',
    description: 'Tablet học tập, làm việc sáng tạo chuyên nghiệp',
    isVisible: true,
    productCount: 0,
    children: [
      { categoryId: 8, parentId: 2, name: 'iPad', slug: 'ipad', description: '', isVisible: true, productCount: 0 },
      { categoryId: 9, parentId: 2, name: 'Samsung Tab', slug: 'samsung-tab', description: '', isVisible: true, productCount: 0 },
    ],
  },
  {
    categoryId: 3,
    parentId: null,
    name: 'Laptop & PC',
    slug: 'laptop-pc',
    description: 'Laptop văn phòng mỏng nhẹ, laptop gaming đồ họa cao',
    isVisible: true,
    productCount: 0,
    children: [
      { categoryId: 10, parentId: 3, name: 'MacBook', slug: 'macbook', description: '', isVisible: true, productCount: 0 },
      { categoryId: 11, parentId: 3, name: 'Laptop Gaming Asus ROG', slug: 'laptop-gaming-asus-rog', description: '', isVisible: true, productCount: 0 },
    ],
  },
  {
    categoryId: 4,
    parentId: null,
    name: 'Phụ kiện & Âm thanh',
    slug: 'phu-kien-am-thanh',
    description: 'Tai nghe, loa bluetooth, củ cáp sạc nhanh',
    isVisible: true,
    productCount: 0,
    children: [
      { categoryId: 12, parentId: 4, name: 'Tai nghe Chống ồn', slug: 'tai-nghe-chong-on', description: '', isVisible: true, productCount: 0 },
      { categoryId: 13, parentId: 4, name: 'Loa Bluetooth Di động', slug: 'loa-bluetooth-di-dong', description: '', isVisible: true, productCount: 0 },
      { categoryId: 14, parentId: 4, name: 'Củ sạc & Cáp GaN', slug: 'cu-sac-cap-gan', description: '', isVisible: true, productCount: 0 },
    ],
  },
  {
    categoryId: 15,
    parentId: null,
    name: 'Đồng hồ thông minh',
    slug: 'dong-ho-thong-minh',
    description: 'Smartwatch theo dõi sức khỏe, thể thao chuyên nghiệp và nhận thông báo',
    isVisible: true,
    productCount: 0,
    children: [
      { categoryId: 16, parentId: 15, name: 'Đồng hồ thể thao Garmin', slug: 'dong-ho-the-thao-garmin', description: '', isVisible: true, productCount: 0 },
    ],
  },
];

/** Ánh xạ 4 ngành hàng legacy (1–4) để giữ tương thích URL & bộ lọc thông số riêng */
export function resolveLegacyCategoryKey(
  cat: Pick<Partial<CategoryItem>, 'categoryId' | 'slug' | 'name'>
): LegacyCategoryKey | null {
  const id = Number(cat.categoryId || 0);
  const slug = (cat.slug || '').toLowerCase();
  const name = (cat.name || '').toLowerCase();

  if (id === 1 || slug === 'dien-thoai-di-dong' || name.includes('điện thoại') || name.includes('smartphone')) {
    return 'phone';
  }
  if (id === 2 || slug === 'may-tinh-bang' || name.includes('máy tính bảng') || name.includes('tablet')) {
    return 'tablet';
  }
  if (id === 3 || slug === 'laptop-pc' || name.includes('laptop')) {
    return 'laptop';
  }
  if (id === 4 || slug === 'phu-kien-am-thanh' || name.includes('phụ kiện') || name.includes('âm thanh')) {
    return 'accessory';
  }
  return null;
}

/** Tạo URL trang sản phẩm chuẩn cho từng danh mục gốc (tương thích 1–4 & danh mục động khác) */
export function getRootCategoryPath(
  cat: Pick<CategoryItem, 'categoryId' | 'slug' | 'name'>
): string {
  const key = resolveLegacyCategoryKey(cat);
  return key ? `/products?category=${key}` : `/products?categoryId=${cat.categoryId}`;
}

/** Lấy toàn bộ ID thuộc cây danh mục (cha + tất cả con cháu) để khớp sản phẩm */
export function collectCategoryTreeIds(cat: CategoryItem): Set<number> {
  const ids = new Set<number>([Number(cat.categoryId)]);
  const visit = (nodes?: CategoryItem[]) => {
    if (!nodes) return;
    for (const child of nodes) {
      ids.add(Number(child.categoryId));
      visit(child.children);
    }
  };
  visit(cat.children);
  return ids;
}

/** Trả về icon phù hợp theo loại danh mục gốc */
export function getCategoryIcon(
  cat: Pick<Partial<CategoryItem>, 'categoryId' | 'slug' | 'name'>
): React.ElementType {
  const legacyKey = resolveLegacyCategoryKey(cat);
  if (legacyKey === 'phone') return Smartphone;
  if (legacyKey === 'laptop') return Laptop;
  if (legacyKey === 'tablet') return Tablet;
  if (legacyKey === 'accessory') return Headphones;

  const slug = (cat.slug || '').toLowerCase();
  const name = (cat.name || '').toLowerCase();
  if (Number(cat.categoryId) === 15 || slug.includes('dong-ho') || name.includes('đồng hồ') || name.includes('watch')) {
    return Watch;
  }
  return LayoutGrid;
}

/** Màu nhấn dùng trên Mobile drawer theo từng nhóm danh mục */
export function getCategoryAccentClass(
  cat: Pick<Partial<CategoryItem>, 'categoryId' | 'slug' | 'name'>
): string {
  const legacyKey = resolveLegacyCategoryKey(cat);
  if (legacyKey === 'phone') return 'text-blue-500';
  if (legacyKey === 'laptop') return 'text-indigo-500';
  if (legacyKey === 'tablet') return 'text-emerald-500';
  if (legacyKey === 'accessory') return 'text-amber-500';

  const slug = (cat.slug || '').toLowerCase();
  const name = (cat.name || '').toLowerCase();
  if (Number(cat.categoryId) === 15 || slug.includes('dong-ho') || name.includes('đồng hồ') || name.includes('watch')) {
    return 'text-teal-500';
  }
  return 'text-primary';
}

/** Kiểm tra sản phẩm có thuộc nhánh danh mục gốc (trực tiếp hoặc qua danh mục con) */
export function productMatchesCategoryBranch(
  p: Pick<Product, 'categoryId' | 'parentCategoryId' | 'rootCategoryId'>,
  rootCategoryId: number,
  branchIds?: Set<number>
): boolean {
  const cid = Number(p.categoryId || 0);
  if (branchIds ? branchIds.has(cid) : cid === rootCategoryId) return true;
  return (
    Number(p.rootCategoryId || 0) === rootCategoryId ||
    Number(p.parentCategoryId || 0) === rootCategoryId
  );
}

/** Xếp hạng sản phẩm nổi bật & bán chạy theo BEST_SELLER, Flash Sale, lượt bán và đánh giá */
export function rankHotProducts<T extends Pick<Product, 'productId' | 'isFlashSale' | 'soldCount' | 'rating' | 'reviewCount'>>(
  list: T[],
  bestSellerIds?: Set<number>
): T[] {
  const getHotScore = (p: T) => {
    let score = 0;
    if (bestSellerIds?.has(p.productId)) score += 10000;
    if (p.isFlashSale) score += 5000;
    score += (p.soldCount || 0) * 10;
    score += (p.rating || 0) * 20;
    score += p.reviewCount || 0;
    return score;
  };
  return [...list].sort((a, b) => getHotScore(b) - getHotScore(a));
}
