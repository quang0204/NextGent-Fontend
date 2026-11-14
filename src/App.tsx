import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StorefrontLayout } from './components/layout/StorefrontLayout';
import { useAuthStore } from './stores/authStore';
import { useCartStore } from './stores/cartStore';
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

export const App: React.FC = () => {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    fetchMe();
    fetchCart();
  }, [fetchMe, fetchCart]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-xs font-medium text-steel">
            Đang tải trang...
          </div>
        }
      >
        <Routes>
          {/* Storefront Layout with Public Header, Navigation & Footer */}
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
            <Route path="/faq" element={<FaqSupportPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Dedicated Admin Portal Route (Isolated from Public Retail Header/Footer) */}
          <Route path="/admin" element={<AdminPortalPage />} />
          <Route path="/portal" element={<AdminPortalPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
