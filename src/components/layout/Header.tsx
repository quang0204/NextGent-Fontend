import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, ShoppingBag, User, Heart, Scale, ChevronDown, Sparkles, LogOut, X } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useCompareStore } from '../../stores/compareStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { productService } from '../../services/productService';
import { Product } from '../../types/product';
import { formatVND } from '../common/PriceDisplay';
import { NotificationBell } from '../common/NotificationBell';
import { CategoryMegaMenu } from './CategoryMegaMenu';

export const Header: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [totalMatched, setTotalMatched] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggest, setIsSearchingSuggest] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const searchContainerRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    setSearchTerm(qParam);
    setShowSuggestions(false);
  }, [location.pathname, location.search, searchParams]);

  // Đóng dropdown gợi ý khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tìm kiếm gợi ý sản phẩm theo thời gian thực khi gõ (debounce 180ms)
  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) {
      setSuggestions([]);
      setTotalMatched(0);
      setIsSearchingSuggest(false);
      return;
    }

    let cancelled = false;
    setIsSearchingSuggest(true);
    const timer = setTimeout(async () => {
      try {
        const res = await productService.getSearchSuggestions(q, 5);
        if (!cancelled) {
          setSuggestions(res.items);
          setTotalMatched(res.total);
        }
      } finally {
        if (!cancelled) setIsSearchingSuggest(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const totalCartCount = useCartStore((state) => state.getTotalCount());
  const wishlistCount = useWishlistStore((state) => state.getCount());
  const compareCount = useCompareStore((state) => state.productIds.length);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { showToast } = useToastStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const trimmed = searchTerm.trim();
    if (trimmed) {
      navigate(`/products?q=${encodeURIComponent(trimmed)}`);
    } else if (location.pathname === '/products' && searchParams.has('q')) {
      navigate('/products');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSuggestions([]);
    setTotalMatched(0);
    setShowSuggestions(false);
    if (location.pathname === '/products' && searchParams.has('q')) {
      navigate('/products');
    }
  };

  return (
    <header className="bg-canvas border-b border-hairline-soft sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Brand Logo Premium */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <img
            src="/logo.png"
            alt="NextGen Smart Tech"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain shadow-xs border border-hairline-soft group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-ink-deep leading-none">
              Next<span className="text-primary">Gen</span>
            </span>
            <span className="text-[10px] text-steel font-bold tracking-wider hidden sm:block mt-0.5 uppercase">
              Smart Tech
            </span>
          </div>
        </Link>

        {/* Mega Menu Danh mục sản phẩm (CellphoneS style) */}
        <CategoryMegaMenu />

        {/* Search Bar - Modern Rounded Capsule kèm Dropdown Sản phẩm đề xuất */}
        <form ref={searchContainerRef} onSubmit={handleSearch} className="flex-1 max-w-xl relative">
          <input
            type="text"
            value={searchTerm}
            onFocus={() => {
              if (searchTerm.trim()) setShowSuggestions(true);
            }}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(Boolean(e.target.value.trim()));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            placeholder="Tìm kiếm: điện thoại giá rẻ, laptop gaming, iPhone 15..."
            className="w-full h-10 pl-11 pr-28 bg-surface-soft hover:bg-hairline-soft/30 focus:bg-canvas text-sm text-ink placeholder:text-steel rounded-full border border-hairline-soft focus:border-fb-blue focus:outline-none transition-all"
          />
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-steel" />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              title="Xóa tìm kiếm"
              className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-steel hover:text-ink rounded-full hover:bg-hairline-soft/50 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-ink-button hover:bg-charcoal text-on-ink-button text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors"
          >
            Tìm kiếm
          </button>

          {/* Dropdown Gợi ý sản phẩm ("Sản phẩm đề xuất") */}
          {showSuggestions && searchTerm.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-canvas border border-hairline-soft rounded-2xl shadow-summary p-4 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-ink-deep">Sản phẩm đề xuất</h4>
                {totalMatched > 0 && (
                  <span className="text-[11px] font-medium text-steel">
                    Tìm thấy {totalMatched} sản phẩm
                  </span>
                )}
              </div>

              {isSearchingSuggest && suggestions.length === 0 ? (
                <div className="py-6 text-center text-xs text-steel">
                  Đang tìm sản phẩm phù hợp...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="py-5 text-center text-xs text-steel">
                  Không tìm thấy sản phẩm nào khớp với <strong className="text-ink-deep">"{searchTerm.trim()}"</strong>
                </div>
              ) : (
                <div className="divide-y divide-hairline-soft max-h-[380px] overflow-y-auto no-scrollbar">
                  {suggestions.map((prod) => {
                    const firstVar = prod.variants?.[0];
                    const salePrice = firstVar?.salePrice || 0;
                    const listPrice = firstVar?.listPrice || salePrice;
                    const specSummary = [
                      firstVar?.ramGb ? `${firstVar.ramGb}GB` : null,
                      firstVar?.romGb ? (firstVar.romGb >= 1024 ? '1TB' : `${firstVar.romGb}GB`) : null,
                      firstVar?.color && firstVar.color !== 'Mặc định' ? firstVar.color : null,
                    ]
                      .filter(Boolean)
                      .join(' / ');

                    return (
                      <Link
                        key={prod.productId}
                        to={`/products/${prod.productId}`}
                        onClick={() => setShowSuggestions(false)}
                        className="flex items-start gap-3.5 py-2.5 px-2 -mx-2 rounded-xl hover:bg-surface-soft transition-colors group"
                      >
                        <img
                          src={prod.thumbnail || firstVar?.imageUrl || '/logo.png'}
                          alt={prod.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/logo.png';
                          }}
                          className="w-14 h-14 rounded-lg object-contain bg-canvas border border-hairline-soft p-1 flex-shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-charcoal group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {prod.name}
                            {specSummary ? ` (${specSummary})` : ''}
                          </div>
                          <div className="mt-1 flex flex-col">
                            <span className="text-sm font-bold text-critical leading-tight">
                              {formatVND(salePrice)}
                            </span>
                            {listPrice > 0 && (
                              <span className="text-xs text-steel line-through leading-tight mt-0.5">
                                {formatVND(listPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {suggestions.length > 0 && (
                <button
                  type="submit"
                  className="mt-3 pt-2.5 border-t border-hairline-soft w-full text-center text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Xem tất cả {totalMatched} kết quả cho "{searchTerm.trim()}" &rarr;
                </button>
              )}
            </div>
          )}
        </form>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          
          {/* So sánh */}
          <Link
            to="/compare"
            className="btn-icon-circular relative"
            title="So sánh cấu hình sản phẩm"
          >
            <Scale size={18} />
            {compareCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {compareCount}
              </span>
            )}
          </Link>

          {/* Yêu thích */}
          <Link
            to="/wishlist"
            className="btn-icon-circular relative"
            title="Danh sách sản phẩm yêu thích"
          >
            <Heart size={18} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-critical text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Thông báo (Bảng Notifications) */}
          <NotificationBell />

          {/* User Account Popover */}
          <div className="relative group">
            <Link
              to={isAuthenticated? "/account": "/auth"}
              className="flex items-center gap-2 text-xs font-bold text-ink hover:text-ink-deep px-3 py-1.5 rounded-full border border-hairline-soft hover:bg-surface-soft transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-surface-soft flex items-center justify-center text-ink font-bold text-xs">
                {isAuthenticated && user? user.fullName.charAt(0): <User size={14} className="text-steel" />}
              </div>
              <span className="hidden sm:inline">
                {isAuthenticated && user? user.fullName.split(' ').slice(-1)[0]: 'Tài khoản'}
              </span>
              <ChevronDown size={12} className="text-steel hidden sm:block" />
            </Link>

            {/* Account Quick Popover Menu */}
            <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50 min-w-[220px] animate-in fade-in duration-150">
              <div className="bg-canvas border border-hairline-soft rounded-xl shadow-summary p-2 text-xs space-y-1">
                {isAuthenticated && user? (
                  <>
                    <div className="px-3 py-2 border-b border-hairline-soft mb-1">
                      <div className="font-bold text-ink-deep line-clamp-1">{user.fullName}</div>
                      <div className="text-[11px] text-steel font-mono mt-0.5">{user.phone}</div>
                      <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-soft text-ink border border-hairline-soft">
                        {user.role}
                      </div>
                    </div>
                    <Link
                      to="/account?tab=profile"
                      className="block px-3 py-2 rounded-lg text-ink hover:bg-surface-soft hover:text-ink-deep font-semibold transition"
                    >
                      Thông tin & Sổ địa chỉ
                    </Link>
                    <Link
                      to="/orders"
                      className="block px-3 py-2 rounded-lg text-ink hover:bg-surface-soft hover:text-ink-deep font-semibold transition"
                    >
                      Đơn hàng của tôi
                    </Link>
                    <Link
                      to="/notifications"
                      className="block px-3 py-2 rounded-lg text-ink hover:bg-surface-soft hover:text-ink-deep font-semibold transition"
                    >
                      Thông báo của bạn
                    </Link>
                    <Link
                      to="/account?tab=support"
                      className="block px-3 py-2 rounded-lg text-ink hover:bg-surface-soft hover:text-ink-deep font-semibold transition"
                    >
                      Lịch sử hỗ trợ
                    </Link>
                    {(user.role === 'STAFF' || user.role === 'ADMIN') && (
                      <Link
                        to="/admin"
                        className="block px-3 py-2 rounded-lg text-primary hover:bg-surface-soft font-bold transition border-t border-hairline-soft pt-2"
                      >
                        Vào Cổng Quản trị &rarr;
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowLogoutModal(true)}
                      className="w-full text-left px-3 py-2 rounded-lg text-critical hover:bg-critical/10 font-bold transition flex items-center gap-2 border-t border-hairline-soft pt-2 mt-1 cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Đăng xuất</span>
                    </button>
                  </>
                ): (
                  <div className="p-3 space-y-2">
                    <div className="text-steel text-xs leading-snug">
                      Đăng nhập để theo dõi đơn hàng và lưu ưu đãi mua sắm.
                    </div>
                    <Link
                      to="/auth?mode=login"
                      className="block w-full py-2.5 text-center bg-ink-button hover:bg-charcoal text-on-ink-button font-bold rounded-full text-xs transition"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to="/auth?mode=register"
                      className="block w-full py-2.5 text-center bg-surface-soft hover:bg-hairline-soft text-ink font-bold rounded-full text-xs transition"
                    >
                      Đăng ký thành viên
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cart Pill Button (DESIGN-meta commerce buy affordance) */}
          <Link
            to="/cart"
            className="flex items-center gap-2 bg-primary hover:bg-primary-deep active:bg-primary-deep text-on-primary px-4 py-2 rounded-full transition-colors"
          >
            <div className="relative">
              <ShoppingBag size={17} />
              {totalCartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-warning text-ink-deep text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold hidden md:inline">Giỏ hàng</span>
          </Link>

        </div>

      </div>

      {/* Modal xác nhận đăng xuất từ Header */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-canvas border border-hairline-soft rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <h4 className="font-bold text-ink-deep text-sm flex items-center gap-2">
                <LogOut size={16} className="text-critical" />
                <span>Xác nhận đăng xuất</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="p-1 text-steel hover:text-ink rounded-lg hover:bg-surface-soft transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-charcoal text-xs leading-relaxed">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
            </p>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-hairline-soft">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="btn-ghost px-4 py-2 text-xs font-bold rounded-full"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                  showToast('Đã đăng xuất tài khoản thành công', 'info');
                  navigate('/');
                }}
                className="bg-critical hover:bg-critical-strong text-canvas px-5 py-2 text-xs font-bold rounded-full shadow-xs transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
