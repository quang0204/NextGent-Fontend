import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../services/productService';
import { promotionService } from '../services/promotionService';
import { Product, Brand } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { 
  Zap, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Sparkles, 
  CreditCard,
  Cpu,
  Smartphone,
  Star
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Flash Sale Auto-slide & Navigation Controls
  const flashSaleSliderRef = useRef<HTMLDivElement>(null);
  const [isFlashSalePaused, setIsFlashSalePaused] = useState(false);
  const [isFlashSaleInView, setIsFlashSaleInView] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // API 6.1: GET /api/v1/promotions/active song song với danh mục & sản phẩm
      const [allProducts, allBrands] = await Promise.all([
        productService.getProducts(),
        productService.getBrands(),
        promotionService.getActivePromotions().catch(() => [])
      ]);
      setProducts(allProducts);
      setBrands(allBrands);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const flashSaleProducts = products.filter(p => p.isFlashSale);
  const filteredProducts = selectedBrand === 'all'
    ? products
    : products.filter(p => p.brandName.toLowerCase() === selectedBrand.toLowerCase());

  // Hiển thị ban đầu 12 sản phẩm, mỗi lần click "Xem thêm" tải thêm 8 sản phẩm
  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredProducts.length - visibleCount);
  const hasMore = remainingCount > 0;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 8);
  };

  // Reset số lượng sản phẩm hiển thị về 12 mỗi khi đổi thương hiệu
  useEffect(() => {
    setVisibleCount(12);
  }, [selectedBrand]);

  // Quan sát khi người dùng cuộn màn hình đến khu vực Flash Sale
  useEffect(() => {
    const el = flashSaleSliderRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsFlashSaleInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsFlashSaleInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [flashSaleProducts.length]);

  // Điều khiển thanh trượt Flash Sale tự động chạy mượt mà và cho phép bấm chuyển slide
  const scrollNext = () => {
    if (!flashSaleSliderRef.current) return;
    const container = flashSaleSliderRef.current;
    const firstCard = container.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard?.offsetWidth || 245;
    const gap = 16; // gap-4 = 16px
    const step = cardWidth + gap;
    const maxScroll = container.scrollWidth - container.clientWidth;

    if (container.scrollLeft >= maxScroll - 10) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: step, behavior: 'smooth' });
    }
  };

  const scrollPrev = () => {
    if (!flashSaleSliderRef.current) return;
    const container = flashSaleSliderRef.current;
    const firstCard = container.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard?.offsetWidth || 245;
    const gap = 16;
    const step = cardWidth + gap;

    if (container.scrollLeft <= 10) {
      container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: -step, behavior: 'smooth' });
    }
  };

  // Tự động lướt ngay khi người dùng cuộn tới (không delay), lặp lại mượt mà mỗi 2.2 giây
  useEffect(() => {
    if (!isFlashSaleInView || isFlashSalePaused || flashSaleProducts.length <= 1) return;

    // Kích hoạt lướt ngay sau 400ms khi vừa lướt đến vùng Flash Sale
    const kickTimer = setTimeout(() => {
      scrollNext();
    }, 400);

    const timer = setInterval(() => {
      scrollNext();
    }, 2200);

    return () => {
      clearTimeout(kickTimer);
      clearInterval(timer);
    };
  }, [isFlashSaleInView, isFlashSalePaused, flashSaleProducts.length]);

  return (
    <div className="space-y-12 pb-20">
      
      {/* 1. HERO BANNER SECTION (DESIGN-meta hero-band-marketing with dual-CTA) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Hero Showcase (8 cols) */}
          <div className="lg:col-span-8 bg-ink-deep rounded-xxxl overflow-hidden relative border border-hairline-soft/20 flex flex-col justify-between p-8 sm:p-12 text-canvas min-h-[420px] group">
            
            {/* Ambient Lighting */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Tagline */}
            <div className="z-10 space-y-3.5 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-canvas/10 border border-canvas/20 text-xs font-bold text-canvas">
                <Sparkles size={13} className="text-warning" />
                <span className="uppercase tracking-wider">Flagship Thế Hệ Mới</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-medium tracking-tight leading-[1.15] text-canvas">
                iPhone 15 Pro Max
              </h1>

              <p className="text-sm sm:text-base text-canvas/80 leading-relaxed font-normal">
                Khung vỏ Titanium chuẩn hàng không vũ trụ. Chip Apple A17 Pro đỉnh cao hiệu năng 3nm thế hệ mới.
              </p>

              {/* Key Specs Pills */}
              <div className="flex flex-wrap gap-2 pt-1 text-xs text-canvas/90">
                <span className="bg-canvas/10 border border-canvas/20 px-3 py-1 rounded-full font-medium">
                  Titanium tự nhiên
                </span>
                <span className="bg-canvas/10 border border-canvas/20 px-3 py-1 rounded-full font-medium">
                  Chip A17 Pro
                </span>
                <span className="bg-canvas/10 border border-canvas/20 px-3 py-1 rounded-full font-medium">
                  Zoom quang 5x
                </span>
              </div>
            </div>

            {/* Dual CTA & Pricing per DESIGN-meta */}
            <div className="z-10 pt-8 flex flex-wrap items-center gap-4 border-t border-canvas/15 mt-6">
              <Link
                to="/product/1"
                className="inline-flex items-center justify-center font-bold text-sm text-ink-button bg-canvas hover:bg-surface-soft active:bg-hairline-soft rounded-full px-[30px] py-[14px] transition-colors"
              >
                <span>Khám phá ngay</span>
                <ChevronRight size={16} className="ml-1" />
              </Link>

              <Link
                to="/compare"
                className="inline-flex items-center justify-center font-bold text-sm text-canvas bg-transparent border-2 border-canvas hover:bg-canvas/10 rounded-full px-[28px] py-[12px] transition-colors"
              >
                <span>So sánh cấu hình</span>
              </Link>

              <div className="flex flex-col ml-auto">
                <span className="text-xs text-canvas/60 uppercase font-semibold">Giá niêm yết</span>
                <span className="text-base sm:text-lg font-bold text-canvas font-mono">
                  Từ 29.490.000₫
                </span>
              </div>
            </div>

            {/* Device Image Showcase */}
            <div className="hidden sm:block absolute right-4 sm:right-8 bottom-6 top-6 w-72 lg:w-80 pointer-events-none flex items-center justify-center">
              <img
                src="https://cdn.tgdd.vn/Products/Images/42/305658/iphone-15-pro-max-blue-thumbnew-600x600.jpg"
                alt="iPhone 15 Pro Max"
                className="max-h-full max-w-full object-contain filter drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Sub Side Cards (4 cols) - DESIGN-meta card-product-feature */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-6 justify-between">
            
            {/* Card 1: Galaxy S24 Ultra */}
            <div className="flex-1 bg-surface-soft rounded-xxxl p-6 text-ink-deep flex items-center justify-between relative overflow-hidden border border-hairline-soft group">
              <div className="z-10 space-y-2 max-w-[170px]">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} /> Galaxy AI
                </span>
                <h3 className="text-xl font-medium leading-tight text-ink-deep">Galaxy S24 Ultra</h3>
                <p className="text-xs text-steel line-clamp-1">Khung Titan & Zoom AI 100x</p>
                <Link 
                  to="/product/2" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-deep pt-1 transition"
                >
                  <span>Xem chi tiết</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
              <div className="w-28 h-28 flex items-center justify-center">
                <img
                  src="https://cdn.tgdd.vn/Products/Images/42/307174/samsung-galaxy-s24-ultra-xam-thumb-600x600.jpg"
                  alt="S24 Ultra"
                  className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>

            {/* Card 2: Xiaomi 14 */}
            <div className="flex-1 bg-surface-soft rounded-xxxl p-6 text-ink-deep flex items-center justify-between relative overflow-hidden border border-hairline-soft group">
              <div className="z-10 space-y-2 max-w-[170px]">
                <span className="text-xs font-bold text-warning uppercase tracking-wider flex items-center gap-1">
                  <Star size={12} className="fill-warning" /> Leica Optics
                </span>
                <h3 className="text-xl font-medium leading-tight text-ink-deep">Xiaomi 14 5G</h3>
                <p className="text-xs text-steel line-clamp-1">Snapdragon 8 Gen 3 & 90W</p>
                <Link 
                  to="/product/3" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-deep pt-1 transition"
                >
                  <span>Xem chi tiết</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
              <div className="w-28 h-28 flex items-center justify-center">
                <img
                  src="https://cdn.tgdd.vn/Products/Images/42/313364/xiaomi-14-black-thumb-600x600.jpg"
                  alt="Xiaomi 14"
                  className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. BRAND QUICK FILTER ROW (DESIGN-meta button-pill-tab) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-canvas border border-hairline-soft rounded-xxxl p-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-steel uppercase tracking-wider px-3 flex-shrink-0">
            Thương hiệu:
          </span>
          <button
            onClick={() => setSelectedBrand('all')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors flex-shrink-0 ${
              selectedBrand === 'all'
                ? 'bg-ink-deep text-canvas border-transparent shadow-subtle'
                : 'bg-canvas text-ink border border-hairline hover:border-slate'
            }`}
          >
            Tất cả
          </button>
          {brands.map((b) => {
            const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();
            return (
              <button
                key={b.brandId}
                onClick={() => setSelectedBrand(b.name)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors flex-shrink-0 ${
                  isSelected
                    ? 'bg-ink-deep text-canvas border-transparent shadow-subtle'
                    : 'bg-canvas text-ink border border-hairline hover:border-slate'
                }`}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. FLASH SALE SECTION (DESIGN-meta card-promo-strip) */}
      {flashSaleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-ink-deep border border-hairline-soft/20 rounded-xxxl p-6 sm:p-10 text-canvas relative">
            
            {/* Flash Sale Header with Countdown & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-canvas/15">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-canvas/10 flex items-center justify-center text-warning flex-shrink-0">
                  <Zap size={20} className="fill-warning text-warning" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-canvas">
                      GIỜ VÀNG FLASH SALE
                    </h2>
                    <span className="text-xs bg-warning text-ink-deep font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Hôm nay
                    </span>
                  </div>
                  <p className="text-xs text-canvas/70 mt-0.5">
                    Số lượng giới hạn, khóa giữ chỗ kho khả dụng 30 phút ngay khi đặt mua
                  </p>
                </div>
              </div>

              {/* Digital Countdown Timer */}
              <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                <div className="flex items-center gap-2.5 text-xs bg-canvas/10 border border-canvas/20 px-3.5 py-1.5 rounded-full">
                  <span className="text-canvas/80 font-medium">Kết thúc trong:</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-warning text-sm">
                    <span className="bg-ink-button px-2 py-0.5 rounded text-canvas font-mono">03</span>
                    <span>:</span>
                    <span className="bg-ink-button px-2 py-0.5 rounded text-canvas font-mono">24</span>
                    <span>:</span>
                    <span className="bg-ink-button px-2 py-0.5 rounded text-canvas font-mono">58</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Flash Sale Horizontal Slider (1 Hàng ngang - Tự động lướt mỗi 3s) */}
            <div 
              className="relative group/slider"
              onMouseEnter={() => setIsFlashSalePaused(true)}
              onMouseLeave={() => setIsFlashSalePaused(false)}
            >
              {/* Floating Left Arrow (button-icon-circular) */}
              <button
                type="button"
                onClick={scrollPrev}
                aria-label="Trượt sang trái"
                className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-canvas text-ink hover:bg-surface-soft border border-hairline-soft shadow-xs hidden sm:flex items-center justify-center transition-all"
              >
                <ChevronLeft size={18} />
              </button>

              {/* Running Cards Row Container */}
              <div
                ref={flashSaleSliderRef}
                className="flex items-stretch gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-proximity py-2 px-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {flashSaleProducts.map((product) => (
                  <div
                    key={product.productId}
                    className="w-[200px] sm:w-[210px] md:w-[220px] flex-shrink-0 snap-start flex flex-col h-auto self-stretch"
                  >
                    <ProductCard product={product} compact={true} />
                  </div>
                ))}
              </div>

              {/* Floating Right Arrow (button-icon-circular) */}
              <button
                type="button"
                onClick={scrollNext}
                aria-label="Trượt sang phải"
                className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-canvas text-ink hover:bg-surface-soft border border-hairline-soft shadow-xs hidden sm:flex items-center justify-center transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>

          </div>
        </section>
      )}

      {/* 4. MAIN PRODUCT LIST (DESIGN-meta card-product-feature grid) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8 pb-3 border-b border-hairline-soft">
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium text-ink-deep tracking-tight flex items-center gap-2.5">
              <Smartphone size={24} className="text-primary" />
              <span>Thiết bị di động nổi bật & Bán chạy</span>
            </h2>
            <p className="text-sm text-steel mt-1">
              Phân phối chính hãng 100%, bảo hành 12 tháng, hỗ trợ trả góp 0% lãi suất
            </p>
          </div>
          <span className="text-xs text-steel font-medium self-end sm:self-auto">
            Đang hiển thị <strong>{displayedProducts.length}</strong> / <strong>{filteredProducts.length}</strong> thiết bị
          </span>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="py-24 text-center text-steel text-sm">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-semibold text-ink">Đang tải danh mục thiết bị công nghệ...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 bg-surface-soft rounded-xxxl border border-hairline-soft text-center text-steel text-sm">
            <p className="text-ink-deep font-bold text-base">Không tìm thấy sản phẩm nào</p>
            <p className="text-steel text-xs mt-1">Vui lòng chọn thương hiệu khác để xem thêm thiết bị.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
              {displayedProducts.map((p) => (
                <ProductCard key={p.productId} product={p} />
              ))}
            </div>

            {/* Nút Xem thêm sản phẩm (+8 sản phẩm mỗi lần click) */}
            {hasMore && (
              <div className="pt-8 flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="btn-marketing px-8 py-3 rounded-full text-xs font-bold inline-flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Xem thêm sản phẩm</span>
                  <ChevronDown size={15} />
                </button>
                <p className="text-[11px] text-steel">
                  Còn <strong>{remainingCount}</strong> thiết bị chính hãng chưa hiển thị
                </p>
              </div>
            )}

            {!hasMore && filteredProducts.length > 12 && (
              <div className="pt-8 text-center text-xs text-steel">
                <span className="bg-surface-soft px-4 py-2 rounded-full border border-hairline-soft inline-block font-medium">
                  ✓ Đã hiển thị toàn bộ <strong>{filteredProducts.length}</strong> sản phẩm
                </span>
              </div>
            )}
          </>
        )}
      </section>

    </div>
  );
};
