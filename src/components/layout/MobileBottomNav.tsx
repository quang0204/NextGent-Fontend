import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  ShoppingBag,
  Package,
  User,
  Flame,
  X,
  ChevronRight,
} from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { categoryService, CategoryItem } from '../../services/categoryService';
import {
  DEFAULT_ROOT_CATEGORIES,
  getRootCategoryPath,
  getCategoryIcon,
  getCategoryAccentClass,
} from '../../utils/categoryUtils';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = useCartStore((state) => state.getTotalCount());
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [rootCategories, setRootCategories] = useState<CategoryItem[]>(DEFAULT_ROOT_CATEGORIES);

  useEffect(() => {
    let mounted = true;
    categoryService
      .getCategories(false)
      .then((res) => {
        if (!mounted || !Array.isArray(res?.data) || res.data.length === 0) return;
        const visible = res.data.filter((c) => c.isVisible !== false);
        if (visible.length > 0) setRootCategories(visible);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const navItems = [
    { to: '/', label: 'Trang chủ', icon: Home, exact: true },
    { to: '/products', label: 'Danh mục', icon: LayoutGrid, isCategoryTrigger: true },
    { to: '/cart', label: 'Giỏ hàng', icon: ShoppingBag, badge: cartCount, exact: true },
    { to: '/orders', label: 'Đơn hàng', icon: Package, exact: false },
    { to: '/account', label: 'Tài khoản', icon: User, exact: false },
  ];

  const categories = useMemo(
    () => [
      { label: 'Tất cả sản phẩm', path: '/products', icon: LayoutGrid, color: 'text-primary' },
      ...rootCategories.map((cat) => ({
        label: cat.name,
        path: getRootCategoryPath(cat),
        icon: getCategoryIcon(cat),
        color: getCategoryAccentClass(cat),
      })),
      { label: 'Khuyến mãi Flash Sale ⚡', path: '/products?sale=true', icon: Flame, color: 'text-critical' },
    ],
    [rootCategories]
  );

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.to;
    if (item.to === '/orders') {
      return location.pathname.startsWith('/orders') || location.pathname.startsWith('/order-tracking');
    }
    return location.pathname.startsWith(item.to);
  };

  const handleCategorySelect = (path: string) => {
    setIsCategorySheetOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Category Bottom Sheet Modal trên Mobile */}
      {isCategorySheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex flex-col justify-end">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsCategorySheetOpen(false)}
          />
          <div className="relative bg-canvas border-t border-hairline-soft rounded-t-3xl p-5 shadow-sticky max-h-[80vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <div className="flex items-center gap-2">
                <LayoutGrid size={18} className="text-primary" />
                <h3 className="font-bold text-sm text-ink-deep uppercase tracking-wider">
                  Ngành hàng kinh doanh
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategorySheetOpen(false)}
                className="p-1 rounded-full text-steel hover:text-ink hover:bg-surface-soft transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {categories.map((cat) => {
                const CatIcon = cat.icon;
                const isSelected = cat.path === '/products' 
                  ? location.pathname === '/products' && !location.search
                  : `${location.pathname}${location.search}` === cat.path;

                return (
                  <button
                    key={cat.path}
                    type="button"
                    onClick={() => handleCategorySelect(cat.path)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'border-ink-deep bg-ink-deep text-canvas shadow-xs font-bold'
                        : 'border-hairline-soft bg-surface-soft/60 text-ink hover:bg-surface-soft hover:border-slate'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-canvas/20 text-canvas' : 'bg-canvas border border-hairline-soft ' + cat.color
                      }`}>
                        <CatIcon size={18} />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold">{cat.label}</span>
                    </div>
                    <ChevronRight size={16} className={isSelected ? 'text-canvas' : 'text-steel'} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-canvas border-t border-hairline-soft z-40 py-2 px-3 flex items-center justify-around shadow-sticky">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          if (item.isCategoryTrigger) {
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => setIsCategorySheetOpen(true)}
                className={`flex flex-col items-center justify-center min-w-[50px] py-1 transition-colors relative cursor-pointer ${
                  active ? 'text-primary font-bold' : 'text-steel hover:text-ink'
                }`}
              >
                <div className="relative">
                  <Icon size={20} className={active ? 'text-primary' : 'text-steel'} />
                </div>
                <span className="text-xs mt-1 font-semibold">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center min-w-[50px] py-1 transition-colors relative ${
                active ? 'text-primary font-bold' : 'text-steel hover:text-ink'
              }`}
            >
              <div className="relative">
                <Icon size={20} className={active ? 'text-primary' : 'text-steel'} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-canvas">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
