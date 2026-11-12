import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productService, ProductFilterParams } from '../services/productService';
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
  Check
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
  return [
    { label: 'Tất cả mức giá', min: undefined, max: undefined },
    { label: 'Dưới 5 triệu', min: 0, max: 5000000 },
    { label: 'Từ 5 - 10 triệu', min: 5000000, max: 10000000 },
    { label: 'Từ 10 - 15 triệu', min: 10000000, max: 15000000 },
    { label: 'Từ 15 - 20 triệu', min: 15000000, max: 20000000 },
    { label: 'Trên 20 triệu', min: 20000000, max: 100000000 },
  ];
};

const ITEMS_PER_PAGE = 6;

export const ProductListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Lấy các params từ URL
  const rawCategory = searchParams.get('category');
  const isSale = searchParams.get('sale') === 'true';
  const currentSearch = searchParams.get('q') || '';
  const currentCategory = rawCategory || (currentSearch || isSale? 'all': 'phone');

  // Hỗ trợ chọn đồng thời nhiều hãng sản xuất
  const rawBrand = searchParams.get('brand');
  const selectedBrands: string[] = rawBrand && rawBrand!== 'all'? rawBrand.split(',').map(s => s.trim()).filter(Boolean): [];
  const isAllBrands = selectedBrands.length === 0;

  const currentSort = (searchParams.get('sort') as ProductFilterParams['sort']) || 'newest';
  const currentMinPrice = searchParams.get('minPrice')? Number(searchParams.get('minPrice')): undefined;
  const currentMaxPrice = searchParams.get('maxPrice')? Number(searchParams.get('maxPrice')): undefined;
  const currentRom = searchParams.get('rom')? Number(searchParams.get('rom')): undefined;
  const currentRam = searchParams.get('ram')? Number(searchParams.get('ram')): undefined;
  const rawPage = searchParams.get('page');
  const currentPage = rawPage? Math.max(1, parseInt(rawPage, 10) || 1): 1;

  // Danh sách khoảng giá động theo từng ngành hàng (Laptop, Phụ kiện, Điện thoại)
  const priceRanges = getPriceRangesForCategory(isSale? 'sale': currentCategory);


  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const catKey = isSale? 'sale': currentCategory;
      const brandList = await productService.getBrands(catKey);

      // Chỉ lọc theo các brand hợp lệ với ngành hàng hiện tại (tránh lỗi giữ hãng của ngành khác gây 0 sản phẩm)
      const validSelectedBrands = selectedBrands.filter(b =>
        brandList.some(item => item.name.toLowerCase() === b.toLowerCase())
      );

      const prodList = await productService.getProducts({
        category: isSale? undefined: (currentCategory === 'all'? undefined: currentCategory),
        isFlashSale: isSale? true: undefined,
        brands: validSelectedBrands.length > 0? validSelectedBrands: undefined,
        search: currentSearch || undefined,
        sort: currentSort,
        minPrice: currentMinPrice,
        maxPrice: currentMaxPrice,
        rom: currentRom,
        ram: currentRam,
        limit: 100
      });
      setBrands(brandList);
      setProducts(prodList);
      setIsLoading(false);
    };
    fetch();
  }, [searchParams, isSale, currentCategory]);

  const updateParam = (key: string, value: string | undefined) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === undefined || value === 'all' || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    // Khi đổi tiêu chí lọc, reset về trang 1
    if (key!== 'page') {
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
      // Click lần 2: Bỏ chọn hãng đó
      nextBrands = selectedBrands.filter(b => b.toLowerCase()!== brandName.toLowerCase());
    } else {
      // Click lần 1: Chọn thêm hãng đó
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

  const hasActiveFilters = selectedBrands.length > 0 || currentMinPrice!== undefined || currentMaxPrice!== undefined || currentRom!== undefined || currentRam!== undefined || currentSearch;

  // Pagination Logic
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
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
    currentSearch? `Kết quả tìm kiếm: "${currentSearch}"`:
    isSale? 'Sản phẩm Khuyến mãi & Flash Sale':
    currentCategory === 'phone'? 'Điện thoại thông minh':
    currentCategory === 'laptop'? 'Laptop, Máy tính xách tay':
    currentCategory === 'tablet'? 'Máy tính bảng':
    currentCategory === 'accessory'? 'Phụ kiện di động chính hãng': 'Tất cả sản phẩm';

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
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-medium text-ink-deep tracking-tight">
              {categoryTitle}
            </h1>
            {isSale && (
              <span className="text-xs bg-warning text-ink-deep font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Ưu đãi có hạn
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-steel mt-0.5">
            Hiển thị <strong>{products.length}</strong> thiết bị phân phối chính hãng, đầy đủ hóa đơn VAT
          </p>
        </div>

        {/* Mobile Filter Toggle Button */}
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="lg:hidden inline-flex items-center gap-2 bg-canvas border border-hairline-soft text-xs font-bold text-ink px-4 py-2 rounded-full self-start hover:border-slate transition-colors"
        >
          <Filter size={14} className="text-primary" />
          <span>Bộ lọc nâng cao</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================= */}
        {/* DESKTOP SIDEBAR FILTERS (3 cols)          */}
        {/* ========================================= */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-24">
          <div className="bg-canvas border border-hairline-soft rounded-xxl p-6 space-y-6 shadow-none">
            <div className="flex items-center justify-between pb-4 border-b border-hairline-soft">
              <span className="font-bold text-xs text-ink-deep uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-primary" />
                <span>Bộ lọc sản phẩm</span>
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

            {/* 1. Thương hiệu (Hỗ trợ chọn nhiều hãng) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Hãng sản xuất</h4>
                {selectedBrands.length > 0 && (
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedBrands.length} đã chọn
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleBrand('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isAllBrands? 'border-ink-deep bg-ink-deep text-canvas shadow-xs': 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
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
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        isSelected? 'border-ink-deep bg-ink-deep text-canvas shadow-xs': 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                      }`}
                    >
                      {isSelected && <Check size={12} className="stroke-[3]" />}
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Mức giá & Khoảng giá tùy chỉnh */}
            <div className="pt-5 border-t border-hairline-soft space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Khoảng giá bán</h4>
                {(currentMinPrice!== undefined || currentMaxPrice!== undefined) && (
                  <button
                    type="button"
                    onClick={handleClearPrice}
                    className="text-[11px] text-critical hover:underline font-bold"
                  >
                    Bỏ lọc giá
                  </button>
                )}
              </div>

              {/* Radio presets */}
              <div className="space-y-1.5 text-xs">
                {priceRanges.map((r, i) => {
                  const isChecked = currentMinPrice === r.min && currentMaxPrice === r.max;
                  return (
                    <label
                      key={i}
                      className="flex items-center gap-2.5 cursor-pointer text-charcoal hover:text-ink select-none py-0.5"
                    >
                      <input
                        type="radio"
                        name="priceRange"
                        checked={isChecked}
                        onChange={() => setPriceRange(r.min, r.max)}
                        className="w-4 h-4 text-primary accent-primary focus:ring-0 cursor-pointer"
                      />
                      <span className={`text-xs ${isChecked? 'font-bold text-ink-deep': 'text-charcoal'}`}>{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Tiêu chí cấu hình riêng biệt theo danh mục */}
            {/* A. Cấu hình cho LAPTOP */}
            {currentCategory === 'laptop' && (
              <div className="pt-5 border-t border-hairline-soft space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2.5">Bộ nhớ RAM Laptop</h4>
                  <div className="flex flex-wrap gap-2">
                    {[8, 16, 32].map((ram) => {
                      const isSelected = currentRam === ram;
                      return (
                        <button
                          key={ram}
                          type="button"
                          onClick={() => updateParam('ram', isSelected? undefined: String(ram))}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            isSelected? 'border-ink-deep bg-ink-deep text-canvas shadow-xs': 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                          }`}
                        >
                          {ram} GB
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2.5">Ổ cứng SSD</h4>
                  <div className="flex flex-wrap gap-2">
                    {[256, 512, 1024].map((rom) => {
                      const isSelected = currentRom === rom;
                      return (
                        <button
                          key={rom}
                          type="button"
                          onClick={() => updateParam('rom', isSelected? undefined: String(rom))}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            isSelected? 'border-ink-deep bg-ink-deep text-canvas shadow-xs': 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                          }`}
                        >
                          {rom >= 1024? '1 TB SSD': `${rom} GB SSD`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* B. Cấu hình cho ĐIỆN THOẠI */}
            {(currentCategory === 'phone' || (currentCategory === 'all' &&!isSale)) && (
              <div className="pt-5 border-t border-hairline-soft space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2.5">Dung lượng bộ nhớ (ROM)</h4>
                  <div className="flex flex-wrap gap-2">
                    {[128, 256, 512, 1024].map((rom) => {
                      const isSelected = currentRom === rom;
                      return (
                        <button
                          key={rom}
                          type="button"
                          onClick={() => updateParam('rom', isSelected? undefined: String(rom))}
                          className={`px-3 py-1.5 rounded-full text-xs font-sans font-bold transition-all border ${
                            isSelected? 'border-ink-deep bg-ink-deep text-canvas shadow-xs': 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                          }`}
                        >
                          {rom >= 1024? '1 TB': `${rom} GB`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2.5">Dung lượng RAM</h4>
                  <div className="flex flex-wrap gap-2">
                    {[6, 8, 12, 16].map((ram) => {
                      const isSelected = currentRam === ram;
                      return (
                        <button
                          key={ram}
                          type="button"
                          onClick={() => updateParam('ram', isSelected? undefined: String(ram))}
                          className={`px-3 py-1.5 rounded-full text-xs font-sans font-bold transition-all border ${
                            isSelected? 'border-ink-deep bg-ink-deep text-canvas shadow-xs': 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                          }`}
                        >
                          {ram} GB
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* C. Cấu hình cho MÁY TÍNH BẢNG (TABLET) */}
            {currentCategory === 'tablet' && (
              <div className="pt-5 border-t border-hairline-soft">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2.5">Dung lượng lưu trữ</h4>
                <div className="flex flex-wrap gap-2">
                  {[64, 128, 256, 512].map((rom) => {
                    const isSelected = currentRom === rom;
                    return (
                      <button
                        key={rom}
                        type="button"
                        onClick={() => updateParam('rom', isSelected? undefined: String(rom))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          isSelected? 'border-ink-deep bg-ink-deep text-canvas shadow-xs': 'border-hairline-soft bg-canvas text-ink hover:border-charcoal'
                        }`}
                      >
                        {rom} GB
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* ========================================= */}
        {/* MAIN PRODUCT GRID (9 cols)                */}
        {/* ========================================= */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Sắp xếp bar */}
          <div className="bg-canvas border border-hairline-soft rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-none">
            <div className="flex items-center gap-2">
              <span className="font-bold text-charcoal flex items-center gap-1.5">
                <ArrowUpDown size={14} className="text-steel" />
                <span>Sắp xếp:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'newest', label: 'Mới nhất' },
                  { key: 'best_seller', label: 'Bán chạy nhất' },
                  { key: 'price_asc', label: 'Giá tăng dần' },
                  { key: 'price_desc', label: 'Giá giảm dần' },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => updateParam('sort', s.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      currentSort === s.key? 'bg-ink-deep text-canvas shadow-xs': 'bg-surface-soft text-charcoal hover:bg-hairline-soft hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid Products */}
          {isLoading? (
            <div className="py-24 text-center text-steel text-xs">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-semibold text-charcoal">Đang nạp danh sách thiết bị...</p>
            </div>
          ): products.length === 0? (
            <div className="py-16 bg-canvas rounded-xxl border border-hairline-soft text-center text-steel text-xs p-8">
              <p className="text-ink-deep font-bold text-base">Không tìm thấy sản phẩm phù hợp</p>
              <p className="text-steel text-xs mt-1">Vui lòng điều chỉnh hoặc xóa các bộ lọc giá / bộ nhớ để xem thêm.</p>
              <button
                onClick={clearAllFilters}
                className="btn-marketing mt-4 inline-flex items-center justify-center px-6 py-2.5 text-xs"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          ): (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-5 items-stretch">
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
                    {/* Trang đầu */}
                    <button
                      type="button"
                      onClick={() => goToPage(1)}
                      disabled={safePage === 1}
                      className="p-2 rounded-lg border border-hairline-soft text-charcoal hover:bg-surface-soft disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Về trang đầu"
                    >
                      <ChevronsLeft size={14} />
                    </button>

                    {/* Trang trước */}
                    <button
                      type="button"
                      onClick={() => goToPage(safePage - 1)}
                      disabled={safePage === 1}
                      className="px-3 py-1.5 rounded-lg border border-hairline-soft font-bold text-charcoal hover:bg-surface-soft disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">Trước</span>
                    </button>

                    {/* Các số trang */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      const isActive = p === safePage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => goToPage(p)}
                          className={`min-w-[34px] h-[34px] rounded-lg font-bold transition flex items-center justify-center text-xs ${
                            isActive? 'bg-ink-deep text-canvas shadow-xs': 'border border-hairline-soft text-charcoal hover:bg-surface-soft'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    {/* Trang kế tiếp */}
                    <button
                      type="button"
                      onClick={() => goToPage(safePage + 1)}
                      disabled={safePage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-hairline-soft font-bold text-charcoal hover:bg-surface-soft disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition"
                    >
                      <span className="hidden sm:inline">Sau</span>
                      <ChevronRight size={14} />
                    </button>

                    {/* Trang cuối */}
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
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex justify-end">
          <div className="bg-canvas w-full max-w-xs h-full p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-hairline-soft">
              <span className="font-bold text-sm text-ink-deep uppercase tracking-wider">Bộ lọc sản phẩm</span>
              <button onClick={() => setIsMobileFilterOpen(false)} className="text-steel hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            {/* Hãng (Hỗ trợ chọn nhiều hãng) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Thương hiệu</h4>
                {selectedBrands.length > 0 && (
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedBrands.length} đã chọn
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleBrand('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                    isAllBrands? 'border-ink-deep bg-ink-deep text-canvas': 'border-hairline-soft bg-canvas text-ink'
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
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        isSelected? 'border-ink-deep bg-ink-deep text-canvas': 'border-hairline-soft bg-canvas text-ink'
                      }`}
                    >
                      {isSelected && <Check size={12} className="stroke-[3]" />}
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mức giá & Khoảng giá tùy chọn */}
            <div className="pt-4 border-t border-hairline-soft space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider">Mức giá</h4>
                {(currentMinPrice!== undefined || currentMaxPrice!== undefined) && (
                  <button
                    type="button"
                    onClick={handleClearPrice}
                    className="text-[11px] text-critical hover:underline font-bold"
                  >
                    Bỏ lọc
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {priceRanges.map((r, i) => (
                  <label key={i} className="flex items-center gap-2.5 cursor-pointer text-charcoal">
                    <input
                      type="radio"
                      name="mPriceRange"
                      checked={currentMinPrice === r.min && currentMaxPrice === r.max}
                      onChange={() => setPriceRange(r.min, r.max)}
                      className="w-4 h-4 text-primary accent-primary focus:ring-0"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cấu hình đặc thù theo danh mục (Mobile) */}
            {currentCategory === 'laptop' && (
              <div className="pt-4 border-t border-hairline-soft space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">RAM Laptop</h4>
                  <div className="flex flex-wrap gap-2">
                    {[8, 16, 32].map((ram) => (
                      <button
                        key={ram}
                        type="button"
                        onClick={() => updateParam('ram', currentRam === ram? undefined: String(ram))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                          currentRam === ram? 'border-ink-deep bg-ink-deep text-canvas': 'border-hairline-soft bg-canvas text-ink'
                        }`}
                      >
                        {ram} GB
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Ổ cứng SSD</h4>
                  <div className="flex flex-wrap gap-2">
                    {[256, 512, 1024].map((rom) => (
                      <button
                        key={rom}
                        type="button"
                        onClick={() => updateParam('rom', currentRom === rom? undefined: String(rom))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                          currentRom === rom? 'border-ink-deep bg-ink-deep text-canvas': 'border-hairline-soft bg-canvas text-ink'
                        }`}
                      >
                        {rom >= 1024? '1 TB SSD': `${rom} GB SSD`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(currentCategory === 'phone' || (currentCategory === 'all' &&!isSale)) && (
              <div className="pt-4 border-t border-hairline-soft space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2">Bộ nhớ ROM</h4>
                  <div className="flex flex-wrap gap-2">
                    {[128, 256, 512, 1024].map((rom) => (
                      <button
                        key={rom}
                        type="button"
                        onClick={() => updateParam('rom', currentRom === rom? undefined: String(rom))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                          currentRom === rom? 'border-ink-deep bg-ink-deep text-canvas': 'border-hairline-soft bg-canvas text-ink'
                        }`}
                      >
                        {rom >= 1024? '1 TB': `${rom} GB`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-hairline-soft flex gap-3">
              <button
                onClick={clearAllFilters}
                className="btn-secondary flex-1 py-2.5 text-xs"
              >
                Đặt lại
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="btn-marketing flex-1 py-2.5 text-xs"
              >
                Xem kết quả
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
