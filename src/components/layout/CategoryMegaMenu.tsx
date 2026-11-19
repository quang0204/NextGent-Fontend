import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  Laptop, 
  Tablet, 
  Headphones, 
  Flame, 
  ChevronRight, 
  ChevronDown, 
  LayoutGrid, 
  Sparkles,
  Tag,
  Gift,
  HelpCircle,
  Layers
} from 'lucide-react';
import { productService } from '../../services/productService';
import { categoryService, CategoryItem } from '../../services/categoryService';
import { promotionService, ActivePromotion, ValidVoucherItem } from '../../services/promotionService';
import { formatVND } from '../common/PriceDisplay';
import { Product, Brand } from '../../types/product';
import { resolveBrandLogo } from '../../utils/brandUtils';

export interface MegaMenuItem {
  id: 'phone' | 'laptop' | 'tablet' | 'accessory' | 'sale';
  label: string;
  icon: React.ElementType;
  isHot?: boolean;
}

const FALLBACK_CATEGORIES: CategoryItem[] = [
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
    ]
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
    ]
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
    ]
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
    ]
  }
];

export const CategoryMegaMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'phone' | 'laptop' | 'tablet' | 'accessory' | 'sale'>('phone');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // State nạp động từ DB
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<CategoryItem[]>(FALLBACK_CATEGORIES);
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
        const [allProds, allBrands, catsRes, promos, vouchers] = await Promise.all([
          productService.getProducts().catch(() => []),
          productService.getBrands().catch(() => []),
          categoryService.getCategories(false).catch(() => ({ data: [] })),
          promotionService.getActivePromotions().catch(() => []),
          promotionService.getValidVouchers().catch(() => []),
        ]);

        if (!isMounted) return;

        if (Array.isArray(allProds) && allProds.length > 0) {
          setProducts(allProds);
        }
        if (Array.isArray(allBrands) && allBrands.length > 0) {
          setBrands(allBrands);
        }
        if (catsRes && Array.isArray(catsRes.data) && catsRes.data.length > 0) {
          setCategoriesTree(catsRes.data);
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

  const categories: MegaMenuItem[] = [
    { id: 'phone', label: 'Điện thoại, Smartphone', icon: Smartphone },
    { id: 'laptop', label: 'Laptop, Máy tính xách tay', icon: Laptop },
    { id: 'tablet', label: 'Máy tính bảng (Tablet)', icon: Tablet },
    { id: 'accessory', label: 'Phụ kiện di động', icon: Headphones },
    { id: 'sale', label: 'Khuyến mãi Flash Sale', icon: Flame, isHot: true },
  ];

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  // Phân loại sản phẩm theo ngành hàng từ dữ liệu DB
  const productsByCategory = useMemo(() => {
    const map: Record<'phone' | 'laptop' | 'tablet' | 'accessory', Product[]> = {
      phone: [],
      laptop: [],
      tablet: [],
      accessory: [],
    };

    const classify = (p: Product): 'phone' | 'laptop' | 'tablet' | 'accessory' => {
      const pName = (p.name || '').toLowerCase();
      const cName = (p.categoryName || '').toLowerCase();
      const catId = Number(p.categoryId || 0);

      if (
        catId === 4 ||
        pName.includes('tai nghe') || pName.includes('airpods') || pName.includes('earbuds') ||
        pName.includes('củ sạc') || pName.includes('sạc dự phòng') || pName.includes('pin dự phòng') ||
        pName.includes('cáp') || pName.includes('dây sạc') || pName.includes('loa') ||
        pName.includes('ốp lưng') || pName.includes('bao da') || pName.includes('kính cường lực') ||
        pName.includes('magsafe') || pName.includes('anker') || pName.includes('marshall') ||
        cName.includes('phụ kiện') || cName.includes('âm thanh')
      ) {
        return 'accessory';
      }

      if (
        catId === 3 ||
        pName.includes('laptop') || pName.includes('lap top') || pName.includes('macbook') ||
        pName.includes('mac book') || pName.includes('thinkpad') || pName.includes('zenbook') ||
        pName.includes('vivobook') || pName.includes('legion') || pName.includes('asus rog') ||
        cName.includes('laptop') || cName.includes('máy tính xách tay')
      ) {
        return 'laptop';
      }

      if (
        catId === 2 ||
        pName.includes('ipad') || pName.includes('galaxy tab') || pName.includes('samsung tab') ||
        pName.includes('xiaomi pad') || pName.includes('redmi pad') || pName.includes('matepad') ||
        cName.includes('máy tính bảng') || cName.includes('tablet')
      ) {
        return 'tablet';
      }

      if (
        catId === 1 ||
        pName.includes('iphone') || pName.includes('điện thoại') || pName.includes('smartphone') ||
        pName.includes('galaxy s') || pName.includes('galaxy z') || pName.includes('galaxy a') ||
        pName.includes('xiaomi') || pName.includes('oppo') || pName.includes('vivo') ||
        cName.includes('điện thoại')
      ) {
        return 'phone';
      }

      return 'phone';
    };

    products.forEach((p) => {
      const cat = classify(p);
      map[cat].push(p);
    });

    return map;
  }, [products]);

  // Lấy danh mục con từ cây phân cấp DB
  const getSubcategories = (catKey: 'phone' | 'laptop' | 'tablet' | 'accessory'): CategoryItem[] => {
    const rootMatches: Record<string, (c: CategoryItem) => boolean> = {
      phone: (c) => c.categoryId === 1 || c.slug === 'dien-thoai-di-dong' || c.name.toLowerCase().includes('điện thoại'),
      tablet: (c) => c.categoryId === 2 || c.slug === 'may-tinh-bang' || c.name.toLowerCase().includes('máy tính bảng') || c.name.toLowerCase().includes('tablet'),
      laptop: (c) => c.categoryId === 3 || c.slug === 'laptop-pc' || c.name.toLowerCase().includes('laptop'),
      accessory: (c) => c.categoryId === 4 || c.slug === 'phu-kien-am-thanh' || c.name.toLowerCase().includes('phụ kiện'),
    };

    const matcher = rootMatches[catKey];
    const rootCat = categoriesTree.find(matcher);
    return rootCat?.children || [];
  };

  const phoneSubcategories = useMemo(() => getSubcategories('phone'), [categoriesTree]);
  const laptopSubcategories = useMemo(() => getSubcategories('laptop'), [categoriesTree]);
  const tabletSubcategories = useMemo(() => getSubcategories('tablet'), [categoriesTree]);
  const accessorySubcategories = useMemo(() => getSubcategories('accessory'), [categoriesTree]);

  // Danh sách khoảng giá cố định (theo yêu cầu giữ nguyên trừ khoảng giá)
  const phonePriceRanges = [
    { label: 'Dưới 5 triệu', min: 0, max: 5000000 },
    { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
    { label: '10 - 15 triệu', min: 10000000, max: 15000000 },
    { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
    { label: 'Trên 20 triệu', min: 20000000, max: 100000000 },
  ];

  const laptopPriceRanges = [
    { label: 'Dưới 15 triệu', min: 0, max: 15000000 },
    { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
    { label: '20 - 30 triệu', min: 20000000, max: 30000000 },
    { label: 'Trên 30 triệu', min: 30000000, max: 100000000 },
  ];

  const tabletPriceRanges = [
    { label: 'Dưới 6 triệu', min: 0, max: 6000000 },
    { label: '6 - 12 triệu', min: 6000000, max: 12000000 },
    { label: '12 - 20 triệu', min: 12000000, max: 20000000 },
    { label: 'Trên 20 triệu', min: 20000000, max: 100000000 },
  ];

  const formatVoucherDiscount = (vc: ValidVoucherItem): string => {
    if (vc.discountType === 'PERCENT' || vc.discountType === 'PERCENTAGE') {
      return `Giảm ${vc.discountValue}%`;
    }
    return `Giảm ${formatVND(vc.discountValue)}`;
  };

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
            
            {/* CỘT TRÁI: Danh sách các ngành hàng cốt lõi */}
            <div className="w-60 bg-surface-soft/60 border-r border-hairline-soft p-2.5 space-y-1 flex-shrink-0">
              <div className="px-3 py-1.5 text-[10px] font-bold text-steel uppercase tracking-wider">
                Ngành hàng kinh doanh
              </div>

              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onMouseEnter={() => setActiveCategory(cat.id)}
                    onClick={() => {
                      if (cat.id === 'sale') {
                        handleNavigate('/products?sale=true');
                      } else {
                        handleNavigate(`/products?category=${cat.id}`);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all text-left ${
                      isActive ? 'bg-canvas text-primary shadow-xs font-black border border-hairline-soft' : 'text-charcoal hover:bg-canvas/70 hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-primary/10 text-primary' : 'bg-surface-soft text-steel'}`}>
                        <Icon size={15} />
                      </div>
                      <span className="line-clamp-1">{cat.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {cat.isHot && (
                        <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                      )}
                      <ChevronRight size={13} className={isActive ? 'text-primary' : 'text-hairline'} />
                    </div>
                  </button>
                );
              })}

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

            {/* CỘT PHẢI: Nội dung Mega Menu chi tiết theo ngành hàng đang active */}
            <div className="flex-1 p-6 overflow-y-auto bg-canvas">
              
              {/* TAB 1: ĐIỆN THOẠI (Bỏ chọn theo nhu cầu, hiện tất cả thương hiệu từ bảng brands, chi tiết SP qua /product/{id}) */}
              {activeCategory === 'phone' && (
                <div className="grid grid-cols-2 gap-8">
                  {/* Cột 1: Hãng điện thoại (tất cả thương hiệu trong DB) & Mức giá */}
                  <div className="space-y-4">
                    {/* Tất cả thương hiệu có trong bảng thương hiệu */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                        <Smartphone size={14} className="text-primary" />
                        <span>Hãng điện thoại</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {brands.map((brand) => {
                          const logoSrc = resolveBrandLogo(brand.logoUrl, brand.name);
                          return (
                            <button
                              key={brand.brandId}
                              type="button"
                              onClick={() => handleNavigate(`/products?category=phone&brand=${encodeURIComponent(brand.name)}`)}
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

                    {/* Dòng máy phổ biến từ DB (nếu có subcategories) */}
                    {phoneSubcategories.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <Layers size={12} className="text-steel" />
                          <span>Dòng máy phổ biến</span>
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {phoneSubcategories.map((sub) => (
                            <button
                              key={sub.categoryId}
                              type="button"
                              onClick={() => handleNavigate(`/products?category=phone&categoryId=${sub.categoryId}`)}
                              className="px-2 py-1 rounded-md bg-surface-soft text-charcoal hover:text-primary text-[11px] font-medium transition"
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mức giá điện thoại (giữ nguyên khoảng giá) */}
                    <div className="pt-3 border-t border-hairline-soft space-y-2">
                      <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider">Mức giá điện thoại</h5>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {phonePriceRanges.map((price) => (
                          <button
                            key={price.label}
                            type="button"
                            onClick={() => handleNavigate(`/products?category=phone&minPrice=${price.min}&maxPrice=${price.max}`)}
                            className="text-left text-steel hover:text-primary hover:underline py-0.5 truncate"
                          >
                            • {price.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Điện thoại HOT theo DB & Xem tất cả */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Sparkles size={14} className="text-attention" />
                      <span>Điện thoại HOT ⚡</span>
                    </h4>
                    <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
                      {productsByCategory.phone.slice(0, 8).map((item) => (
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
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?category=phone')}
                      className="w-full py-2 bg-ink-deep hover:bg-charcoal text-canvas text-[11px] font-bold rounded-lg text-center transition"
                    >
                      Xem tất cả điện thoại &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: LAPTOP (Bỏ phân khúc sử dụng, hiện tất cả thương hiệu từ bảng brands, chi tiết SP qua /product/{id}) */}
              {activeCategory === 'laptop' && (
                <div className="grid grid-cols-2 gap-8">
                  {/* Cột 1: Hãng Laptop (tất cả thương hiệu trong DB) & Mức giá */}
                  <div className="space-y-4">
                    {/* Tất cả thương hiệu có trong bảng thương hiệu */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                        <Laptop size={14} className="text-primary" />
                        <span>Thương hiệu Laptop</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {brands.map((brand) => {
                          const logoSrc = resolveBrandLogo(brand.logoUrl, brand.name);
                          return (
                            <button
                              key={brand.brandId}
                              type="button"
                              onClick={() => handleNavigate(`/products?category=laptop&brand=${encodeURIComponent(brand.name)}`)}
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

                    {/* Dòng Laptop từ DB (nếu có subcategories) */}
                    {laptopSubcategories.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <Layers size={12} className="text-steel" />
                          <span>Dòng Laptop nổi bật</span>
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {laptopSubcategories.map((sub) => (
                            <button
                              key={sub.categoryId}
                              type="button"
                              onClick={() => handleNavigate(`/products?category=laptop&categoryId=${sub.categoryId}`)}
                              className="px-2 py-1 rounded-md bg-surface-soft text-charcoal hover:text-primary text-[11px] font-medium transition"
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Khoảng giá Laptop (giữ nguyên khoảng giá) */}
                    <div className="pt-3 border-t border-hairline-soft space-y-2">
                      <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider">Khoảng giá Laptop</h5>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {laptopPriceRanges.map((price) => (
                          <button
                            key={price.label}
                            type="button"
                            onClick={() => handleNavigate(`/products?category=laptop&minPrice=${price.min}&maxPrice=${price.max}`)}
                            className="text-left text-steel hover:text-primary hover:underline py-0.5 truncate"
                          >
                            • {price.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Laptop Nổi Bật theo DB & Xem tất cả */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Sparkles size={14} className="text-attention" />
                      <span>Laptop Nổi Bật ⚡</span>
                    </h4>
                    <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
                      {productsByCategory.laptop.slice(0, 8).map((item) => (
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
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?category=laptop')}
                      className="w-full py-2 bg-ink-deep hover:bg-charcoal text-canvas text-[11px] font-bold rounded-lg text-center transition"
                    >
                      Xem tất cả Laptop &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: MÁY TÍNH BẢNG (Bỏ phụ kiện đính kèm, hiện tất cả thương hiệu từ bảng brands, chi tiết SP qua /product/{id}) */}
              {activeCategory === 'tablet' && (
                <div className="grid grid-cols-2 gap-8">
                  {/* Cột 1: Hãng máy tính bảng (tất cả thương hiệu trong DB) & Mức giá */}
                  <div className="space-y-4">
                    {/* Tất cả thương hiệu có trong bảng thương hiệu */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                        <Tablet size={14} className="text-primary" />
                        <span>Hãng máy tính bảng</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {brands.map((brand) => {
                          const logoSrc = resolveBrandLogo(brand.logoUrl, brand.name);
                          return (
                            <button
                              key={brand.brandId}
                              type="button"
                              onClick={() => handleNavigate(`/products?category=tablet&brand=${encodeURIComponent(brand.name)}`)}
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

                    {/* Dòng Tablet từ DB (nếu có subcategories) */}
                    {tabletSubcategories.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <Layers size={12} className="text-steel" />
                          <span>Dòng Tablet nổi bật</span>
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {tabletSubcategories.map((sub) => (
                            <button
                              key={sub.categoryId}
                              type="button"
                              onClick={() => handleNavigate(`/products?category=tablet&categoryId=${sub.categoryId}`)}
                              className="px-2 py-1 rounded-md bg-surface-soft text-charcoal hover:text-primary text-[11px] font-medium transition"
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Khoảng giá Tablet (giữ nguyên khoảng giá) */}
                    <div className="pt-3 border-t border-hairline-soft space-y-2">
                      <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider">Khoảng giá Tablet</h5>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {tabletPriceRanges.map((price) => (
                          <button
                            key={price.label}
                            type="button"
                            onClick={() => handleNavigate(`/products?category=tablet&minPrice=${price.min}&maxPrice=${price.max}`)}
                            className="text-left text-steel hover:text-primary hover:underline py-0.5 truncate"
                          >
                            • {price.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Máy tính bảng HOT theo DB & Xem tất cả */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Sparkles size={14} className="text-attention" />
                      <span>Máy tính bảng HOT ⚡</span>
                    </h4>
                    <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
                      {productsByCategory.tablet.slice(0, 8).map((item) => (
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
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?category=tablet')}
                      className="w-full py-2 bg-ink-deep hover:bg-charcoal text-canvas text-[11px] font-bold rounded-lg text-center transition"
                    >
                      Xem tất cả Tablet &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: PHỤ KIỆN (Hiện tất cả thương hiệu từ bảng brands, chi tiết SP qua /product/{id}) */}
              {activeCategory === 'accessory' && (
                <div className="grid grid-cols-3 gap-6">
                  {/* Nhóm phụ kiện từ DB */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Headphones size={14} className="text-primary" />
                      <span>Nhóm Phụ kiện di động</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {accessorySubcategories.map((item) => (
                        <button
                          key={item.categoryId}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=accessory&categoryId=${item.categoryId}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-soft/60 hover:bg-surface-soft hover:text-primary font-medium text-left truncate transition"
                        >
                          • {item.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thương hiệu phụ kiện: Hiện tất cả thương hiệu trong bảng brands */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Tag size={14} className="text-primary" />
                      <span>Thương hiệu phụ kiện nổi tiếng</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {brands.map((brand) => {
                        const logoSrc = resolveBrandLogo(brand.logoUrl, brand.name);
                        return (
                          <button
                            key={brand.brandId}
                            type="button"
                            onClick={() => handleNavigate(`/products?category=accessory&brand=${encodeURIComponent(brand.name)}`)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-soft/60 hover:bg-surface-soft hover:text-primary font-medium text-left truncate transition text-[11px] flex items-center gap-1.5"
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

                  {/* Phụ kiện HOT / Bán chạy từ DB */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Sparkles size={14} className="text-attention" />
                      <span>Sản phẩm bán chạy ⚡</span>
                    </h4>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {productsByCategory.accessory.slice(0, 7).map((item) => (
                        <button
                          key={item.productId}
                          type="button"
                          onClick={() => handleNavigate(`/product/${item.productId}`)}
                          className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-soft text-left group transition"
                        >
                          <span className="group-hover:text-primary font-medium line-clamp-1">{item.name}</span>
                          <span className="text-[10px] font-bold font-mono text-primary flex-shrink-0 ml-2">
                            {formatVND(item.variants?.[0]?.salePrice || item.variants?.[0]?.listPrice || 0)}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?category=accessory')}
                      className="w-full py-2 bg-ink-deep hover:bg-charcoal text-canvas text-[11px] font-bold rounded-lg text-center transition"
                    >
                      Xem tất cả phụ kiện &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: KHUYẾN MÃI FLASH SALE (Chỉ cho xem, không cho ấn vào chuyển hướng) */}
              {activeCategory === 'sale' && (
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
