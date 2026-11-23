import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { productService, ProductFilterParams, parseSmartSearchQuery } from '../services/productService';
import { categoryService, CategoryItem } from '../services/categoryService';
import { Product, Brand } from '../types/product';
import { resolveBrandLogo } from '../utils/brandUtils';
import { ProductCard } from '../components/product/ProductCard';
import { ProductCardSkeleton } from '../components/product/ProductCardSkeleton';
import { 
  Filter, 
  SlidersHorizontal, 
  X, 
  ArrowUpDown, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Sparkles,
  Zap,
  BatteryCharging,
  Cpu,
  Wifi,
  Tag,
  Layers,
  LayoutGrid,
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Flame
} from 'lucide-react';

const getPriceRangesForCategory = (cat: string) => {
  if (cat === 'laptop') {
    return [
      { label: 'Tất cả mức giá', min: undefined, max: undefined },
      { label: 'Dưới 15 triệu', min: 0, max: 15000000 },
      { label: 'Từ 15 - 25 triệu', min: 15000000, max: 25000000 },
      { label: 'Từ 25 - 35 triệu', min: 25000000, max: 35000000 },
      { label: 'Trên 35 triệu', min: 35000000, max: 100000000 },
    ];
  }
  if (cat === 'accessory') {
    return [
      { label: 'Tất cả mức giá', min: undefined, max: undefined },
      { label: 'Dưới 300.000₫', min: 0, max: 300000 },
      { label: 'Từ 300k - 1 triệu', min: 300000, max: 1000000 },
      { label: 'Từ 1 - 3 triệu', min: 1000000, max: 3000000 },
      { label: 'Trên 3 triệu', min: 3000000, max: 50000000 },
    ];
  }
  if (cat === 'tablet') {
    return [
      { label: 'Tất cả mức giá', min: undefined, max: undefined },
      { label: 'Dưới 8 triệu', min: 0, max: 8000000 },
      { label: 'Từ 8 - 15 triệu', min: 8000000, max: 15000000 },
      { label: 'Từ 15 - 25 triệu', min: 15000000, max: 25000000 },
      { label: 'Trên 25 triệu', min: 25000000, max: 100000000 },
    ];
  }
  return [
    { label: 'Tất cả mức giá', min: undefined, max: undefined },
    { label: 'Dưới 5 triệu', min: 0, max: 5000000 },
    { label: 'Từ 5 - 10 triệu', min: 5000000, max: 10000000 },
    { label: 'Từ 10 - 15 triệu', min: 10000000, max: 15000000 },
    { label: 'Từ 15 - 20 triệu', min: 15000000, max: 20000000 },
    { label: 'Trên 20 triệu', min: 20000000, max: 100000000 },
  ];
};

const ITEMS_PER_PAGE = 9;

// Chuẩn kết nối cố định cho Phụ kiện di động
const ACCESSORY_CONNECTION_TYPES = [
  'USB-C',
  'Lightning',
  'USB-A',
  'Bluetooth 5.3',
  '3.5mm',
  'MagSafe',
  'Wireless 2.4G'
];

export const ProductListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<CategoryItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const productsGridRef = useRef<HTMLDivElement>(null);

  // Tải cây danh mục và thương hiệu từ DB một lần khi mount
  useEffect(() => {
    categoryService.getCategories(false)
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setCategoriesTree(res.data);
        }
      })
      .catch(() => {});

    productService.getBrands()
      .then((res) => {
        if (Array.isArray(res)) {
          setBrands(res);
        }
      })
      .catch(() => {});
  }, []);

  // Lấy các params từ URL
  const rawCategory = searchParams.get('category');
  const isSale = searchParams.get('sale') === 'true';
  const currentSearch = (searchParams.get('q') || '').trim();
  const isSearchMode = Boolean(currentSearch);
  const parsedSearch = parseSmartSearchQuery(currentSearch);
  const currentCategoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined;

  const currentCategory = useMemo(() => {
    if (rawCategory) return rawCategory;
    if (!currentCategoryId) return 'all';
    if (currentCategoryId === 1) return 'phone';
    if (currentCategoryId === 2) return 'tablet';
    if (currentCategoryId === 3) return 'laptop';
    if (currentCategoryId === 4) return 'accessory';
    for (const root of categoriesTree) {
      if (root.categoryId === currentCategoryId || root.children?.some(ch => ch.categoryId === currentCategoryId)) {
        if (root.categoryId === 1 || root.name.toLowerCase().includes('điện thoại')) return 'phone';
        if (root.categoryId === 2 || root.name.toLowerCase().includes('máy tính bảng') || root.name.toLowerCase().includes('tablet')) return 'tablet';
        if (root.categoryId === 3 || root.name.toLowerCase().includes('laptop')) return 'laptop';
        if (root.categoryId === 4 || root.name.toLowerCase().includes('phụ kiện')) return 'accessory';
      }
    }
    return 'all';
  }, [rawCategory, currentCategoryId, categoriesTree]);

  // Danh mục con thuộc ngành hàng hiện tại (hoặc tất cả ngành hàng khi currentCategory === 'all')
  const subcategories = useMemo(() => {
    if (isSale) return [];
    if (currentCategory === 'all') {
      return categoriesTree.map(cat => ({
        categoryId: cat.categoryId,
        parentId: null,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        isVisible: cat.isVisible,
        productCount: cat.productCount,
        children: cat.children
      }));
    }
    const rootMatches: Record<string, (c: CategoryItem) => boolean> = {
      phone: (c) => c.categoryId === 1 || c.slug === 'dien-thoai-di-dong' || c.name.toLowerCase().includes('điện thoại'),
      tablet: (c) => c.categoryId === 2 || c.slug === 'may-tinh-bang' || c.name.toLowerCase().includes('máy tính bảng') || c.name.toLowerCase().includes('tablet'),
      laptop: (c) => c.categoryId === 3 || c.slug === 'laptop-pc' || c.name.toLowerCase().includes('laptop'),
      accessory: (c) => c.categoryId === 4 || c.slug === 'phu-kien-am-thanh' || c.name.toLowerCase().includes('phụ kiện'),
    };
    const matcher = rootMatches[currentCategory];
    if (!matcher) return [];
    const root = categoriesTree.find(matcher);
    return root?.children || [];
  }, [categoriesTree, currentCategory, isSale]);

  const selectedCategoryName = useMemo(() => {
    if (!currentCategoryId) return undefined;
    for (const root of categoriesTree) {
      if (root.categoryId === currentCategoryId) return root.name;
      const child = root.children?.find(ch => ch.categoryId === currentCategoryId);
      if (child) return child.name;
    }
    return undefined;
  }, [categoriesTree, currentCategoryId]);

  // Lọc thương hiệu theo danh mục đang chọn (qua categoryIds của bảng category_brands)
  const categorySpecificBrands = useMemo(() => {
    let targetCatId: number | undefined;
    if (currentCategory === 'phone') targetCatId = 1;
    else if (currentCategory === 'tablet') targetCatId = 2;
    else if (currentCategory === 'laptop') targetCatId = 3;
    else if (currentCategory === 'accessory') targetCatId = 4;
    else if (currentCategoryId) {
      for (const root of categoriesTree) {
        if (root.categoryId === currentCategoryId || root.children?.some(ch => ch.categoryId === currentCategoryId)) {
          targetCatId = root.categoryId;
          break;
        }
      }
    }

    if (!targetCatId) return brands;
    const filtered = brands.filter(b => b.categoryIds && b.categoryIds.includes(targetCatId!));
    return filtered.length > 0 ? filtered : brands;
  }, [brands, currentCategory, currentCategoryId, categoriesTree]);

  // Hỗ trợ chọn đồng thời nhiều hãng sản xuất
  const rawBrand = searchParams.get('brand');
  const selectedBrands: string[] = rawBrand && rawBrand !== 'all' ? rawBrand.split(',').map(s => s.trim()).filter(Boolean) : [];
  const isAllBrands = selectedBrands.length === 0;

  const explicitSort = searchParams.get('sort') as ProductFilterParams['sort'] | null;
  const currentSort: NonNullable<ProductFilterParams['sort']> =
    explicitSort || (isSearchMode && parsedSearch.suggestedSort ? parsedSearch.suggestedSort : 'newest');
  const currentMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const currentMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const currentRom = searchParams.get('rom') ? Number(searchParams.get('rom')) : undefined;
  const currentRam = searchParams.get('ram') ? Number(searchParams.get('ram')) : undefined;
  const currentCpu = searchParams.get('cpu') || undefined;
  const currentRequirement = searchParams.get('req') || undefined;
  const currentConnectionType = searchParams.get('conn') || undefined;
  const currentMinDiscount = searchParams.get('minDiscount') ? Number(searchParams.get('minDiscount')) : undefined;
  const currentInstallment = searchParams.get('installment') === 'true';

  const rawPage = searchParams.get('page');
  const currentPage = rawPage ? Math.max(1, parseInt(rawPage, 10) || 1) : 1;

  // Danh sách khoảng giá động theo từng ngành hàng
  const priceRanges = getPriceRangesForCategory(isSale ? 'sale' : currentCategory);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      if (products.length > 0) {
        setIsFiltering(true);
      } else {
        setIsInitialLoading(true);
      }

      if (isSearchMode) {
        // Khi tìm kiếm: không áp dụng bộ lọc sản phẩm thủ công, chỉ dùng Smart Search + sắp xếp
        const prodList = await productService.getProducts({
          search: currentSearch,
          sort: currentSort,
          limit: 100
        });
        if (!cancelled) {
          setProducts(prodList);
          setIsInitialLoading(false);
          setIsFiltering(false);
        }
        return;
      }

      let currentBrandList = brands;
      if (currentBrandList.length === 0) {
        currentBrandList = await productService.getBrands().catch(() => []);
        if (!cancelled && currentBrandList.length > 0) {
          setBrands(currentBrandList);
        }
      }

      // Chỉ lọc theo các brand hợp lệ
      const validSelectedBrands = selectedBrands.filter(b =>
        currentBrandList.some(item => item.name.toLowerCase() === b.toLowerCase())
      );

      const prodList = await productService.getProducts({
        category: isSale ? undefined : (currentCategory === 'all' ? undefined : currentCategory),
        categoryId: currentCategoryId,
        isFlashSale: isSale ? true : undefined,
        brands: validSelectedBrands.length > 0 ? validSelectedBrands : undefined,
        sort: currentSort,
        minPrice: currentMinPrice,
        maxPrice: currentMaxPrice,
        rom: currentRom,
        ram: currentRam,
        cpu: currentCpu,
        requirement: currentRequirement,
        connectionType: currentConnectionType,
        minDiscount: currentMinDiscount,
        isInstallment0: currentInstallment ? true : undefined,
        limit: 100
      });

      if (!cancelled) {
        setProducts(prodList);
        setIsInitialLoading(false);
        setIsFiltering(false);
      }
    };
    fetch();

    return () => {
      cancelled = true;
    };
  }, [
    isSearchMode,
    isSale,
    currentCategory,
    currentCategoryId,
    currentMinPrice,
    currentMaxPrice,
    currentRom,
    currentRam,
    currentCpu,
    currentRequirement,
    currentConnectionType,
    currentMinDiscount,
    currentInstallment,
    currentSort,
    currentSearch,
    rawBrand
  ]);

  const updateParam = (key: string, value: string | undefined) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === undefined || value === 'all' || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    // Khi đổi tiêu chí lọc, reset về trang 1
    if (key !== 'page') {
      newParams.delete('page');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleToggleBrand = (brandName: string) => {
    if (brandName === 'all') {
      updateParam('brand', undefined);
      return;
    }

    let nextBrands: string[];
    const exists = selectedBrands.some(b => b.toLowerCase() === brandName.toLowerCase());
    if (exists) {
      nextBrands = selectedBrands.filter(b => b.toLowerCase() !== brandName.toLowerCase());
    } else {
      nextBrands = [...selectedBrands, brandName];
    }

    if (nextBrands.length === 0) {
      updateParam('brand', undefined);
    } else {
      updateParam('brand', nextBrands.join(','));
    }
  };

  const setPriceRange = (min?: number, max?: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (min === undefined) newParams.delete('minPrice');
    else newParams.set('minPrice', String(min));

    if (max === undefined) newParams.delete('maxPrice');
    else newParams.set('maxPrice', String(max));

    newParams.delete('page');
    setSearchParams(newParams, { replace: true });
  };

  const handleClearPrice = () => {
    setPriceRange(undefined, undefined);
  };

  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    if (rawCategory) newParams.set('category', rawCategory);
    if (isSale) newParams.set('sale', 'true');
    setSearchParams(newParams, { replace: true });
  };

  const hasActiveFilters = 
    !isSearchMode && (
      currentCategoryId !== undefined ||
      selectedBrands.length > 0 || 
      currentMinPrice !== undefined || 
      currentMaxPrice !== undefined || 
      currentRom !== undefined || 
      currentRam !== undefined || 
      currentCpu !== undefined ||
      currentRequirement !== undefined ||
      currentConnectionType !== undefined ||
      currentMinDiscount !== undefined ||
      currentInstallment
    );

  // Pagination Logic (12 SP/trang khi tìm kiếm 4 cột, 9 SP/trang khi có sidebar lọc 3 cột)
  const itemsPerPage = isSearchMode ? 12 : ITEMS_PER_PAGE;
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProducts = products.slice(startIndex, endIndex);

  const goToPage = (pageNumber: number) => {
    const target = Math.min(Math.max(1, pageNumber), totalPages);
    const newParams = new URLSearchParams(searchParams);
    if (target === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', String(target));
    }
    setSearchParams(newParams, { replace: true });
    if (productsGridRef.current) {
      const rect = productsGridRef.current.getBoundingClientRect();
      if (rect.top < 0) {
        productsGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const categoryTitle = 
    isSearchMode ? `Kết quả tìm kiếm: "${currentSearch}"` :
    isSale ? 'Sản phẩm Khuyến mãi Flash Sale ⚡' :
    currentCategory === 'phone' ? 'Điện thoại thông minh (Smartphone)' :
    currentCategory === 'laptop' ? 'Laptop, Máy tính xách tay' :
    currentCategory === 'tablet' ? 'Máy tính bảng (Tablet)' :
    currentCategory === 'accessory' ? 'Phụ kiện di động chính hãng' : 'Tất cả sản phẩm công nghệ';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
      
      {/* 1. Breadcrumb */}
      <nav className="text-xs text-steel flex items-center gap-2">
        <Link to="/" className="hover:text-ink-deep transition-colors">Trang chủ</Link>
        <ChevronRight size={12} className="text-stone" />
        <span className="text-ink-deep font-bold">{categoryTitle}</span>
      </nav>

      {/* 2. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline-soft">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-medium text-ink-deep tracking-tight">
              {categoryTitle}
            </h1>
            {isSale && !isSearchMode && (
              <span className="text-xs bg-critical text-canvas font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Giảm đến 50%
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-steel">
            Tìm thấy <strong>{products.length}</strong> thiết bị phân phối chính hãng 100%, bảo hành 12 tháng, giao nhanh toàn quốc
          </p>
          {isSearchMode && parsedSearch.intentTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                <Sparkles size={12} />
                <span>Đã hiểu ý định:</span>
              </span>
              {parsedSearch.intentTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Khi đang tìm kiếm: hiện nút Xóa tìm kiếm; khi xem danh mục thường: hiện nút Bộ lọc Mobile */}
        {isSearchMode ? (
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-1.5 bg-surface-soft hover:bg-hairline-soft text-xs font-bold text-ink px-4 py-2 rounded-full self-start sm:self-center border border-hairline-soft transition-colors"
          >
            <X size={14} className="text-critical" />
            <span>Xóa tìm kiếm</span>
          </button>
        ) : (
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 bg-canvas border border-hairline-soft text-xs font-bold text-ink px-4 py-2 rounded-full self-start hover:border-slate transition-colors"
          >
            <Filter size={14} className="text-primary" />
            <span>Bộ lọc ({hasActiveFilters ? 'Đang lọc' : 'Mặc định'})</span>
          </button>
        )}
      </div>

      {/* 3. Category Navigation Pill Tabs: Chuyển đổi nhanh và toàn diện các ngành hàng kinh doanh */}
      {!isSearchMode && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1 -mt-2">
          {[
            { id: 'all', label: 'Tất cả sản phẩm', icon: LayoutGrid, path: '/products' },
            { id: 'phone', label: 'Điện thoại', icon: Smartphone, path: '/products?category=phone' },
            { id: 'laptop', label: 'Laptop', icon: Laptop, path: '/products?category=laptop' },
            { id: 'tablet', label: 'Máy tính bảng', icon: Tablet, path: '/products?category=tablet' },
            { id: 'accessory', label: 'Phụ kiện di động', icon: Headphones, path: '/products?category=accessory' },
            { id: 'sale', label: 'Flash Sale ⚡', icon: Flame, path: '/products?sale=true' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = tab.id === 'sale' ? isSale : (!isSale && currentCategory === tab.id);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border flex-shrink-0 cursor-pointer ${
                  isTabActive
                    ? 'bg-ink-deep text-canvas border-ink-deep shadow-xs'
                    : 'bg-canvas text-ink border-hairline-soft hover:border-slate hover:bg-surface-soft'
                }`}
              >
                <Icon
                  size={14}
                  className={
                    isTabActive
                      ? tab.id === 'sale'
                        ? 'text-warning fill-warning'
                        : 'text-canvas'
                      : tab.id === 'sale'
                      ? 'text-critical'
                      : 'text-primary'
                  }
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Active Filter Chips (Chỉ hiển thị khi KHÔNG ở chế độ tìm kiếm) */}
      {!isSearchMode && hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs bg-surface-soft/60 border border-hairline-soft p-3 rounded-2xl">
          <span className="font-bold text-steel uppercase text-[11px] tracking-wider mr-1">Đang chọn:</span>
          
          {currentCategoryId && (
            <span className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>Danh mục: {selectedCategoryName || currentCategoryId}</span>
              <button type="button" onClick={() => updateParam('categoryId', undefined)} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          )}

          {selectedBrands.map(b => {
            const brandObj = brands.find(br => br.name.toLowerCase() === b.toLowerCase());
            const logoSrc = resolveBrandLogo(brandObj?.logoUrl, b);
            return (
              <span key={b} className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
                {logoSrc && (
                  <span className="w-4 h-4 rounded brand-logo-plate border border-hairline-soft/80 flex items-center justify-center p-0.5 shrink-0">
                    <img
                      src={logoSrc}
                      alt={b}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                      }}
                    />
                  </span>
                )}
                <span>Hãng: {b}</span>
                <button type="button" onClick={() => handleToggleBrand(b)} className="text-steel hover:text-critical">
                  <X size={13} />
                </button>
              </span>
            );
          })}

          {(currentMinPrice !== undefined || currentMaxPrice !== undefined) && (
            <span className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>
                Giá: {currentMinPrice ? `${(currentMinPrice / 1000000).toFixed(0)}tr` : '0đ'} - {currentMaxPrice ? `${(currentMaxPrice / 1000000).toFixed(0)}tr` : 'Max'}
              </span>
              <button type="button" onClick={handleClearPrice} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          )}

          {currentRom && (
            <span className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>Bộ nhớ: {currentRom >= 1024 ? '1 TB' : `${currentRom} GB`}</span>
              <button type="button" onClick={() => updateParam('rom', undefined)} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          )}

          {currentRam && (
            <span className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>RAM: {currentRam} GB</span>
              <button type="button" onClick={() => updateParam('ram', undefined)} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          )}

          {currentCpu && (
            <span className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>CPU: {currentCpu.toUpperCase()}</span>
              <button type="button" onClick={() => updateParam('cpu', undefined)} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          )}

          {currentRequirement && (
            <span className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>Nhu cầu: {currentRequirement}</span>
              <button type="button" onClick={() => updateParam('req', undefined)} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          )}

          {currentConnectionType && (
            <span className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>Kết nối: {currentConnectionType}</span>
              <button type="button" onClick={() => updateParam('conn', undefined)} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          )}

          {currentMinDiscount && (
            <span className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>Giảm &ge; {currentMinDiscount}%</span>
              <button type="button" onClick={() => updateParam('minDiscount', undefined)} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          )}

          {currentInstallment && (
            <span className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>Trả góp 0%</span>
              <button type="button" onClick={() => updateParam('installment', undefined)} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto text-xs font-bold text-critical hover:underline"
          >
            Xóa tất cả bộ lọc
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================= */}
        {/* DESKTOP SIDEBAR FILTERS (3 cols)          */}
        {/* Ẩn hoàn toàn khi đang ở chế độ tìm kiếm   */}
        {/* ========================================= */}
        {!isSearchMode && (
        <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-20">
          <div className="bg-canvas border border-hairline-soft rounded-2xl p-5 space-y-5 shadow-none max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar">
            
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <span className="font-bold text-xs text-ink-deep uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-primary" />
                <span>Bộ lọc đa tiêu chí</span>
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-critical hover:underline font-bold"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* 0. DANH MỤC SẢN PHẨM */}
            {subcategories.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={13} className="text-primary" />
                    <span>Danh mục sản phẩm</span>
                  </h4>
                  {currentCategoryId && (
                    <button
                      type="button"
                      onClick={() => updateParam('categoryId', undefined)}
                      className="text-[11px] text-critical hover:underline font-bold"
                    >
                      Tất cả
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateParam('categoryId', undefined)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      !currentCategoryId
                        ? 'border-ink-deep bg-ink-deep text-canvas shadow-xs'
                        : 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                    }`}
                  >
                    Tất cả
                  </button>
                  {subcategories.map((sub) => {
                    const isSelected = currentCategoryId === sub.categoryId;
                    return (
                      <button
                        key={sub.categoryId}
                        type="button"
                        onClick={() => updateParam('categoryId', isSelected ? undefined : String(sub.categoryId))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                          isSelected
                            ? 'border-ink-deep bg-ink-deep text-canvas shadow-xs'
                            : 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                        <span>{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 1. THƯƠNG HIỆU */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Hãng sản xuất</h4>
                {selectedBrands.length > 0 && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedBrands.length} đã chọn
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleBrand('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    isAllBrands
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs'
                      : 'border-hairline-soft bg-canvas text-ink hover:border-charcoal hover:bg-surface-soft/50'
                  }`}
                >
                  {isAllBrands && <Check size={12} className="stroke-[3] text-primary" />}
                  <span>Tất cả</span>
                </button>
                {categorySpecificBrands.map((b) => {
                  const isSelected = selectedBrands.some(sb => sb.toLowerCase() === b.name.toLowerCase());
                  const logoSrc = resolveBrandLogo(b.logoUrl, b.name);
                  return (
                    <button
                      key={b.brandId}
                      type="button"
                      onClick={() => handleToggleBrand(b.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs'
                          : 'border-hairline-soft bg-canvas text-ink hover:border-charcoal hover:bg-surface-soft/50'
                      }`}
                    >
                      {isSelected && <Check size={12} className="stroke-[3] text-primary shrink-0" />}
                      {logoSrc && (
                        <span className="w-6 h-6 rounded-md brand-logo-plate border border-hairline-soft/80 flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                          <img
                            src={logoSrc}
                            alt={b.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                          />
                        </span>
                      )}
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. KHOẢNG GIÁ */}
            <div className="pt-4 border-t border-hairline-soft space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Mức giá bán</h4>
                {(currentMinPrice !== undefined || currentMaxPrice !== undefined) && (
                  <button
                    type="button"
                    onClick={handleClearPrice}
                    className="text-[11px] text-critical hover:underline font-bold"
                  >
                    Bỏ lọc giá
                  </button>
                )}
              </div>
              <div className="space-y-1 text-xs">
                {priceRanges.map((r, i) => {
                  const isChecked = currentMinPrice === r.min && currentMaxPrice === r.max;
                  return (
                    <label
                      key={i}
                      className="flex items-center gap-2 cursor-pointer text-charcoal hover:text-ink select-none py-1 px-1.5 rounded-lg hover:bg-surface-soft"
                    >
                      <input
                        type="radio"
                        name="desktopPrice"
                        checked={isChecked}
                        onChange={() => setPriceRange(r.min, r.max)}
                        className="w-4 h-4 text-primary accent-primary cursor-pointer"
                      />
                      <span className={`text-xs ${isChecked ? 'font-bold text-primary' : 'text-charcoal'}`}>{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ========================================================= */}
            {/* 3A. BỘ LỌC ĐIỆN THOẠI (Smartphone)                        */}
            {/* ========================================================= */}
            {(currentCategory === 'phone' || (currentCategory === 'all' && !isSale)) && (
              <div className="pt-4 border-t border-hairline-soft space-y-4">
                {/* ROM */}
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Dung lượng bộ nhớ (ROM)</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[128, 256, 512, 1024].map((rom) => {
                      const isSelected = currentRom === rom;
                      return (
                        <button
                          key={rom}
                          type="button"
                          onClick={() => updateParam('rom', isSelected ? undefined : String(rom))}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border text-center ${
                            isSelected ? 'border-primary bg-primary text-canvas' : 'border-hairline-soft bg-canvas text-charcoal hover:border-primary'
                          }`}
                        >
                          {rom >= 1024 ? '1 TB' : `${rom} GB`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Dung lượng RAM</h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[4, 6, 8, 12, 16].map((ram) => {
                      const isSelected = currentRam === ram;
                      return (
                        <button
                          key={ram}
                          type="button"
                          onClick={() => updateParam('ram', isSelected ? undefined : String(ram))}
                          className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all border text-center ${
                            isSelected ? 'border-primary bg-primary text-canvas' : 'border-hairline-soft bg-canvas text-charcoal hover:border-primary'
                          }`}
                        >
                          {ram} GB
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nhu cầu */}
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Chọn theo nhu cầu</h4>
                  <div className="space-y-1.5">
                    {[
                      { key: 'gaming', label: '🎮 Chơi game / Cấu hình mạnh' },
                      { key: 'camera', label: '📸 Chụp ảnh đẹp / Zoom quang' },
                      { key: 'battery', label: '🔋 Pin trâu trên 5000 mAh' },
                      { key: 'foldable', label: '📱 Màn hình gập thế hệ mới' },
                    ].map((item) => {
                      const isSelected = currentRequirement === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => updateParam('req', isSelected ? undefined : item.key)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                            isSelected ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-hairline-soft bg-canvas hover:bg-surface-soft text-charcoal'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trả góp 0% */}
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-charcoal select-none">
                    <input
                      type="checkbox"
                      checked={currentInstallment}
                      onChange={(e) => updateParam('installment', e.target.checked ? 'true' : undefined)}
                      className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                    />
                    <span>Hỗ trợ trả góp 0% lãi suất</span>
                  </label>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 3B. BỘ LỌC LAPTOP                                         */}
            {/* ========================================================= */}
            {currentCategory === 'laptop' && (
              <div className="pt-4 border-t border-hairline-soft space-y-4">
                {/* CPU */}
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Vi xử lý (CPU)</h4>
                  <div className="space-y-1.5">
                    {[
                      { key: 'apple', label: 'Apple Silicon (M1, M2, M3)' },
                      { key: 'intel', label: 'Intel Core i5 / i7 / i9' },
                      { key: 'amd', label: 'AMD Ryzen 5 / 7' },
                    ].map((item) => {
                      const isSelected = currentCpu === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => updateParam('cpu', isSelected ? undefined : item.key)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                            isSelected ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-hairline-soft bg-canvas hover:bg-surface-soft text-charcoal'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Dung lượng RAM</h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[8, 16, 32].map((ram) => {
                      const isSelected = currentRam === ram;
                      return (
                        <button
                          key={ram}
                          type="button"
                          onClick={() => updateParam('ram', isSelected ? undefined : String(ram))}
                          className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all border text-center ${
                            isSelected ? 'border-primary bg-primary text-canvas' : 'border-hairline-soft bg-canvas text-charcoal hover:border-primary'
                          }`}
                        >
                          {ram} GB
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ổ cứng SSD */}
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Ổ cứng lưu trữ SSD</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[256, 512, 1024].map((rom) => {
                      const isSelected = currentRom === rom;
                      return (
                        <button
                          key={rom}
                          type="button"
                          onClick={() => updateParam('rom', isSelected ? undefined : String(rom))}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border text-center ${
                            isSelected ? 'border-primary bg-primary text-canvas' : 'border-hairline-soft bg-canvas text-charcoal hover:border-primary'
                          }`}
                        >
                          {rom >= 1024 ? '1 TB SSD' : `${rom} GB SSD`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nhu cầu Laptop */}
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Nhu cầu sử dụng</h4>
                  <div className="space-y-1.5">
                    {[
                      { key: 'office', label: '💼 Văn phòng mỏng nhẹ' },
                      { key: 'gaming', label: '⚡ Laptop Gaming hiệu năng cao' },
                      { key: 'graphic', label: '🎨 Thiết kế đồ họa & Kỹ thuật' },
                    ].map((item) => {
                      const isSelected = currentRequirement === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => updateParam('req', isSelected ? undefined : item.key)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                            isSelected ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-hairline-soft bg-canvas hover:bg-surface-soft text-charcoal'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 3C. BỘ LỌC MÁY TÍNH BẢNG (Tablet)                         */}
            {/* ========================================================= */}
            {currentCategory === 'tablet' && (
              <div className="pt-4 border-t border-hairline-soft space-y-4">
                {/* ROM */}
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Bộ nhớ lưu trữ</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[64, 128, 256, 512].map((rom) => {
                      const isSelected = currentRom === rom;
                      return (
                        <button
                          key={rom}
                          type="button"
                          onClick={() => updateParam('rom', isSelected ? undefined : String(rom))}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border text-center ${
                            isSelected ? 'border-primary bg-primary text-canvas' : 'border-hairline-soft bg-canvas text-charcoal hover:border-primary'
                          }`}
                        >
                          {rom} GB
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kết nối */}
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Kết nối mạng</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'wifi', label: 'Wifi Only' },
                      { key: '5g', label: 'Có 5G / Gắn SIM' },
                    ].map((item) => {
                      const isSelected = currentConnectionType === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => updateParam('conn', isSelected ? undefined : item.key)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border text-center ${
                            isSelected ? 'border-primary bg-primary text-canvas' : 'border-hairline-soft bg-canvas text-charcoal hover:border-primary'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 3D. BỘ LỌC PHỤ KIỆN DI ĐỘNG                               */}
            {/* ========================================================= */}
            {currentCategory === 'accessory' && (
              <div className="pt-4 border-t border-hairline-soft space-y-4">
                {/* Chuẩn kết nối */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Chuẩn sạc & Kết nối</h4>
                    {currentConnectionType && (
                      <button
                        type="button"
                        onClick={() => updateParam('conn', undefined)}
                        className="text-[11px] text-critical hover:underline font-bold"
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCESSORY_CONNECTION_TYPES.map((conn) => {
                      const isSelected = currentConnectionType?.toLowerCase() === conn.toLowerCase();
                      return (
                        <button
                          key={conn}
                          type="button"
                          onClick={() => updateParam('conn', isSelected ? undefined : conn)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs'
                              : 'border-hairline-soft bg-canvas text-ink hover:border-charcoal hover:bg-surface-soft/50'
                          }`}
                        >
                          {isSelected && <Check size={12} className="stroke-[3] text-primary" />}
                          <span>{conn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 3E. BỘ LỌC FLASH SALE                                     */}
            {/* ========================================================= */}
            {isSale && (
              <div className="pt-4 border-t border-hairline-soft space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-critical uppercase tracking-wider mb-2">Mức giảm giá Flash Sale</h4>
                  <div className="space-y-1.5">
                    {[
                      { min: 20, label: '🔥 Giảm từ 20% trở lên' },
                      { min: 30, label: '⚡ Giảm từ 30% trở lên' },
                      { min: 50, label: '💥 Giảm sốc trên 50%' },
                    ].map((item) => {
                      const isSelected = currentMinDiscount === item.min;
                      return (
                        <button
                          key={item.min}
                          type="button"
                          onClick={() => updateParam('minDiscount', isSelected ? undefined : String(item.min))}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                            isSelected ? 'border-critical bg-critical text-canvas font-bold' : 'border-hairline-soft bg-canvas hover:bg-rose-50 text-charcoal'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </aside>
        )}

        {/* ========================================= */}
        {/* MAIN PRODUCT GRID (12 cols khi tìm kiếm)  */}
        {/* ========================================= */}
        <div ref={productsGridRef} className={isSearchMode ? "lg:col-span-12 space-y-6" : "lg:col-span-9 space-y-6"}>
          
          {/* Thanh sắp xếp */}
          <div className="bg-canvas border border-hairline-soft rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-none">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-charcoal flex items-center gap-1.5">
                <ArrowUpDown size={14} className="text-steel" />
                <span>Sắp xếp:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'newest', label: 'Mới nhất' },
                  { key: 'best_seller', label: 'Bán chạy nhất' },
                  { key: 'price_asc', label: 'Giá thấp → cao' },
                  { key: 'price_desc', label: 'Giá cao → thấp' },
                  { key: 'discount_desc', label: 'Giảm giá nhiều nhất' },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => updateParam('sort', s.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      currentSort === s.key
                        ? 'bg-ink-deep text-canvas shadow-xs font-black'
                        : 'bg-surface-soft text-charcoal hover:bg-hairline-soft hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-steel font-medium text-[11px] ml-auto">
              Trang {safePage} / {totalPages}
            </span>
          </div>

          {/* Grid Products */}
          {isInitialLoading ? (
            <div className={`grid grid-cols-2 sm:grid-cols-2 ${isSearchMode ? 'md:grid-cols-3 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4 sm:gap-5 items-stretch`}>
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 bg-canvas rounded-2xl border border-hairline-soft text-center text-steel text-xs p-8">
              <div className="w-12 h-12 rounded-full bg-surface-soft text-steel flex items-center justify-center mx-auto mb-3">
                <SlidersHorizontal size={22} />
              </div>
              <p className="text-ink-deep font-bold text-base">
                {isSearchMode
                  ? `Không tìm thấy sản phẩm nào khớp với "${currentSearch}"`
                  : 'Không tìm thấy sản phẩm phù hợp'}
              </p>
              <p className="text-steel text-xs mt-1 max-w-sm mx-auto">
                {isSearchMode
                  ? 'Vui lòng thử lại với từ khóa ngắn gọn hơn (ví dụ: iPhone 15, Samsung, Laptop gaming, Tai nghe...).'
                  : 'Vui lòng thử bỏ chọn một số tiêu chí hãng sản xuất, mức giá hoặc dung lượng bộ nhớ.'}
              </p>
              <button
                onClick={() => isSearchMode ? navigate('/products') : clearAllFilters()}
                className="mt-4 inline-flex items-center justify-center px-6 py-2.5 text-xs font-bold rounded-xl bg-ink-deep text-canvas hover:bg-charcoal transition"
              >
                {isSearchMode ? 'Xem tất cả sản phẩm' : 'Xóa tất cả bộ lọc'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {isFiltering && (
                <div className="w-full h-1 bg-surface-soft overflow-hidden rounded-full">
                  <div className="h-full bg-primary animate-pulse w-2/5 rounded-full" />
                </div>
              )}
              <div className={`grid grid-cols-2 sm:grid-cols-2 ${isSearchMode ? 'md:grid-cols-3 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4 sm:gap-5 items-stretch transition-opacity duration-200 ${
                isFiltering ? 'opacity-50 pointer-events-none' : 'opacity-100'
              }`}>
                {paginatedProducts.map((p) => (
                  <ProductCard key={p.productId} product={p} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-6 border-t border-hairline-soft flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  <div className="text-steel">
                    Hiển thị <strong className="text-ink-deep">{startIndex + 1}</strong> - <strong className="text-ink-deep">{endIndex}</strong> trong tổng số <strong className="text-ink-deep">{totalItems}</strong> sản phẩm
                  </div>

                  <div className="flex items-center gap-1.5 select-none">
                    <button
                      type="button"
                      onClick={() => goToPage(1)}
                      disabled={safePage === 1}
                      className="p-2 rounded-lg border border-hairline-soft text-charcoal hover:bg-surface-soft disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Về trang đầu"
                    >
                      <ChevronsLeft size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => goToPage(safePage - 1)}
                      disabled={safePage === 1}
                      className="px-3 py-1.5 rounded-lg border border-hairline-soft font-bold text-charcoal hover:bg-surface-soft disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">Trước</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      const isActive = p === safePage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => goToPage(p)}
                          className={`min-w-[34px] h-[34px] rounded-lg font-bold transition flex items-center justify-center text-xs ${
                            isActive ? 'bg-ink-deep text-canvas shadow-xs font-black' : 'border border-hairline-soft text-charcoal hover:bg-surface-soft'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => goToPage(safePage + 1)}
                      disabled={safePage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-hairline-soft font-bold text-charcoal hover:bg-surface-soft disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition"
                    >
                      <span className="hidden sm:inline">Sau</span>
                      <ChevronRight size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => goToPage(totalPages)}
                      disabled={safePage === totalPages}
                      className="p-2 rounded-lg border border-hairline-soft text-charcoal hover:bg-surface-soft disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Đến trang cuối"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ========================================= */}
      {/* MOBILE FILTER MODAL DRAWER               */}
      {/* ========================================= */}
      {!isSearchMode && isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex justify-end">
          <div className="bg-canvas w-full max-w-xs h-full p-5 overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <span className="font-bold text-sm text-ink-deep uppercase tracking-wider">Bộ lọc sản phẩm</span>
              <button onClick={() => setIsMobileFilterOpen(false)} className="text-steel hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            {/* Danh mục con */}
            {subcategories.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={13} className="text-primary" />
                    <span>Danh mục</span>
                  </h4>
                  {currentCategoryId && (
                    <button
                      type="button"
                      onClick={() => updateParam('categoryId', undefined)}
                      className="text-[11px] text-critical hover:underline font-bold"
                    >
                      Tất cả
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateParam('categoryId', undefined)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      !currentCategoryId ? 'border-ink-deep bg-ink-deep text-canvas' : 'border-hairline-soft bg-canvas text-ink'
                    }`}
                  >
                    Tất cả
                  </button>
                  {subcategories.map((sub) => {
                    const isSelected = currentCategoryId === sub.categoryId;
                    return (
                      <button
                        key={sub.categoryId}
                        type="button"
                        onClick={() => updateParam('categoryId', isSelected ? undefined : String(sub.categoryId))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                          isSelected ? 'border-ink-deep bg-ink-deep text-canvas' : 'border-hairline-soft bg-canvas text-ink'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                        <span>{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hãng */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Thương hiệu</h4>
                {selectedBrands.length > 0 && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedBrands.length} đã chọn
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleBrand('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                    isAllBrands 
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs' 
                      : 'border-hairline-soft bg-canvas text-ink'
                  }`}
                >
                  {isAllBrands && <Check size={12} className="stroke-[3] text-primary" />}
                  <span>Tất cả</span>
                </button>
                {categorySpecificBrands.map((b) => {
                  const isSelected = selectedBrands.some(sb => sb.toLowerCase() === b.name.toLowerCase());
                  const logoSrc = resolveBrandLogo(b.logoUrl, b.name);
                  return (
                    <button
                      key={b.brandId}
                      type="button"
                      onClick={() => handleToggleBrand(b.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                        isSelected 
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs' 
                          : 'border-hairline-soft bg-canvas text-ink'
                      }`}
                    >
                      {isSelected && <Check size={12} className="stroke-[3] text-primary shrink-0" />}
                      {logoSrc && (
                        <span className="w-6 h-6 rounded-md brand-logo-plate border border-hairline-soft/80 flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                          <img
                            src={logoSrc}
                            alt={b.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                          />
                        </span>
                      )}
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mức giá */}
            <div className="pt-3 border-t border-hairline-soft space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Khoảng giá</h4>
                {(currentMinPrice !== undefined || currentMaxPrice !== undefined) && (
                  <button type="button" onClick={handleClearPrice} className="text-[11px] text-critical hover:underline font-bold">
                    Bỏ lọc
                  </button>
                )}
              </div>
              <div className="space-y-1 text-xs">
                {priceRanges.map((r, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer text-charcoal py-1">
                    <input
                      type="radio"
                      name="mPriceRange"
                      checked={currentMinPrice === r.min && currentMaxPrice === r.max}
                      onChange={() => setPriceRange(r.min, r.max)}
                      className="w-4 h-4 text-primary accent-primary"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ROM / RAM (Mobile) */}
            {(currentCategory === 'phone' || currentCategory === 'tablet') && (
              <div className="pt-3 border-t border-hairline-soft space-y-3">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Bộ nhớ ROM</h4>
                <div className="flex flex-wrap gap-1.5">
                  {[64, 128, 256, 512, 1024].map((rom) => (
                    <button
                      key={rom}
                      type="button"
                      onClick={() => updateParam('rom', currentRom === rom ? undefined : String(rom))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        currentRom === rom ? 'border-primary bg-primary text-canvas' : 'border-hairline-soft bg-canvas text-ink'
                      }`}
                    >
                      {rom >= 1024 ? '1 TB' : `${rom} GB`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chuẩn sạc & Kết nối (Mobile Phụ kiện) */}
            {currentCategory === 'accessory' && (
              <div className="pt-3 border-t border-hairline-soft space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Chuẩn sạc & Kết nối</h4>
                  {currentConnectionType && (
                    <button
                      type="button"
                      onClick={() => updateParam('conn', undefined)}
                      className="text-[11px] text-critical hover:underline font-bold"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ACCESSORY_CONNECTION_TYPES.map((conn) => {
                    const isSelected = currentConnectionType?.toLowerCase() === conn.toLowerCase();
                    return (
                      <button
                        key={conn}
                        type="button"
                        onClick={() => updateParam('conn', isSelected ? undefined : conn)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs'
                            : 'border-hairline-soft bg-canvas text-ink'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3] text-primary" />}
                        <span>{conn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-5 border-t border-hairline-soft flex gap-2.5">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-hairline-soft hover:bg-surface-soft transition"
              >
                Đặt lại
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-ink-deep text-canvas hover:bg-charcoal transition"
              >
                Xem ({products.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
