import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlistStore } from '../stores/wishlistStore';
import { productService } from '../services/productService';
import { Product } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { Heart, ArrowLeft, Trash2 } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { productIds, toggleWishlist, syncWithBackend } = useWishlistStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const all = await productService.getProducts();
      const favs = all.filter(p => productIds.includes(p.productId));
      setProducts(favs);
      setIsLoading(false);
    };
    fetch();
  }, [productIds]);

  if (productIds.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-surface-soft text-critical rounded-full flex items-center justify-center mx-auto border border-hairline-soft">
          <Heart size={26} className="fill-critical/20" />
        </div>
        <h2 className="text-xl font-medium text-ink-deep">Danh sách yêu thích của bạn đang trống</h2>
        <p className="text-xs text-steel max-w-sm mx-auto">
          Hãy thả tim những sản phẩm bạn quan tâm để dễ dàng theo dõi biến động giá và đặt mua sau.
        </p>
        <Link
          to="/"
          className="btn-marketing inline-flex items-center gap-2 text-xs font-bold px-6 py-3 rounded-full mt-2"
        >
          <ArrowLeft size={14} />
          <span>Khám phá sản phẩm ngay</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
        <div>
          <h1 className="text-2xl font-medium text-ink-deep tracking-tight flex items-center gap-2.5">
            <Heart size={22} className="text-critical fill-critical" />
            <span>Sản phẩm yêu thích ({products.length})</span>
          </h1>
          <p className="text-xs text-steel mt-1">
            Đang lưu các thiết bị di động bạn quan tâm để dễ dàng cân nhắc và đặt mua
          </p>
        </div>

        <Link to="/" className="text-xs text-steel hover:text-primary flex items-center gap-1.5 font-medium transition-colors">
          <ArrowLeft size={14} />
          <span>Tiếp tục mua hàng</span>
        </Link>
      </div>

      {/* Grid */}
      {isLoading? (
        <div className="py-24 text-center text-steel text-xs">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-semibold text-charcoal">Đang tải danh sách yêu thích...</p>
        </div>
      ): (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p.productId} product={p} />
          ))}
        </div>
      )}

    </div>
  );
};
