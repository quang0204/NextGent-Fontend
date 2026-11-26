import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Sparkles,
  Tag,
  Gift,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { categoryService, CategoryItem } from '../../services/categoryService';
import { promotionService, ActivePromotion, ValidVoucherItem } from '../../services/promotionService';
import { formatVND } from '../common/PriceDisplay';
import { Product, Brand } from '../../types/product';
import { resolveBrandLogo } from '../../utils/brandUtils';
import {
  DEFAULT_ROOT_CATEGORIES,
  resolveLegacyCategoryKey,
  getRootCategoryPath,
  collectCategoryTreeIds,
  getCategoryIcon,
  productMatchesCategoryBranch,
  rankHotProducts,
} from '../../utils/categoryUtils';

const PRICE_RANGES_BY_LEGACY_KEY: Record<string, { label: string; min: number; max: number }[]> = {
  phone: [
    { label: 'Dưới 5 triệu', min: 0, max: 5000000 },
    { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
    { label: '10 - 15 triệu', min: 10000000, max: 15000000 },
    { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
    { label: 'Trên 20 triệu', min: 20000000, max: 100000000 },
  ],
  laptop: [
    { label: 'Dưới 15 triệu', min: 0, max: 15000000 },
    { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
    { label: '20 - 30 triệu', min: 20000000, max: 30000000 },
    { label: 'Trên 30 triệu', min: 30000000, max: 100000000 },
  ],
  tablet: [
    { label: 'Dưới 6 triệu', min: 0, max: 6000000 },
    { label: '6 - 12 triệu', min: 6000000, max: 12000000 },
    { label: '12 - 20 triệu', min: 12000000, max: 20000000 },
    { label: 'Trên 20 triệu', min: 20000000, max: 100000000 },
  ],
  accessory: [
    { label: 'Dưới 300.000₫', min: 0, max: 300000 },
    { label: '300k - 1 triệu', min: 300000, max: 1000000 },
    { label: '1 - 3 triệu', min: 1000000, max: 3000000 },
    { label: 'Trên 3 triệu', min: 3000000, max: 50000000 },
  ],
};

const DEFAULT_PRICE_RANGES = [
  { label: 'Dưới 5 triệu', min: 0, max: 5000000 },
  { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
  { label: '10 - 20 triệu', min: 10000000, max: 20000000 },
  { label: 'Trên 20 triệu', min: 20000000, max: 100000000 },
];

export const CategoryMegaMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<number | 'sale'>(DEFAULT_ROOT_CATEGORIES[0].categoryId);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // State nạp động từ DB
  const [products, setProducts] = useState<Product[]>([]);
  const [bestSellerIds, setBestSellerIds] = useState<Set<number>>(new Set());
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<CategoryItem[]>(DEFAULT_ROOT_CATEGORIES);
  const [activePromotions, setActivePromotions] = useState<ActivePromotion[]>([]);
  const [validVouchers, setValidVouchers] = useState<ValidVoucherItem[]>([]);

  // Đóng khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Nạp dữ liệu danh mục, thương hiệu, sản phẩm, khuyến mãi từ DB
  useEffect(() => {
    let isMounted = true;
    const fetchMegaMenuData = async () => {
      try {
        const [allProds, allBrands, catsRes, promos, vouchers, topSellers] = await Promise.all([
          productService.getProducts().catch(() => []),
          productService.getBrands().catch(() => []),
          categoryService.getCategories(false).catch(() => ({ data: [] })),
          promotionService.getActivePromotions().catch(() => []),
          promotionService.getValidVouchers().catch(() => []),
          productService.getFeaturedProducts('BEST_SELLER', 24).catch(() => []),
        ]);

        if (!isMounted) return;

        if (Array.isArray(allProds) && allProds.length > 0) {
          setProducts(allProds);
        }
        if (Array.isArray(topSellers) && topSellers.length > 0) {
          setBestSellerIds(new Set(topSellers.map((p) => p.productId)));
        }
        if (Array.isArray(allBrands) && allBrands.length > 0) {
          setBrands(allBrands);
        }
        if (catsRes && Array.isArray(catsRes.data) && catsRes.data.length > 0) {
          const visibleRoots = catsRes.data.filter((c) => c.isVisible !== false);
          if (visibleRoots.length > 0) {
            setCategoriesTree(visibleRoots);
            setActiveTab((prev) =>
              prev === 'sale' || visibleRoots.some((c) => c.categoryId === prev)
                ? prev
                : visibleRoots[0].categoryId
            );
          }
        }
        if (Array.isArray(promos) && promos.length > 0) {
          setActivePromotions(promos);
        }
        if (Array.isArray(vouchers) && vouchers.length > 0) {
          setValidVouchers(vouchers);
        }
      } catch (err) {
        console.warn('[CategoryMegaMenu] Tải dữ liệu từ DB:', err);
      }
    };

    fetchMegaMenuData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const activeRootCat = useMemo(() => {
    if (activeTab === 'sale') return null;
    return categoriesTree.find((c) => c.categoryId === activeTab) || categoriesTree[0] || null;
  }, [activeTab, categoriesTree]);

  const hasBrandCategoryMapping = useMemo(
    () => brands.some((b) => Array.isArray(b.categoryIds) && b.categoryIds.length > 0),
    [brands]
  );

  const activeCategoryBrands = useMemo(() => {
    if (!activeRootCat) return [];
    const list = brands.filter(
      (b) => Array.isArray(b.categoryIds) && b.categoryIds.includes(activeRootCat.categoryId)
    );
    if (list.length > 0) return list;
    return hasBrandCategoryMapping ? [] : brands;
  }, [activeRootCat, brands, hasBrandCategoryMapping]);

  const activeBranchProducts = useMemo(() => {
    if (!activeRootCat) return [];
    const branchIds = collectCategoryTreeIds(activeRootCat);
    const matched = products.filter((p) =>
      productMatchesCategoryBranch(p, activeRootCat.categoryId, branchIds)
    );
    return rankHotProducts(matched, bestSellerIds);
  }, [activeRootCat, products, bestSellerIds]);

  const activePriceRanges = useMemo(() => {
    if (!activeRootCat) return DEFAULT_PRICE_RANGES;
    const legacyKey = resolveLegacyCategoryKey(activeRootCat);
    return (legacyKey && PRICE_RANGES_BY_LEGACY_KEY[legacyKey]) || DEFAULT_PRICE_RANGES;
  }, [activeRootCat]);

  const formatVoucherDiscount = (vc: ValidVoucherItem): string => {
    if (vc.discountType === 'PERCENT' || vc.discountType === 'PERCENTAGE') {
      return `Giảm ${vc.discountValue}%`;
    }
    return `Giảm ${formatVND(vc.discountValue)}`;
  };

  const activeRootIcon = activeRootCat ? getCategoryIcon(activeRootCat) : LayoutGrid;
  const ActiveRootIcon = activeRootIcon;
  const activeRootPath = activeRootCat ? getRootCategoryPath(activeRootCat) : '/products';
  const activeLegacyKey = activeRootCat ? resolveLegacyCategoryKey(activeRootCat) : null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Nút trigger Danh mục */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className={`hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
          isOpen ? 'bg-ink-deep text-canvas border-ink-deep shadow-xs' : 'bg-surface-soft hover:bg-hairline-soft/60 text-ink border-hairline-soft'
        }`}
      >
        <LayoutGrid size={15} className={isOpen ? 'text-canvas' : 'text-primary'} />
        <span>Danh mục</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Flyout Mega Menu Container */}
      {isOpen && (
        <div
          onMouseLeave={() => setIsOpen(false)}
          className="absolute left-0 top-full pt-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="bg-canvas border border-hairline-soft rounded-2xl shadow-summary flex overflow-hidden w-[820px] lg:w-[940px] text-xs max-h-[520px]">
            {/* CỘT TRÁI: Danh mục gốc render động từ GET /api/v1/categories */}
            <div className="w-60 bg-surface-soft/60 border-r border-hairline-soft p-2.5 space-y-1 flex-shrink-0 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold text-steel uppercase tracking-wider">
                Ngành hàng kinh doanh
              </div>

              {categoriesTree.map((cat) => {
                const Icon = getCategoryIcon(cat);
                const isActive = activeTab !== 'sale' && activeRootCat?.categoryId === cat.categoryId;

                return (
                  <button
                    key={cat.categoryId}
                    type="button"
                    onMouseEnter={() => setActiveTab(cat.categoryId)}
                    onClick={() => handleNavigate(getRootCategoryPath(cat))}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all text-left ${
                      isActive ? 'bg-canvas text-primary shadow-xs font-black border border-hairline-soft' : 'text-charcoal hover:bg-canvas/70 hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-primary/10 text-primary' : 'bg-surface-soft text-steel'}`}>
                        <Icon size={15} />
                      </div>
                      <span className="truncate">{cat.name}</span>
                    </div>

                    <ChevronRight size={13} className={`shrink-0 ${isActive ? 'text-primary' : 'text-hairline'}`} />
                  </button>
                );
              })}

              {/* Khuyến mãi Flash Sale */}
              <button
                type="button"
                onMouseEnter={() => setActiveTab('sale')}
                onClick={() => handleNavigate('/products?sale=true')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all text-left ${
                  activeTab === 'sale' ? 'bg-canvas text-primary shadow-xs font-black border border-hairline-soft' : 'text-charcoal hover:bg-canvas/70 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'sale' ? 'bg-primary/10 text-primary' : 'bg-surface-soft text-steel'}`}>
                    <Flame size={15} />
                  </div>
                  <span className="truncate">Khuyến mãi Flash Sale</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                  <ChevronRight size={13} className={activeTab === 'sale' ? 'text-primary' : 'text-hairline'} />
                </div>
              </button>

              {/* Hỗ trợ & Hỏi đáp FAQ */}
              <div className="pt-2 mt-2 border-t border-hairline-soft">
                <button
                  type="button"
                  onClick={() => handleNavigate('/faq')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-steel hover:text-ink-deep hover:bg-canvas transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle size={15} className="text-primary" />
                    <span>Hỏi đáp & CSKH (FAQ)</span>
                  </div>
                  <ChevronRight size={13} className="text-hairline" />
                </button>
              </div>
            </div>

            {/* CỘT PHẢI: Nội dung Mega Menu chi tiết theo danh mục gốc đang chọn */}
            <div className="flex-1 p-6 overflow-y-auto bg-canvas">
              {activeTab !== 'sale' && activeRootCat && (
                <div className="grid grid-cols-2 gap-8">
                  {/* Cột 1: Thương hiệu, Danh mục con & Khoảng giá */}
                  <div className="space-y-4">
                    {activeCategoryBrands.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                          <ActiveRootIcon size={14} className="text-primary" />
                          <span>Thương hiệu {activeRootCat.name}</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {activeCategoryBrands.map((brand) => {
                            const logoSrc = resolveBrandLogo(brand.logoUrl, brand.name);
                            return (
                              <button
                                key={brand.brandId}
                                type="button"
                                onClick={() => handleNavigate(`${activeRootPath}&brand=${encodeURIComponent(brand.name)}`)}
                                className="px-2.5 py-1.5 rounded-lg bg-surface-soft/60 hover:bg-surface-soft hover:text-primary font-medium text-left truncate transition flex items-center gap-1.5"
                              >
                                {logoSrc && (
                                  <span className="w-5 h-5 rounded brand-logo-plate border border-hairline-soft/80 flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                                    <img
                                      src={logoSrc}
                                      alt={brand.name}
                                      className="max-w-full max-h-full object-contain"
                                      onError={(e) => {
                                        (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </span>
                                )}
                                <span className="truncate">{brand.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeRootCat.children && activeRootCat.children.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <Layers size={12} className="text-steel" />
                          <span>Danh mục con</span>
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {activeRootCat.children.map((sub) => (
                            <button
                              key={sub.categoryId}
                              type="button"
                              onClick={() =>
                                handleNavigate(
                                  activeLegacyKey
                                    ? `/products?category=${activeLegacyKey}&categoryId=${sub.categoryId}`
                                    : `/products?categoryId=${sub.categoryId}`
                                )
                              }
                              className="px-2.5 py-1 rounded-md bg-surface-soft text-charcoal hover:text-primary text-[11px] font-medium transition"
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-hairline-soft space-y-2">
                      <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider">
                        Mức giá {activeRootCat.name}
                      </h5>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {activePriceRanges.map((price) => (
                          <button
                            key={price.label}
                            type="button"
                            onClick={() => handleNavigate(`${activeRootPath}&minPrice=${price.min}&maxPrice=${price.max}`)}
                            className="text-left text-steel hover:text-primary hover:underline py-0.5 truncate"
                          >
                            • {price.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Sản phẩm nổi bật theo nhánh danh mục & Xem tất cả */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Sparkles size={14} className="text-attention" />
                      <span>{activeRootCat.name} nổi bật ⚡</span>
                    </h4>
                    <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
                      {activeBranchProducts.length > 0 ? (
                        activeBranchProducts.slice(0, 8).map((item) => (
                          <button
                            key={item.productId}
                            type="button"
                            onClick={() => handleNavigate(`/product/${item.productId}`)}
                            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-soft text-left group transition"
                          >
                            <span className="group-hover:text-primary font-medium truncate pr-2">{item.name}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {item.isFlashSale ? (
                                <span className="text-[9px] font-bold bg-critical/10 text-critical border border-critical/30 px-1.5 py-0.5 rounded">
                                  Flash Sale
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold font-mono text-primary">
                                  {formatVND(item.variants?.[0]?.salePrice || item.variants?.[0]?.listPrice || 0)}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 rounded-xl bg-surface-soft text-steel text-center text-[11px]">
                          Chưa có sản phẩm nổi bật trong danh mục này
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate(activeRootPath)}
                      className="w-full py-2 bg-ink-deep hover:bg-charcoal text-canvas text-[11px] font-bold rounded-lg text-center transition"
                    >
                      Xem tất cả {activeRootCat.name} &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB KHUYẾN MÃI FLASH SALE */}
              {activeTab === 'sale' && (
                <div className="grid grid-cols-3 gap-6">
                  {/* Chiến dịch Flash Sale từ DB (Chỉ xem, không click) */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Flame size={14} className="text-critical" />
                      <span>Chiến dịch Flash Sale HOT 🔥</span>
                    </h4>
                    <div className="space-y-2">
                      {activePromotions.length > 0 ? (
                        activePromotions.map((sale) => (
                          <div
                            key={sale.promotionId}
                            className="w-full text-left p-2.5 rounded-xl bg-critical/5 border border-critical/20 select-none"
                          >
                            <div className="font-bold text-critical text-[11px] flex items-center justify-between">
                              <span>{sale.name}</span>
                              <span className="text-[9px] bg-critical text-canvas px-1.5 py-0.5 rounded font-black">HOT</span>
                            </div>
                            {sale.description && (
                              <div className="text-[10px] text-steel mt-0.5 line-clamp-2">{sale.description}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 rounded-xl bg-surface-soft text-steel text-center text-[11px]">
                          Hiện chưa có chiến dịch Flash Sale nào đang hoạt động
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mã Voucher độc quyền từ DB */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Tag size={14} className="text-primary" />
                      <span>Voucher độc quyền hôm nay</span>
                    </h4>
                    <div className="space-y-2">
                      {validVouchers.length > 0 ? (
                        validVouchers.map((vc) => (
                          <div
                            key={vc.voucherId}
                            className="p-2.5 rounded-xl border border-dashed border-primary/40 bg-surface-soft/60 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-mono font-bold text-primary text-xs bg-canvas px-2 py-0.5 rounded border border-primary/20">
                                {vc.code}
                              </span>
                              <div className="text-[10px] text-steel mt-1">
                                Đơn từ {formatVND(vc.minOrderValue || 0)}
                              </div>
                            </div>
                            <span className="font-bold text-ink-deep text-xs">{formatVoucherDiscount(vc)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 rounded-xl bg-surface-soft text-steel text-center text-[11px]">
                          Tạm thời chưa có mã giảm giá mới
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Đặc quyền mua sắm & chính sách */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Gift size={14} className="text-success" />
                      <span>Chính sách & Đặc quyền</span>
                    </h4>
                    <div className="space-y-2 text-[11px] text-charcoal">
                      <div className="p-2.5 rounded-lg bg-surface-soft space-y-1">
                        <strong className="text-ink-deep block">🛡️ Bảo hành 1 đổi 1 trong 30 ngày</strong>
                        <p className="text-[10px] text-steel">Nếu phát sinh lỗi phần cứng từ nhà sản xuất.</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-soft space-y-1">
                        <strong className="text-ink-deep block">💳 Trả góp 0% lãi suất</strong>
                        <p className="text-[10px] text-steel">Hỗ trợ qua thẻ tín dụng hơn 25 ngân hàng liên kết.</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-soft space-y-1">
                        <strong className="text-ink-deep block">🚀 Giao hàng hỏa tốc trong 2 giờ</strong>
                        <p className="text-[10px] text-steel">Nội thành Hà Nội & TP. Hồ Chí Minh.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?sale=true')}
                      className="w-full py-2 bg-critical hover:bg-critical/90 text-canvas text-[11px] font-bold rounded-lg text-center transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Xem tất cả sản phẩm Flash Sale</span>
                      <ChevronRight size={13} />
                    </button>

                    <div className="w-full py-1.5 bg-critical/5 border border-critical/15 text-critical text-[10px] font-medium rounded-lg text-center select-none">
                      Ưu đãi Flash Sale tự động áp dụng khi thanh toán
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
