import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { productService, ProductFilterParams, parseSmartSearchQuery } from '../services/productService';
import { Product, Brand } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
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
  Tag
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

export const ProductListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Lấy các params từ URL
  const rawCategory = searchParams.get('category');
  const isSale = searchParams.get('sale') === 'true';
  const currentSearch = (searchParams.get('q') || '').trim();
  const isSearchMode = Boolean(currentSearch);
  const parsedSearch = parseSmartSearchQuery(currentSearch);
  const currentCategory = rawCategory || (isSearchMode || isSale ? 'all' : 'phone');

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
    const fetch = async () => {
      setIsLoading(true);
      if (isSearchMode) {
        // Khi tìm kiếm: không áp dụng bộ lọc sản phẩm thủ công, chỉ dùng Smart Search + sắp xếp
        const prodList = await productService.getProducts({
          search: currentSearch,
          sort: currentSort,
          limit: 100
        });
        setProducts(prodList);
        setIsLoading(false);
        return;
      }

      const catKey = isSale ? 'sale' : currentCategory;
      const brandList = await productService.getBrands(catKey);

      // Chỉ lọc theo các brand hợp lệ với ngành hàng hiện tại
      const validSelectedBrands = selectedBrands.filter(b =>
        brandList.some(item => item.name.toLowerCase() === b.toLowerCase())
      );

      const prodList = await productService.getProducts({
        category: isSale ? undefined : (currentCategory === 'all' ? undefined : currentCategory),
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

      setBrands(brandList);
      setProducts(prodList);
      setIsLoading(false);
    };
    fetch();
  }, [
    searchParams,
    isSearchMode,
    isSale,
    currentCategory,
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
    setSearchParams(newParams);
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
    setSearchParams(newParams);
  };

  const handleClearPrice = () => {
    setPriceRange(undefined, undefined);
  };

  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    if (rawCategory) newParams.set('category', rawCategory);
    if (isSale) newParams.set('sale', 'true');
    setSearchParams(newParams);
  };

  const hasActiveFilters = 
    !isSearchMode && (
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
    setSearchParams(newParams);
    window.scrollTo({ top: 120, behavior: 'smooth' });
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

      {/* 4. Active Filter Chips (Chỉ hiển thị khi KHÔNG ở chế độ tìm kiếm) */}
      {!isSearchMode && hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs bg-surface-soft/60 border border-hairline-soft p-3 rounded-2xl">
          <span className="font-bold text-steel uppercase text-[11px] tracking-wider mr-1">Đang chọn:</span>
          
          {selectedBrands.map(b => (
            <span key={b} className="inline-flex items-center gap-1.5 bg-canvas border border-hairline-soft px-2.5 py-1 rounded-lg text-ink font-bold shadow-xs">
              <span>Hãng: {b}</span>
              <button type="button" onClick={() => handleToggleBrand(b)} className="text-steel hover:text-critical">
                <X size={13} />
              </button>
            </span>
          ))}

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
              <span>Kết nối: {currentConnectionType.toUpperCase()}</span>
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
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleBrand('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isAllBrands
                      ? 'border-ink-deep bg-ink-deep text-canvas shadow-xs'
                      : 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                  }`}
                >
                  Tất cả
                </button>
                {brands.map((b) => {
                  const isSelected = selectedBrands.some(sb => sb.toLowerCase() === b.name.toLowerCase());
                  return (
                    <button
                      key={b.brandId}
                      type="button"
                      onClick={() => handleToggleBrand(b.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'border-ink-deep bg-ink-deep text-canvas shadow-xs'
                          : 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                      }`}
                    >
                      {isSelected && <Check size={12} className="stroke-[3]" />}
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
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Chuẩn sạc & Kết nối</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'usb-c', label: 'USB-C GaN' },
                      { key: 'lightning', label: 'Lightning' },
                      { key: 'magsafe', label: 'MagSafe Không dây' },
                      { key: 'bluetooth', label: 'Bluetooth' },
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
        <div className={isSearchMode ? "lg:col-span-12 space-y-6" : "lg:col-span-9 space-y-6"}>
          
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
          {isLoading ? (
            <div className="py-24 text-center text-steel text-xs">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-semibold text-charcoal">Đang nạp danh sách thiết bị công nghệ...</p>
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
              <div className={`grid grid-cols-2 sm:grid-cols-2 ${isSearchMode ? 'md:grid-cols-3 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4 sm:gap-5 items-stretch`}>
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
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleBrand('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    isAllBrands ? 'border-ink-deep bg-ink-deep text-canvas' : 'border-hairline-soft bg-canvas text-ink'
                  }`}
                >
                  Tất cả
                </button>
                {brands.map((b) => {
                  const isSelected = selectedBrands.some(sb => sb.toLowerCase() === b.name.toLowerCase());
                  return (
                    <button
                      key={b.brandId}
                      type="button"
                      onClick={() => handleToggleBrand(b.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                        isSelected ? 'border-ink-deep bg-ink-deep text-canvas' : 'border-hairline-soft bg-canvas text-ink'
                      }`}
                    >
                      {isSelected && <Check size={12} className="stroke-[3]" />}
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
