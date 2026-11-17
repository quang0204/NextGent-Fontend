import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, ShoppingBag, ArrowLeft, Search } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-20 h-20 bg-surface-soft text-primary rounded-full flex items-center justify-center mx-auto border border-hairline-soft">
        <AlertCircle size={36} />
      </div>

      <div className="space-y-2">
        <span className="text-6xl font-medium text-ink-deep tracking-tight block">404</span>
        <h1 className="text-xl font-medium text-ink-deep">
          Không tìm thấy trang yêu cầu
        </h1>
        <p className="text-xs sm:text-sm text-steel max-w-md mx-auto">
          Địa chỉ liên kết bạn vừa truy cập không tồn tại hoặc đã được thay đổi trên hệ thống NextGen Smart Tech.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/"
          className="btn-marketing inline-flex items-center gap-2 text-xs font-bold px-6 py-3 rounded-full shadow-xs"
        >
          <Home size={15} />
          <span>Về trang chủ</span>
        </Link>

        <Link
          to="/products?category=phone"
          className="btn-secondary inline-flex items-center gap-2 text-xs font-bold px-6 py-3 rounded-full"
        >
          <ShoppingBag size={15} />
          <span>Xem thiết bị di động</span>
        </Link>
      </div>

      <div className="pt-8 border-t border-hairline-soft text-xs text-steel">
        Cần trợ giúp? Hotline chăm sóc khách hàng: <strong className="text-ink-deep font-bold">1800.6018</strong> (Miễn phí)
      </div>
    </div>
  );
};
