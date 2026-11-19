import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { productService, applyActivePromotionsToProducts } from '../services/productService';
import { promotionService, getCountdownParts } from '../services/promotionService';
import { Product, Brand } from '../types/product';
import { resolveBrandLogo } from '../utils/brandUtils';
import { ProductCard } from '../components/product/ProductCard';
import { ProductCardSkeleton } from '../components/product/ProductCardSkeleton';
import { formatVND } from '../components/common/PriceDisplay';
import { 
  Zap, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  CreditCard,
  Cpu,
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Flame,
  Star
} from 'lucide-react';

const classifyProductCategory = (p: Product): 'phone' | 'laptop' | 'tablet' | 'accessory' => {
  const pName = (p.name || '').toLowerCase();
  const cName = (p.categoryName || '').toLowerCase();
  const catId = Number(p.categoryId || 0);
  const hasRom = Array.isArray(p.variants) && p.variants.some(v => (v.romGb || 0) >= 32);

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

interface HeroBannerSlide {
  id: number;
  title: string;
  subtitle: string;
  tag: string;
  bottomBadge: string;
  bottomText: string;
  minioUrl: string;
  fallbackUrl: string;
  targetUrl: string;
  ctaText: string;
  type: 'FLASH_SALE' | 'LAPTOP_PC';
  icon: typeof Zap;
}

const HERO_BANNERS: HeroBannerSlide[] = [
  {
    id: 1,
    title: 'GIỜ VÀNG FLASH SALE',
    subtitle: 'Săn deal cực hot – Đón công nghệ đỉnh cao',
    tag: 'Ưu Đãi Hôm Nay',
    bottomBadge: '⚡ FLASH SALE',
    bottomText: 'Giảm sốc tới 50% • Cam kết chính hãng 100% • Khóa giữ giá 30 phút',
    minioUrl: 'http://localhost:9000/banner/banner1.png',
    fallbackUrl: '/banners/banner1.png',
    targetUrl: '/products?sale=true',
    ctaText: 'Săn Deal Flash Sale',
    type: 'FLASH_SALE',
    icon: Zap,
  },
  {
    id: 2,
    title: 'LAPTOP & PC CAO CẤP',
    subtitle: 'Hiệu năng vượt trội • Kết nối tương lai',
    tag: 'Đón Đầu Công Nghệ',
    bottomBadge: '🚀 HIỆU NĂNG ĐỈNH CAO',
    bottomText: 'Trả góp 0% lãi suất • Bảo hành 24 tháng • Tặng quà tới 2.000.000đ',
    minioUrl: 'http://localhost:9000/banner/banner2.png',
    fallbackUrl: '/banners/banner2.png',
    targetUrl: '/products?category=laptop',
    ctaText: 'Khám Phá Laptop & PC',
    type: 'LAPTOP_PC',
    icon: Laptop,
  },
];

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);

  // Flash Sale Auto-slide & Navigation Controls
  const flashSaleSliderRef = useRef<HTMLDivElement>(null);
  const [isFlashSalePaused, setIsFlashSalePaused] = useState(false);
  const [isFlashSaleInView, setIsFlashSaleInView] = useState(false);
  const [flashSaleEndAt, setFlashSaleEndAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // API 4.2 & API 6.1: Nạp sản phẩm, thương hiệu, Flash Sale và chiến dịch khuyến mãi đang diễn ra
      const [allProducts, allBrands, featuredFlashSale, activePromos, topSellers] = await Promise.all([
        productService.getProducts(),
        productService.getBrands(),
        productService.getFeaturedProducts('FLASH_SALE', 12).catch(() => []),
        promotionService.getActivePromotions().catch(() => []),
        productService.getFeaturedProducts('BEST_SELLER', 24).catch(() => []),
      ]);
      let mergedProducts = [...allProducts];
      // Backend fallback trả best-seller (không có promotion) khi không có chiến dịch đang chạy -> bỏ qua
      if (featuredFlashSale && featuredFlashSale.length > 0) {
        featuredFlashSale.filter(fp => fp.isFlashSale).forEach(fp => {
          const idx = mergedProducts.findIndex(p => p.productId === fp.productId);
          if (idx !== -1) {
            mergedProducts[idx] = { ...mergedProducts[idx], isFlashSale: true };
          } else {
            mergedProducts.unshift({ ...fp, isFlashSale: true });
          }
        });
      }
      if (activePromos && activePromos.length > 0) {
        const soonestEnd = activePromos
          .map(p => p.endAt)
          .filter(d => Boolean(d) && new Date(d).getTime() > Date.now())
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
        if (soonestEnd) setFlashSaleEndAt(soonestEnd);
        mergedProducts = await applyActivePromotionsToProducts(mergedProducts, activePromos);
      }
      setProducts(mergedProducts);
      setBrands(allBrands);
      setBestSellers(topSellers);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Hero Banner Auto-slide & Navigation Controls
  const [currentBannerSlide, setCurrentBannerSlide] = useState(0);
  const [isBannerHovered, setIsBannerHovered] = useState(false);

  useEffect(() => {
    if (isBannerHovered) return;
    const timer = setInterval(() => {
      setCurrentBannerSlide(prev => (prev + 1) % HERO_BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isBannerHovered]);

  const handlePrevBanner = () => {
    setCurrentBannerSlide(prev => (prev === 0 ? HERO_BANNERS.length - 1 : prev - 1));
  };

  const handleNextBanner = () => {
    setCurrentBannerSlide(prev => (prev + 1) % HERO_BANNERS.length);
  };

  const flashSaleProducts = products.filter(p => p.isFlashSale);
  const flashCountdown = getCountdownParts(flashSaleEndAt, nowMs);

  useEffect(() => {
    if (flashSaleProducts.length === 0) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [flashSaleProducts.length]);
  // Phân bổ sản phẩm theo từng ngành hàng cốt lõi: Chọn lọc đúng 4 sản phẩm NỔI BẬT & BÁN CHẠY NHẤT
  const categorySections = useMemo(() => {
    const baseList = selectedBrand === 'all'
      ? products
      : products.filter(p => p.brandName.toLowerCase() === selectedBrand.toLowerCase());

    const bestSellerIds = new Set(bestSellers.map(b => b.productId));

    // Thuật toán xếp hạng độ Nổi Bật & Bán Chạy thực tế:
    // 1. Nằm trong Top Best Seller từ hệ sinh thái đơn hàng (backend query): +10.000 điểm
    // 2. Thuộc chiến dịch Flash Sale đang chạy: +5.000 điểm
    // 3. Số lượng bán thực tế (soldCount): +soldCount * 10 điểm
    // 4. Điểm đánh giá thực tế từ khách (rating): +rating * 20 điểm
    // 5. Tổng lượt review uy tín: +reviewCount
    const getHotScore = (p: Product) => {
      let score = 0;
      if (bestSellerIds.has(p.productId)) score += 10000;
      if (p.isFlashSale) score += 5000;
      score += (p.soldCount || 0) * 10;
      score += (p.rating || 0) * 20;
      score += (p.reviewCount || 0);
      return score;
    };

    const sortByTopSelling = (list: Product[]) => {
      return [...list].sort((a, b) => getHotScore(b) - getHotScore(a));
    };

    const phones = sortByTopSelling(baseList.filter(p => classifyProductCategory(p) === 'phone'));
    const laptops = sortByTopSelling(baseList.filter(p => classifyProductCategory(p) === 'laptop'));
    const tablets = sortByTopSelling(baseList.filter(p => classifyProductCategory(p) === 'tablet'));
    const accessories = sortByTopSelling(baseList.filter(p => classifyProductCategory(p) === 'accessory'));

    return [
      {
        id: 'phone',
        title: 'Điện thoại nổi bật & Bán chạy',
        subtitle: 'Smartphone chính hãng 100% • Bảo hành 12 tháng • Hỗ trợ trả góp 0%',
        icon: Smartphone,
        targetUrl: '/products?category=phone',
        ctaText: 'Xem tất cả Điện thoại',
        totalCount: phones.length,
        items: phones.slice(0, 4),
      },
      {
        id: 'laptop',
        title: 'Laptop & Máy tính xách tay',
        subtitle: 'Laptop văn phòng mỏng nhẹ, đồ họa & gaming hiệu năng đỉnh cao',
        icon: Laptop,
        targetUrl: '/products?category=laptop',
        ctaText: 'Xem tất cả Laptop',
        totalCount: laptops.length,
        items: laptops.slice(0, 4),
      },
      {
        id: 'tablet',
        title: 'Máy tính bảng (Tablet)',
        subtitle: 'Màn hình sắc nét, học tập, làm việc & giải trí sáng tạo không giới hạn',
        icon: Tablet,
        targetUrl: '/products?category=tablet',
        ctaText: 'Xem tất cả Tablet',
        totalCount: tablets.length,
        items: tablets.slice(0, 4),
      },
      {
        id: 'accessory',
        title: 'Phụ kiện công nghệ chính hãng',
        subtitle: 'Củ cáp sạc nhanh GaN, tai nghe True Wireless, pin sạc & loa Bluetooth',
        icon: Headphones,
        targetUrl: '/products?category=accessory',
        ctaText: 'Xem tất cả Phụ kiện',
        totalCount: accessories.length,
        items: accessories.slice(0, 4),
      },
    ].filter(sec => sec.items.length > 0);
  }, [products, selectedBrand, bestSellers]);

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
      
      {/* 1. HERO BANNER SECTION - 2 Banner MinIO lướt tự động, full viền không bị đen hai bên, thanh CTA cùng hàng với text */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div 
          className="relative rounded-xxxl overflow-hidden border border-hairline-soft/40 shadow-xl group bg-[#06142e] select-none"
          onMouseEnter={() => setIsBannerHovered(true)}
          onMouseLeave={() => setIsBannerHovered(false)}
        >
          {/* Banner Slides Carousel Track */}
          <div 
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentBannerSlide * 100}%)` }}
          >
            {HERO_BANNERS.map((banner) => {
              const Icon = banner.icon;
              return (
                <div
                  key={banner.id}
                  className="w-full flex-shrink-0 relative aspect-[16/9] sm:aspect-[1.85/1] md:aspect-[1.95/1] flex items-center justify-center bg-[#06142e] overflow-hidden"
                >
                  {/* Ảnh Banner MinIO phủ đều viền (object-cover) */}
                  <Link
                    to={banner.targetUrl}
                    aria-label={banner.title}
                    className="absolute inset-0 z-0 cursor-pointer"
                  >
                    <img
                      src={banner.minioUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover object-center select-none transition-transform duration-700 group-hover:scale-[1.015]"
                      onError={(e) => {
                        if (e.currentTarget.src !== banner.fallbackUrl) {
                          e.currentTarget.src = banner.fallbackUrl;
                        }
                      }}
                    />
                  </Link>

                  {/* Thanh thông điệp & Nút CTA rực rỡ cùng hàng ở đáy banner */}
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-6 sm:right-6 md:bottom-5 md:left-8 md:right-8 z-10 pointer-events-auto">
                    <div className="bg-slate-950/80 hover:bg-slate-950/90 backdrop-blur-md rounded-2xl sm:rounded-full px-4 py-2.5 sm:px-6 sm:py-3 border border-white/20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 transition-all">
                      
                      {/* Chữ cùng hàng với CTA: Badge + Thông điệp ưu đãi nổi bật */}
                      <div className="flex items-center gap-2.5 sm:gap-3 text-white flex-1 min-w-0 w-full md:w-auto">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/20 shadow-inner ${
                          banner.type === 'FLASH_SALE' ? 'bg-amber-500/30 text-amber-300' : 'bg-cyan-500/30 text-cyan-300'
                        }`}>
                          <Icon size={17} className={banner.type === 'FLASH_SALE' ? 'fill-amber-300 text-amber-300' : 'text-cyan-300'} />
                        </span>

                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-xs shrink-0 ${
                            banner.type === 'FLASH_SALE'
                              ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500'
                              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500'
                          }`}>
                            {banner.bottomBadge}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-white/95 truncate">
                            {banner.bottomText}
                          </span>
                        </div>
                      </div>

                      {/* Chấm phân trang (Dots) nằm cân bằng ngay trên thanh điều khiển */}
                      <div className="hidden lg:flex items-center gap-2 px-3 shrink-0">
                        {HERO_BANNERS.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentBannerSlide(idx);
                            }}
                            aria-label={`Chuyển tới slide ${idx + 1}`}
                            className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                              currentBannerSlide === idx 
                                ? 'w-7 sm:w-8 bg-white shadow-md' 
                                : 'w-2 sm:w-2.5 bg-white/40 hover:bg-white/70'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Nút CTA cực kỳ nổi bật với Gradient rực rỡ & Hiệu ứng viền sáng */}
                      <div className="shrink-0 w-full md:w-auto">
                        <Link
                          to={banner.targetUrl}
                          className={`inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-black text-xs sm:text-sm md:text-base text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 uppercase tracking-wide cursor-pointer border border-white/30 ${
                            banner.type === 'FLASH_SALE'
                              ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 hover:from-red-500 hover:to-amber-300 shadow-orange-500/50 ring-2 ring-amber-300/70 animate-pulse'
                              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 shadow-cyan-500/50 ring-2 ring-cyan-300/70'
                          }`}
                        >
                          <Icon size={18} className={banner.type === 'FLASH_SALE' ? 'fill-white text-white' : 'text-white'} />
                          <span>{banner.ctaText}</span>
                          <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls: Previous / Next Arrows */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePrevBanner();
            }}
            aria-label="Banner trước"
            className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 shadow-lg cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNextBanner();
            }}
            aria-label="Banner tiếp theo"
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 shadow-lg cursor-pointer"
          >
            <ChevronRight size={22} />
          </button>

          {/* Chấm phân trang cho mobile/tablet hiển thị tinh tế ở góc trên phải */}
          <div className="lg:hidden absolute top-3 right-3 sm:top-4 sm:right-5 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
            {HERO_BANNERS.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentBannerSlide(idx);
                }}
                aria-label={`Chuyển tới slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentBannerSlide === idx 
                    ? 'w-6 bg-white shadow-md' 
                    : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>
      </section>



      {/* 3. FLASH SALE SECTION (DESIGN-meta card-promo-strip) */}
      {flashSaleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-[#0b0f19] dark:bg-[#111827] border border-amber-500/20 rounded-2xl sm:rounded-xxxl p-4 sm:p-8 text-white relative overflow-hidden">
            
            {/* Flash Sale Header with Countdown & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Zap size={20} className="fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
                      GIỜ VÀNG FLASH SALE
                    </h2>
                    <span className="text-[11px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Hôm nay
                    </span>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">
                    Số lượng giới hạn, khóa giữ chỗ kho khả dụng 30 phút ngay khi đặt mua
                  </p>
                </div>
              </div>

              {/* Digital Countdown Timer (Tone màu Vàng Hổ Phách sang trọng, rực rỡ cả Sáng & Tối) */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-2 sm:gap-2.5 text-xs bg-amber-400/15 border border-amber-400/40 px-3 sm:px-3.5 py-1.5 rounded-full backdrop-blur-xs shadow-xs">
                  <span className="text-amber-300 font-bold uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Kết thúc trong:</span>
                  <div className="flex items-center gap-1 font-mono font-black text-xs sm:text-sm">
                    <span className="bg-amber-400 text-slate-950 px-1.5 sm:px-2 py-0.5 rounded font-mono shadow-xs">{flashCountdown.hours}</span>
                    <span className="text-amber-400 font-black animate-pulse">:</span>
                    <span className="bg-amber-400 text-slate-950 px-1.5 sm:px-2 py-0.5 rounded font-mono shadow-xs">{flashCountdown.minutes}</span>
                    <span className="text-amber-400 font-black animate-pulse">:</span>
                    <span className="bg-amber-400 text-slate-950 px-1.5 sm:px-2 py-0.5 rounded font-mono shadow-xs">{flashCountdown.seconds}</span>
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

      {/* 4. MAIN CATEGORY SECTIONS (Từng ngành hàng: 4 sản phẩm bán chạy nhất + nút Xem tất cả) */}
      <div className="space-y-12 sm:space-y-16">
        {isLoading ? (
          <div className="space-y-12 sm:space-y-16">
            {[1, 2].map((idx) => (
              <section key={idx} className="max-w-7xl mx-auto px-4 sm:px-6 animate-pulse">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 pb-4 border-b border-hairline-soft">
                  <div className="space-y-2">
                    <div className="h-6 w-48 bg-surface-soft rounded-lg" />
                    <div className="h-4 w-72 bg-surface-soft rounded" />
                  </div>
                  <div className="h-9 w-32 bg-surface-soft rounded-full" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : categorySections.length === 0 ? (
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="py-16 bg-surface-soft rounded-xxxl border border-hairline-soft text-center text-steel text-sm px-4">
              <p className="text-ink-deep font-bold text-base">Không tìm thấy sản phẩm nào</p>
              <p className="text-steel text-xs mt-1">Vui lòng chọn thương hiệu khác để xem thêm thiết bị.</p>
              <button
                type="button"
                onClick={() => setSelectedBrand('all')}
                className="mt-4 px-4 py-2 rounded-full text-xs font-bold bg-ink-deep text-canvas hover:opacity-90 transition-opacity"
              >
                Xem tất cả thương hiệu
              </button>
            </div>
          </section>
        ) : (
          categorySections.map((sec) => {
            const Icon = sec.icon;
            return (
              <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Block Header: Tiêu đề + Brand tags + Nút Xem tất cả */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 pb-4 border-b border-hairline-soft">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-medium text-ink-deep tracking-tight flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon size={20} />
                      </span>
                      <span>{sec.title}</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-steel mt-1">
                      {sec.subtitle}
                    </p>
                  </div>

                  {/* Nút Xem tất cả */}
                  <div className="flex items-center justify-end">
                    <Link
                      to={sec.targetUrl}
                      className="text-xs sm:text-sm font-bold text-primary hover:text-primary-deep inline-flex items-center gap-1 group bg-primary/5 hover:bg-primary/10 px-3.5 py-1.5 rounded-full transition-all shrink-0"
                    >
                      <span>{sec.ctaText}</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* 4 Cards Grid (Chuẩn 4 cột Desktop - 2 cột Mobile) */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 items-stretch">
                  {sec.items.map((p) => (
                    <ProductCard key={p.productId} product={p} />
                  ))}
                </div>

                {/* Nút Xem tất cả cho Mobile nằm gọn ở đáy thẻ */}
                <div className="mt-5 md:hidden text-center">
                  <Link
                    to={sec.targetUrl}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl border border-hairline-soft bg-surface-soft/60 hover:bg-surface-soft text-ink font-bold text-xs transition-colors"
                  >
                    <span>Xem tất cả {sec.totalCount} {sec.title.toLowerCase()}</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </section>
            );
          })
        )}
      </div>

    </div>
  );
};
