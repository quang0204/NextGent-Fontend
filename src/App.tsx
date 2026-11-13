import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StorefrontLayout } from './components/layout/StorefrontLayout';
import { useAuthStore } from './stores/authStore';
import { useCartStore } from './stores/cartStore';

// Production Storefront Pages
import { HomePage } from './pages/HomePage';
import { ProductListPage } from './pages/ProductListPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { ComparePage } from './pages/ComparePage';
import { WishlistPage } from './pages/WishlistPage';
import { AuthPage } from './pages/AuthPage';
import { AccountPage } from './pages/AccountPage';
import { FaqSupportPage } from './pages/FaqSupportPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Portal Page (Admin & Staff)
import { AdminPortalPage } from './pages/AdminPortalPage';
import { ToastContainer } from './components/common/ToastContainer';

export const App: React.FC = () => {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    // API 12: GET /api/v1/auth/me - Tự động tải thông tin phiên làm việc và địa chỉ mặc định
    fetchMe();
    // API 7.1: GET /api/v1/cart - Tự động đồng bộ giỏ hàng
    fetchCart();
  }, [fetchMe, fetchCart]);

  return (
    <BrowserRouter>
      <ToastContainer />
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
    </BrowserRouter>
  );
};
