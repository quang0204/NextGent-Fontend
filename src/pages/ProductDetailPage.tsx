import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productService } from '../services/productService';
import { promotionService, getCountdownParts } from '../services/promotionService';
import { orderService } from '../services/orderService';
import { sharedStore } from '../services/sharedStore';
import { Product, ProductVariant } from '../types/product';
import { ProductReview } from '../types/review';
import { OrderDetail, OrderItemSnapshot } from '../types/order';
import { PriceDisplay, formatVND } from '../components/common/PriceDisplay';
import { RatingStars } from '../components/common/RatingStars';
import { VariantSelector } from '../components/product/VariantSelector';
import { ProductSpecsTable } from '../components/product/ProductSpecsTable';
import { ProductCard } from '../components/product/ProductCard';
import { useCartStore } from '../stores/cartStore';
import { useWishlistStore } from '../stores/wishlistStore';
import { useCompareStore } from '../stores/compareStore';
import { useToastStore } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import { 
  ShieldCheck, 
  RotateCcw, 
  Truck, 
  Gift, 
  ShoppingBag, 
  Heart,
  Scale,
  CheckCircle,
  Check,
  Clock, 
  MessageSquare, 
  Star,
  Send,
  UserCheck,
  Zap,
  AlertCircle,
  Ban
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Stores
  const addItemToCart = useCartStore((state) => state.addItem);
  const setBuyNowItem = useCartStore((state) => state.setBuyNowItem);
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { isInCompare, addToCompare, removeFromCompare } = useCompareStore();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerPhone, setReviewerPhone] = useState('');
  const [ratingScore, setRatingScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Modal Giữ chỗ tồn kho 30 phút
  const [reservedOrder, setReservedOrder] = useState<any | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(1800);
  const [flashSaleEndAt, setFlashSaleEndAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      const prodId = id? parseInt(id, 10): 1;
      const [data, related, revs, activePromos] = await Promise.all([
        productService.getProductById(prodId),
        productService.getRelatedProducts(prodId),
        productService.getReviews(prodId),
        promotionService.getActivePromotions().catch(() => [])
      ]);
      const matchedPromo = activePromos.find(pr => pr.variants?.some(v => Number(v.productId) === prodId));
      setFlashSaleEndAt(matchedPromo?.endAt || null);

      if (data) {
        setProduct(data);
        // Ưu tiên chọn biến thể còn hàng đầu tiên để người dùng có thể mua hàng ngay
        const initialVariant = data.variants.find(v => {
          const isInactive = v.isActive === false || (v as any).status === 'INACTIVE' || (v as any).status === 'DISCONTINUED';
          const onHand = v.onHandQty !== undefined ? v.onHandQty : (v.availableQty ?? 0);
          const reserved = v.reservedQty ?? 0;
          return !isInactive && Math.max(0, onHand - reserved) > 0;
        }) || data.variants[0];

        setSelectedVariant(initialVariant);
        setActiveImage(data.thumbnail || initialVariant?.imageUrl);
        setRelatedProducts(related);
      }
      setReviews(
        revs.filter(r => r.status !== 'HIDDEN' && !sharedStore.isReviewHidden(r.reviewId))
      );
      setIsLoading(false);
    };
    fetchDetail();

    const unsub = sharedStore.subscribe(() => {
      const prodId = id ? parseInt(id, 10) : 1;
      setReviews(prev =>
        (prev.length > 0 ? prev : sharedStore.getReviews(prodId, false)).filter(
          r => r.status !== 'HIDDEN' && !sharedStore.isReviewHidden(r.reviewId)
        )
      );
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    let timer: any;
    if (reservedOrder && holdSecondsLeft > 0) {
      timer = setInterval(() => setHoldSecondsLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [reservedOrder, holdSecondsLeft]);

  useEffect(() => {
    if (!product?.isFlashSale) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [product?.isFlashSale]);

  const currentAverageRating = useMemo(() => {
    if (reviews.length > 0) {
      const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
      return Number((sum / reviews.length).toFixed(1));
    }
    return product?.rating || 0;
  }, [reviews, product?.rating]);

  const currentReviewCount = reviews.length > 0 ? reviews.length : (product?.reviewCount || 0);

  // Xác định sản phẩm có thuộc ngành hàng Phụ kiện di động hay không (để ẩn nút So sánh)
  const isAccessory = useMemo(() => {
    if (!product) return false;
    const catName = (product.categoryName || '').toLowerCase();
    const rootCatName = (product.rootCategoryName || '').toLowerCase();
    const rootId = product.rootCategoryId ?? product.parentCategoryId ?? product.categoryId;

    return (
      rootId === 4 ||
      product.categoryId === 4 ||
      product.parentCategoryId === 4 ||
      rootCatName.includes('phụ kiện') ||
      catName.includes('phụ kiện') ||
      catName.includes('tai nghe') ||
      catName.includes('loa') ||
      catName.includes('củ sạc') ||
      catName.includes('cáp') ||
      catName.includes('sạc') ||
      catName.includes('âm thanh')
    );
  }, [product]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-pulse" aria-hidden="true">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-surface-soft rounded" />
          <span className="text-hairline">/</span>
          <div className="h-4 w-20 bg-surface-soft rounded" />
          <span className="text-hairline">/</span>
          <div className="h-4 w-32 bg-surface-soft rounded" />
        </div>

        {/* Header Title skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
          <div className="space-y-2">
            <div className="h-8 w-72 sm:w-96 bg-surface-soft rounded-lg" />
            <div className="h-4 w-48 bg-surface-soft rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-surface-soft rounded-full" />
            <div className="h-9 w-24 bg-surface-soft rounded-full" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Gallery (5 cols) */}
          <div className="lg:col-span-5 bg-canvas border border-hairline-soft rounded-xxl p-4 sm:p-6 space-y-4">
            <div className="h-80 sm:h-96 bg-surface-soft rounded-xl" />
            <div className="flex gap-2.5 justify-center">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-14 h-14 rounded-lg bg-surface-soft border border-hairline-soft" />
              ))}
            </div>
            <div className="p-4 bg-surface-soft rounded-xl space-y-2">
              <div className="h-3.5 w-full bg-hairline-soft/60 rounded" />
              <div className="h-3.5 w-4/5 bg-hairline-soft/60 rounded" />
              <div className="h-3.5 w-3/4 bg-hairline-soft/60 rounded" />
            </div>
          </div>

          {/* Right Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="h-28 bg-surface-soft rounded-xl border border-hairline-soft" />
            <div className="bg-canvas border border-hairline-soft rounded-xl p-5 space-y-4">
              <div className="h-4 w-32 bg-surface-soft rounded" />
              <div className="flex gap-2">
                <div className="h-10 w-24 bg-surface-soft rounded-xl" />
                <div className="h-10 w-24 bg-surface-soft rounded-xl" />
                <div className="h-10 w-24 bg-surface-soft rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-14 bg-surface-soft rounded-xl" />
              <div className="h-14 bg-surface-soft rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product ||!selectedVariant) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-steel">
        <p className="text-base text-ink font-medium">Không tìm thấy sản phẩm yêu cầu.</p>
        <Link to="/" className="inline-block mt-3 text-xs font-bold text-primary hover:underline">
          Quay lại trang chủ &rarr;
        </Link>
      </div>
    );
  }

  const isProductInactive = product.status === 'INACTIVE' || product.status === 'DISCONTINUED' || (product as any).isActive === false;
  const isVariantInactive = selectedVariant.isActive === false || (selectedVariant as any).status === 'INACTIVE' || (selectedVariant as any).status === 'DISCONTINUED';

  const onHandDisplay = selectedVariant.onHandQty !== undefined 
    ? selectedVariant.onHandQty 
    : (selectedVariant.availableQty ?? 0);
  const reservedDisplay = selectedVariant.reservedQty !== undefined 
    ? selectedVariant.reservedQty 
    : 0;
  const effectiveAvailableQty = Math.max(0, onHandDisplay - reservedDisplay);
  const isOutOfStock = effectiveAvailableQty <= 0 && !isProductInactive && !isVariantInactive;
  const isActionDisabled = isProductInactive || isVariantInactive || effectiveAvailableQty <= 0;

  const flashCountdown = getCountdownParts(flashSaleEndAt, nowMs);
  const isFavorited = isInWishlist(product.productId);
  const isCompared = isInCompare(product.productId);

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    if (isProductInactive) {
      showToast('Sản phẩm này hiện đã ngừng kinh doanh!', 'error');
      return;
    }
    if (isVariantInactive) {
      showToast('Phiên bản này hiện đã ngừng bán! Vui lòng chọn phiên bản khác.', 'error');
      return;
    }
    if (effectiveAvailableQty <= 0) {
      showToast('Phiên bản này hiện đang hết hàng!', 'error');
      return;
    }

    setIsAddingToCart(true);
    try {
      const res = await addItemToCart({
        id: `${product.productId}-${selectedVariant.variantId}`,
        productId: product.productId,
        variantId: selectedVariant.variantId,
        productName: product.name,
        sku: selectedVariant.sku,
        color: selectedVariant.color,
        storage: !selectedVariant.romGb || selectedVariant.romGb <= 0 ? 'Tiêu chuẩn' : (selectedVariant.romGb >= 1024 ? '1TB' : `${selectedVariant.romGb}GB`),
        price: selectedVariant.salePrice,
        originalPrice: selectedVariant.listPrice,
        imageUrl: selectedVariant.imageUrl,
        quantity: 1,
        availableQty: effectiveAvailableQty,
      });

      // Nếu là người dùng vãng lai (chưa đăng nhập): lập tức chuyển hướng sang đăng nhập / đăng ký
      const token = localStorage.getItem('access_token');
      if (!token) {
        showToast('Đã lưu vào giỏ hàng! Vui lòng đăng nhập hoặc đăng ký để tiếp tục mua hàng.', 'info');
        navigate('/auth?redirect=/cart');
        return;
      }

      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'warning');
      }
    } finally {
      setTimeout(() => {
        setIsAddingToCart(false);
      }, 350);
    }
  };

  const handleDirectBuy = (paymentMethod: 'COD' | 'SIMULATED_TRANSFER' = 'COD') => {
    if (isProductInactive) {
      showToast('Sản phẩm này hiện đã ngừng kinh doanh!', 'error');
      return;
    }
    if (isVariantInactive) {
      showToast('Phiên bản này hiện đã ngừng bán! Vui lòng chọn phiên bản khác.', 'error');
      return;
    }
    if (effectiveAvailableQty <= 0) {
      showToast('Phiên bản này hiện đang hết hàng!', 'error');
      return;
    }

    const buyItem = {
      id: `direct-${product.productId}-${selectedVariant.variantId}`,
      productId: product.productId,
      variantId: selectedVariant.variantId,
      productName: product.name,
      sku: selectedVariant.sku,
      color: selectedVariant.color,
      storage: !selectedVariant.romGb || selectedVariant.romGb <= 0 ? 'Tiêu chuẩn' : (selectedVariant.romGb >= 1024 ? '1TB' : `${selectedVariant.romGb}GB`),
      price: selectedVariant.salePrice,
      originalPrice: selectedVariant.listPrice,
      imageUrl: selectedVariant.imageUrl,
      quantity: 1,
      availableQty: effectiveAvailableQty,
    };

    setBuyNowItem(buyItem);

    // Chặn người dùng vãng lai khi Mua ngay -> chuyển sang trang đăng nhập/đăng ký
    const token = localStorage.getItem('access_token');
    if (!token) {
      showToast('Vui lòng đăng nhập hoặc đăng ký tài khoản để tiến hành đặt hàng!', 'info');
      navigate('/auth?redirect=/checkout?buyNow=true');
      return;
    }

    navigate('/checkout?buyNow=true');
  };

  const handleDirectSimulatedHold = async () => {
    if (isOutOfStock) return;
    const res = await orderService.createOrder({
      recipientName: 'Khách hàng',
      recipientPhone: '0987654321',
      shippingAddress: 'Địa chỉ mẫu, Hà Nội',
      paymentMethod: 'SIMULATED_TRANSFER',
      items: [{ variantId: selectedVariant.variantId, quantity: 1 }]
    });

    setReservedOrder({...res,
      variant: selectedVariant,
      paymentMethod: 'SIMULATED_TRANSFER',
    });
    setHoldSecondsLeft(1800);
  };

  const handleToggleCompare = () => {
    if (isCompared) {
      removeFromCompare(product.productId);
      showToast('Đã xóa khỏi danh sách so sánh', 'info');
    } else {
      const res = addToCompare(product, selectedVariant?.variantId);
      if (!res.success) {
        showToast(res.message, 'warning');
      } else {
        showToast("Đã thêm vào bảng so sánh! Bạn có thể vào menu 'So sánh' để xem chi tiết.", 'success');
      }
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() ||!reviewComment.trim()) return;

    // Tìm mã dòng đơn hàng đã hoàn tất (Bảng 22 Reviews liên kết Order_Items)
    const userCompletedOrder = sharedStore.getOrders().find((o: OrderDetail) => 
      o.status === 'COMPLETED' && 
      (o.recipientPhone.includes(reviewerPhone.trim()) || o.recipientName.toLowerCase().includes(reviewerName.trim().toLowerCase())) &&
      o.items.some((i: OrderItemSnapshot) => i.productId === product.productId)
    );
    const matchedOrderItemId = userCompletedOrder?.items.find((i: OrderItemSnapshot) => i.productId === product.productId)?.orderItemId;

    const res = await productService.submitReview({
      orderItemId: matchedOrderItemId,
      productId: product.productId,
      productName: product.name,
      userName: reviewerName.trim(),
      phone: reviewerPhone.trim(),
      rating: ratingScore,
      comment: reviewComment.trim()
    });

    if (res.success && res.review) {
      setReviews([res.review,...reviews]);
      setShowReviewForm(false);
      setReviewComment('');
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'warning');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* 1. BREADCRUMB */}
      <nav className="text-xs text-steel flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/products?category=phone" className="hover:text-primary transition-colors">Điện thoại</Link>
        <span>/</span>
        <span className="text-charcoal">{product.brandName}</span>
        <span>/</span>
        <span className="text-ink font-semibold">{product.name}</span>
      </nav>

      {/* 2. PRODUCT HEADER TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-ink-deep tracking-tight">
            {product.name} {selectedVariant.romGb && selectedVariant.romGb > 0 ? (selectedVariant.romGb >= 1024 ? '1TB' : `${selectedVariant.romGb}GB`) : ''}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-steel">
            <RatingStars
              rating={currentAverageRating}
              reviewCount={currentReviewCount}
              size={14}
            />
            <span className="text-hairline">|</span>
            <span>Mã SKU: <strong className="font-mono text-ink font-medium">{selectedVariant.sku}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          {/* Nút so sánh (ẩn đối với ngành hàng Phụ kiện di động) */}
          {!isAccessory && (
            <button
              onClick={handleToggleCompare}
              className={`px-4 py-2 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${
                isCompared? 'bg-ink-deep border-ink-deep text-canvas': 'bg-canvas border-hairline-soft text-charcoal hover:border-charcoal'
              }`}
            >
              <Scale size={14} />
              <span>{isCompared? 'Đang so sánh': 'So sánh'}</span>
            </button>
          )}

          {/* Nút yêu thích */}
          <button
            onClick={() => toggleWishlist(product.productId)}
            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${
              isFavorited? 'bg-critical/10 border-critical text-critical': 'bg-canvas border-hairline-soft text-charcoal hover:border-charcoal'
            }`}
          >
            <Heart size={14} className={isFavorited? 'fill-critical text-critical': ''} />
            <span>{isFavorited? 'Đã yêu thích': 'Yêu thích'}</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN PRODUCT INTERACTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Gallery (5 cols) - Chỉ sticky trên desktop lg, mobile cuộn tự nhiên tránh bị đè */}
        <div className="lg:col-span-5 bg-canvas border border-hairline-soft rounded-xxl p-4 sm:p-6 lg:sticky lg:top-24">
          <div className="h-80 sm:h-96 flex items-center justify-center p-6 bg-surface-soft rounded-xl relative overflow-hidden">
            {product.isFlashSale && (
              <span className="absolute top-4 left-4 z-10 bg-warning text-ink-deep text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                <Zap size={12} className="fill-ink-deep text-ink-deep" />
                <span>Flash Sale</span>
              </span>
            )}
            <img
              src={activeImage || product.thumbnail}
              alt={product.name}
              className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/500x500/f1f4f7/5d6c7b?text=NextGen';
              }}
            />
          </div>

          <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1 justify-center">
            {product.gallery.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`w-14 h-14 rounded-lg border p-1 bg-canvas flex items-center justify-center transition-all ${
                  activeImage === img? 'border-ink-deep ring-2 ring-ink-deep': 'border-hairline-soft hover:border-charcoal'
                }`}
              >
                <img 
                  src={img} 
                  alt="thumb" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f1f4f7/5d6c7b?text=NextGen';
                  }}
                />
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-surface-soft rounded-xl border border-hairline-soft text-xs space-y-2.5 text-charcoal">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <span>{product.warrantyPolicy}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <RotateCcw size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <span>Hư gì đổi nấy trong 30 ngày đầu tiên tận nhà.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Truck size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <span>Giao hàng nhanh miễn phí toàn quốc, hỗ trợ kiểm hàng trước khi trả tiền.</span>
            </div>
          </div>
        </div>

        {/* Right Product Configuration & Action (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="rounded-xl border border-hairline-soft overflow-hidden">
            {product.isFlashSale && (
              <div className="bg-[#0b0f19] dark:bg-[#111827] text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider">
                    Flash Sale
                  </span>
                  <span className="text-xs font-bold text-white">Giờ vàng giá sốc</span>
                </div>
                <div className="flex items-center gap-2 text-xs bg-amber-400/15 border border-amber-400/40 px-3 py-1 rounded-full backdrop-blur-xs">
                  <span className="text-amber-300 font-bold uppercase tracking-wider text-[10px]">Kết thúc sau:</span>
                  <div className="flex items-center gap-1 font-mono font-black text-xs">
                    <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-mono shadow-xs">{flashCountdown.hours}</span>
                    <span className="text-amber-400 font-black animate-pulse">:</span>
                    <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-mono shadow-xs">{flashCountdown.minutes}</span>
                    <span className="text-amber-400 font-black animate-pulse">:</span>
                    <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-mono shadow-xs">{flashCountdown.seconds}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="p-5 bg-surface-soft">
              <div className="flex items-baseline justify-between flex-wrap gap-3">
                <PriceDisplay
                  salePrice={selectedVariant.salePrice || selectedVariant.listPrice || 0}
                  listPrice={selectedVariant.listPrice && selectedVariant.listPrice > (selectedVariant.salePrice || 0) ? selectedVariant.listPrice : undefined}
                  size="xl"
                />
                {selectedVariant.listPrice && selectedVariant.listPrice > (selectedVariant.salePrice || 0) && (
                  <span className="text-xs text-steel">
                    Tiết kiệm: <strong className="text-emerald-700 font-bold">{formatVND(selectedVariant.listPrice - (selectedVariant.salePrice || 0))}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Variant Selector */}
          <div className="bg-canvas border border-hairline-soft rounded-xl p-5">
            <VariantSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelectVariant={(v) => {
                setSelectedVariant(v);
                setActiveImage(v.imageUrl);
              }}
            />
          </div>

          {/* Banner Trạng thái Ngừng kinh doanh (Sản phẩm hoặc Biến thể) */}
          {isProductInactive ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs">
              <Ban className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <strong className="block font-bold text-sm text-rose-900 uppercase">
                  Sản phẩm tạm ngừng kinh doanh
                </strong>
                <span>
                  Sản phẩm này hiện đã ngừng phân phối hoặc tạm ngừng kinh doanh trên toàn hệ thống.
                </span>
              </div>
            </div>
          ) : isVariantInactive ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <strong className="block font-bold text-xs text-amber-900 uppercase">
                  Phiên bản này đã ngừng kinh doanh
                </strong>
                <span>
                  Tùy chọn ({selectedVariant.color} {selectedVariant.romGb ? (selectedVariant.romGb >= 1024 ? '1TB' : `${selectedVariant.romGb}GB`) : ''}) này hiện đã ngừng bán. Quý khách vui lòng chọn màu sắc hoặc dung lượng khác.
                </span>
              </div>
            </div>
          ) : null}

          {/* Promotion / Gift Box */}
          {product.giftDescription && (
            <div className="border border-hairline-soft bg-surface-soft rounded-xl p-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-ink-deep uppercase tracking-wide mb-2">
                <Gift size={15} className="text-primary" />
                <span>Khuyến mãi đặc biệt kèm theo:</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-charcoal text-xs pl-1">
                <li>{product.giftDescription}</li>
                <li>Tặng gói bảo hành rơi vỡ 6 tháng chính hãng.</li>
                <li>Giảm thêm 300.000₫ khi thanh toán quét mã QR qua ngân hàng.</li>
              </ul>
            </div>
          )}

          {/* Action Buy Buttons: 2 nút MUA NGAY & THÊM VÀO GIỎ HÀNG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              disabled={isActionDisabled || isAddingToCart}
              onClick={handleAddToCart}
              className={`btn-secondary py-3.5 px-6 rounded-full font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 ${
                isAddingToCart ? 'border-success text-success bg-surface-soft' : ''
              }`}
            >
              {isAddingToCart ? (
                <Check size={16} className="text-success stroke-[3]" />
              ) : (
                <ShoppingBag size={16} />
              )}
              <span>
                {isAddingToCart
                  ? 'ĐÃ THÊM VÀO GIỎ ✓'
                  : isProductInactive
                  ? 'NGỪNG KINH DOANH'
                  : isVariantInactive
                  ? 'PHIÊN BẢN NGỪNG BÁN'
                  : isOutOfStock
                  ? 'TẠM HẾT HÀNG'
                  : 'THÊM VÀO GIỎ HÀNG'}
              </span>
            </button>

            <button
              disabled={isActionDisabled}
              onClick={() => handleDirectBuy('COD')}
              className="btn-buy py-3.5 px-6 rounded-full font-bold text-sm text-center shadow-sticky disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isProductInactive
                ? 'NGỪNG KINH DOANH'
                : isVariantInactive
                ? 'PHIÊN BẢN NGỪNG BÁN'
                : isOutOfStock
                ? 'TẠM HẾT HÀNG'
                : 'MUA NGAY'}
            </button>
          </div>

          {/* Highlights */}
          <div className="bg-canvas border border-hairline-soft rounded-xl p-5">
            <h4 className="font-bold text-xs text-ink-deep uppercase tracking-wider mb-3">Đặc điểm nổi bật:</h4>
            <ul className="space-y-2 text-xs text-charcoal">
              {product.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle size={15} className="text-success flex-shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Specs Table */}
          <ProductSpecsTable specGroups={product.specGroups} />

        </div>

      </div>

      {/* 4. CUSTOMER REVIEWS & RATINGS SECTION */}
      <section className="bg-canvas border border-hairline-soft rounded-xxl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-hairline-soft">
          <div>
            <h3 className="text-lg font-medium text-ink-deep tracking-tight flex items-center gap-2.5">
              <MessageSquare size={18} className="text-primary" />
              <span>Khách hàng đánh giá & Nhận xét thực tế ({currentReviewCount})</span>
            </h3>
            <p className="text-xs text-steel mt-1">
              Chỉ những khách hàng đã mua sản phẩm và đơn hàng đạt trạng thái <strong>Hoàn tất</strong> mới được xác thực đánh giá.
            </p>
          </div>

          <button
            onClick={() => {
              if (!showReviewForm && user) {
                setReviewerName(user.fullName || '');
                setReviewerPhone(user.phone || '');
              }
              setShowReviewForm(!showReviewForm);
            }}
            className="btn-marketing px-5 py-2.5 text-xs font-bold rounded-full self-start sm:self-auto"
          >
            {showReviewForm? 'Đóng biểu mẫu': 'Viết đánh giá của bạn'}
          </button>
        </div>

        {/* Rating Overview Summary Box */}
        {currentReviewCount > 0 ? (
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-surface-soft/60 border border-hairline-soft rounded-2xl">
            <div className="flex flex-col items-center justify-center sm:border-r sm:border-hairline-soft sm:pr-8 text-center min-w-[150px]">
              <span className="text-4xl font-extrabold text-ink-deep dark:text-amber-300 tracking-tight leading-none">
                {currentAverageRating.toFixed(1)}
              </span>
              <div className="mt-2.5">
                <RatingStars rating={currentAverageRating} reviewCount={currentReviewCount} hideCount size={16} />
              </div>
              <span className="text-xs text-steel mt-2 font-medium">
                {currentReviewCount} lượt đánh giá thực tế
              </span>
            </div>

            {/* Star Distribution Bars */}
            <div className="flex-1 w-full space-y-1.5 text-xs">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => Math.round(Number(r.rating) || 0) === star).length;
                const percent = currentReviewCount > 0 ? Math.round((count / currentReviewCount) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2.5">
                    <span className="w-12 text-steel font-medium text-right flex items-center justify-end gap-1">
                      {star} <Star size={11} className="fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2 bg-hairline-soft/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-12 text-[11px] text-steel font-mono text-left">
                      {count} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center bg-surface-soft/40 border border-hairline-soft/60 rounded-2xl flex flex-col items-center justify-center">
            <RatingStars rating={0} reviewCount={0} size={18} />
            <p className="text-xs text-steel mt-2">
              Sản phẩm hiện chưa có đánh giá nào. Hãy là người đầu tiên trải nghiệm và chia sẻ nhận xét!
            </p>
          </div>
        )}

        {/* Review Form Drawer/Collapse */}
        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="bg-surface-soft border border-hairline-soft rounded-xl p-5 space-y-4 text-xs">
            <h4 className="font-bold text-ink-deep text-sm">Đánh giá sản phẩm {product.name}</h4>
            
            {/* Star selector */}
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-charcoal">Chọn số sao:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setRatingScore(s)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      size={18}
                      className={s <= ratingScore? 'fill-warning text-warning': 'text-hairline'}
                    />
                  </button>
                ))}
              </div>
              <span className="text-charcoal font-bold">({ratingScore} sao)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Họ và tên của bạn..."
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="h-11 px-4 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Số điện thoại đã mua hàng..."
                value={reviewerPhone}
                onChange={(e) => setReviewerPhone(e.target.value)}
                className="h-11 px-4 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            <textarea
              required
              rows={3}
              placeholder="Chia sẻ cảm nhận thực tế về thiết kế, hiệu năng, camera hoặc pin của máy..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full p-4 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
            />

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="btn-ghost px-4 py-2 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-marketing px-5 py-2 text-xs font-bold"
              >
                Gửi nhận xét
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        <div className="divide-y divide-hairline-soft">
          {reviews.map((rev) => (
            <div key={rev.reviewId} className="py-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-surface-soft font-bold text-ink flex items-center justify-center border border-hairline-soft">
                    {rev.userName.charAt(0)}
                  </div>
                  <div>
                    <strong className="text-ink-deep block font-bold">{rev.userName}</strong>
                    <div className="flex items-center gap-2 text-[10px] text-steel">
                      <span>{rev.userPhoneMasked}</span>
                      <span>•</span>
                      <span>{rev.createdAt.split('T')[0]}</span>
                    </div>
                  </div>
                </div>

                {rev.isBuyerVerified && (
                  <span className="text-[10px] font-bold text-success bg-surface-soft px-3 py-1 rounded-full border border-success/30 flex items-center gap-1.5">
                    <UserCheck size={12} />
                    <span>Đã mua hàng tại NextGen Smart Tech</span>
                  </span>
                )}
              </div>

              {/* Star rating */}
              <div className="flex items-center text-warning">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={13}
                    className={s <= rev.rating? 'fill-warning text-warning': 'text-hairline'}
                  />
                ))}
              </div>

              <p className="text-charcoal leading-relaxed">{rev.comment}</p>

              {/* Real attached images */}
              {rev.images && rev.images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {rev.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Ảnh đánh giá thực tế ${i + 1}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-hairline-soft shadow-xs cursor-pointer hover:opacity-90 transition hover:scale-105"
                      onClick={() => window.open(img, '_blank')}
                      title="Nhấn để xem ảnh gốc kích thước lớn"
                    />
                  ))}
                </div>
              )}

              {/* Store reply */}
              {rev.storeReply && (
                <div className="ml-4 p-3.5 bg-surface-soft border-l-2 border-primary rounded-r-lg text-[11px] text-charcoal space-y-1">
                  <div className="font-bold text-ink-deep flex items-center gap-1">
                    <span>Phản hồi từ Quản trị viên NextGen Smart Tech:</span>
                  </div>
                  <p>{rev.storeReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 5. RELATED PRODUCTS SECTION */}
      {relatedProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-ink-deep tracking-tight">
              Sản phẩm tương tự cùng phân khúc
            </h3>
            <Link to="/products?category=phone" className="text-xs text-primary font-bold hover:underline">
              Xem tất cả &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map(p => (
              <ProductCard key={p.productId} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* MODAL HOLD STOCK 30 PHÚT */}
      {reservedOrder && (
        <div className="fixed inset-0 bg-ink-deep/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline-soft rounded-xxl max-w-md w-full p-6 shadow-sticky relative">
            <div className="w-12 h-12 bg-surface-soft text-success rounded-full flex items-center justify-center mx-auto mb-3 border border-success/30">
              <CheckCircle size={28} />
            </div>

            <h3 className="text-lg font-bold text-ink-deep text-center">
              Đặt hàng & Giữ chỗ tồn kho thành công!
            </h3>
            <p className="text-xs text-steel text-center mt-1">
              Mã đơn hàng: <strong className="text-ink-deep font-mono text-sm">{reservedOrder.orderCode}</strong>
            </p>

            <div className="bg-surface-soft border border-hairline-soft rounded-xl p-4 my-4 text-xs space-y-2.5">
              <div className="flex justify-between text-charcoal">
                <span>Sản phẩm:</span>
                <strong className="text-ink-deep">{product.name} ({reservedOrder.variant.color})</strong>
              </div>
              <div className="flex justify-between text-charcoal">
                <span>Tổng tiền thanh toán:</span>
                <strong className="text-ink-deep text-sm font-bold">{formatVND(reservedOrder.variant.salePrice)}</strong>
              </div>
              <div className="pt-2.5 border-t border-hairline-soft flex items-center justify-between text-charcoal bg-canvas p-2.5 rounded-lg border border-hairline-soft">
                <span className="flex items-center gap-1.5 font-bold">
                  <Clock size={14} className="text-primary" /> Thời gian giữ chỗ tồn kho:
                </span>
                <span className="font-mono font-bold text-critical text-sm">
                  {Math.floor(holdSecondsLeft / 60)}:{('0' + (holdSecondsLeft % 60)).slice(-2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setReservedOrder(null)}
                className="btn-secondary flex-1 py-3 text-xs"
              >
                Đóng
              </button>
              <Link
                to={`/orders?code=${reservedOrder.orderCode}`}
                className="btn-buy flex-1 py-3 text-xs text-center font-bold"
              >
                Xem tiến trình đơn &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
