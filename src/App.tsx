import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { StorefrontLayout } from './components/layout/StorefrontLayout';
import { useAuthStore } from './stores/authStore';
import { useCartStore } from './stores/cartStore';
import { useToastStore } from './stores/toastStore';
import { HomePage } from './pages/HomePage';
import { ToastContainer } from './components/common/ToastContainer';

// Code-split Secondary Storefront & Admin Portal Routes
const ProductListPage = lazy(() => import('./pages/ProductListPage').then((m) => ({ default: m.ProductListPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CartPage = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage })));
const ComparePage = lazy(() => import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })));
const WishlistPage = lazy(() => import('./pages/WishlistPage').then((m) => ({ default: m.WishlistPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const FaqSupportPage = lazy(() => import('./pages/FaqSupportPage').then((m) => ({ default: m.FaqSupportPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const AdminPortalPage = lazy(() => import('./pages/AdminPortalPage').then((m) => ({ default: m.AdminPortalPage })));

const AdminLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center text-xs font-medium text-slate-400">
    Đang tải cổng quản trị...
  </div>
);

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-canvas px-4 text-center">
          <div className="max-w-md space-y-4 p-6 rounded-2xl border border-hairline-soft bg-surface-soft">
            <h2 className="text-lg font-bold text-ink-deep">Phiên hoặc giao diện vừa gặp gián đoạn</h2>
            <p className="text-xs text-steel">
              Vui lòng tải lại trang hoặc đăng nhập lại để tiếp tục.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-xs font-bold rounded-full border border-hairline-soft bg-canvas text-ink"
              >
                Tải lại trang
              </button>
              <a
                href="/auth"
                className="px-4 py-2 text-xs font-bold rounded-full bg-primary text-white"
              >
                Đăng nhập lại
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AuthSessionMonitor: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let lastNoticeAt = 0;
    const handleSessionExpired = () => {
      const now = Date.now();
      if (now - lastNoticeAt > 1500) {
        lastNoticeAt = now;
        useToastStore
          .getState()
          .showToast('Phiên đăng nhập đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại.', 'warning');
      }
      const { pathname, search } = window.location;
      if (!pathname.startsWith('/auth')) {
        const currentTarget = `${pathname}${search}`;
        navigate(`/auth?redirect=${encodeURIComponent(currentTarget)}`, { replace: true });
      }
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [navigate]);

  return null;
};

export const App: React.FC = () => {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    fetchMe();
    fetchCart();
  }, [fetchMe, fetchCart]);

  return (
    <BrowserRouter>
      <AuthSessionMonitor />
      <ToastContainer />
      <AppErrorBoundary>
        <Routes>
        {/* Storefront Layout with Persistent Header, Navigation & Footer */}
        <Route element={<StorefrontLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrderTrackingPage />} />
          <Route path="/order-tracking" element={<OrderTrackingPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/support-history" element={<AccountPage />} />
          <Route path="/faq" element={<FaqSupportPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Dedicated Admin Portal Route (Isolated from Public Retail Header/Footer) */}
        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminLoadingFallback />}>
              <AdminPortalPage />
            </Suspense>
          }
        />
        <Route
          path="/portal"
          element={
            <Suspense fallback={<AdminLoadingFallback />}>
              <AdminPortalPage />
            </Suspense>
          }
        />
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  );
};
