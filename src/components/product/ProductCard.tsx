import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types/product';
import { PriceDisplay, formatVND } from '../common/PriceDisplay';
import { RatingStars } from '../common/RatingStars';
import { Heart, Scale, Gift, Sparkles, Zap } from 'lucide-react';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useCompareStore } from '../../stores/compareStore';
import { useToastStore } from '../../stores/toastStore';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false }) => {
  const defaultVariant = product.variants[0];
  const variantPrices = product.variants.map(v => (v.salePrice > 0? v.salePrice: v.listPrice || 0)).filter(p => p > 0);
  const minPrice = variantPrices.length > 0? Math.min(...variantPrices): defaultVariant?.salePrice || 0;
  const maxPrice = variantPrices.length > 0? Math.max(...variantPrices): defaultVariant?.salePrice || 0;
  const isMultiPrice = minPrice > 0 && maxPrice > minPrice;

  const salePrice = defaultVariant?.salePrice || minPrice || 0;
  const listPrice = defaultVariant?.listPrice || 0;

  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { isInCompare, addToCompare, removeFromCompare } = useCompareStore();
  const { showToast } = useToastStore();

  const isFavorited = isInWishlist(product.productId);
  const isCompared = isInCompare(product.productId);

  const displaySpec = product.specGroups?.find(g => g.groupName.toLowerCase().includes('màn'))?.items[0]?.value || '';
  const chipSpec = product.specGroups?.find(g => g.groupName.toLowerCase().includes('cpu') || g.groupName.toLowerCase().includes('cấu hình'))?.items.find(i => i.name.toLowerCase().includes('chip'))?.value || '';

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.productId);
    showToast(
      isFavorited? `Đã bỏ "${product.name}" khỏi danh sách yêu thích`: `Đã lưu "${product.name}" vào danh sách yêu thích!`,
      'info'
    );
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCompared) {
      removeFromCompare(product.productId);
      showToast(`Đã bỏ "${product.name}" khỏi bảng so sánh`, 'info');
    } else {
      const res = addToCompare(product.productId);
      if (!res.success) {
        showToast(res.message, 'warning');
      } else {
        showToast(`Đã thêm "${product.name}" vào bảng so sánh!`, 'success');
      }
    }
  };

  const isInactive = product.status === 'INACTIVE' || product.status === 'DISCONTINUED' || (product as any).isActive === false;

  return (
    <div className={`group bg-canvas border border-hairline-soft rounded-2xl flex flex-col justify-between hover:border-hairline transition-all duration-200 relative h-full w-full shadow-xs hover:shadow-subtle ${
      compact? 'p-2.5 sm:p-3': 'p-3.5 sm:p-4'
    } ${isInactive ? 'opacity-90' : ''}`}>
      
      {/* Top Badges & Quick Action Floating */}
      <div className={`flex items-center justify-between gap-1 mb-1 z-10 ${compact? 'min-h-[22px]': 'min-h-[26px]'}`}>
        <div className="flex flex-wrap gap-1">
          {isInactive ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
              Ngừng kinh doanh
            </span>
          ) : (
            <>
              {product.isFlashSale && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning text-ink-deep flex items-center gap-1 uppercase tracking-wider">
                  <Zap size={10} className="fill-ink-deep text-ink-deep" />
                  <span>Flash Sale</span>
                </span>
              )}
              {product.isInstallment0 &&!compact && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-soft text-ink border border-hairline-soft">
                  Trả góp 0%
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* So sánh nút */}
          <button
            onClick={handleCompareClick}
            title={isCompared? "Xóa khỏi so sánh": "Thêm vào so sánh"}
            className={`${compact? 'w-6 h-6': 'w-7 h-7'} rounded-full flex items-center justify-center transition-colors ${
              isCompared? 'text-primary bg-primary-soft/15 border border-primary': 'text-steel hover:text-ink hover:bg-surface-soft border border-hairline-soft'
            }`}
          >
            <Scale size={compact? 11: 13} />
          </button>

          {/* Yêu thích nút */}
          <button 
            aria-label="Yêu thích" 
            onClick={handleFavoriteClick}
            className={`${compact? 'w-6 h-6': 'w-7 h-7'} rounded-full flex items-center justify-center transition-colors ${
              isFavorited? 'text-critical bg-critical/10 border border-critical': 'text-steel hover:text-critical hover:bg-surface-soft border border-hairline-soft'
            }`}
          >
            <Heart size={compact? 11: 13} className={isFavorited? 'fill-critical': ''} />
          </button>
        </div>
      </div>

      {/* Product Image */}
      <Link 
        to={`/product/${product.productId}`} 
        className={`block relative overflow-hidden flex items-center justify-center w-full bg-surface-soft rounded-lg p-2 ${
          compact? 'my-0.5 h-28 sm:h-32': 'my-1 h-36 sm:h-40'
        }`}
      >
        <img
          src={defaultVariant?.imageUrl || product.thumbnail}
          alt={product.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f1f4f7/5d6c7b?text=Device';
          }}
        />
      </Link>

      {/* Content Area */}
      <div className={`flex flex-col flex-1 justify-between ${compact? 'pt-1 space-y-1': 'pt-1.5 space-y-1.5'}`}>
        <div>
          {/* Storage pills if multiple versions (chỉ hiện ngoài flash sale) */}
          {!compact && (
            product.variants.some(v => (v.romGb || 0) > 0) ? (
              <div className="flex gap-1 mb-1 overflow-x-auto no-scrollbar text-[10px] min-h-[22px] items-center">
                {Array.from(new Set(product.variants.map(v => v.romGb).filter((r): r is number => typeof r === 'number' && r > 0))).map(rom => (
                  <span 
                    key={rom}
                    className={`px-2 py-0.5 rounded-full font-bold border ${
                      rom === defaultVariant.romGb? 'border-ink-deep text-canvas bg-ink-deep': 'border-hairline text-steel bg-canvas'
                    }`}
                  >
                    {rom >= 1024? '1TB': `${rom}GB`}
                  </span>
                ))}
              </div>
            ): (
              <div className="flex items-center gap-1 mb-1 text-[10px] min-h-[22px]">
                <span className="text-[10px] font-semibold text-steel/80 bg-surface-soft/60 px-2 py-0.5 rounded-full border border-hairline-soft/40">
                  {product.categoryName} chính hãng
                </span>
              </div>
            )
          )}

          {/* Product Title */}
          <Link to={`/product/${product.productId}`} className="block">
            <h3 className={`font-bold text-ink-deep line-clamp-2 leading-snug hover:text-primary transition-colors ${
              compact? 'text-xs h-8': 'text-xs sm:text-sm h-9'
            }`}>
              {product.name}
            </h3>
          </Link>

          {/* Key Specs tags (chỉ hiện ngoài flash sale) */}
          {!compact && (
            <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-steel min-h-[20px] items-center">
              {displaySpec && (
                <span className="bg-surface-soft border border-hairline-soft px-1.5 py-0.5 rounded">
                  {displaySpec.split('-')[0].trim()}
                </span>
              )}
              {chipSpec && (
                <span className="bg-surface-soft border border-hairline-soft px-1.5 py-0.5 rounded truncate max-w-[120px]">
                  {chipSpec}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing & Gift */}
        <div className={compact? 'pt-0.5': 'pt-1'}>
          <div className={`${compact? 'min-h-[28px]': 'min-h-[36px]'} flex flex-col justify-center`}>
            {isMultiPrice ? (
              <div className="space-y-0.5">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-steel">Từ</span>
                  <span className={`${compact ? 'text-sm' : 'text-sm sm:text-base'} font-bold text-ink-deep tabular-nums`}>
                    {formatVND(minPrice)}
                  </span>
                  {listPrice > minPrice && (
                    <span className="text-[11px] text-steel line-through">
                      {formatVND(listPrice)}
                    </span>
                  )}
                </div>
                {!compact && (
                  <div className="text-[10px] text-steel">
                    (Đến {formatVND(maxPrice)})
                  </div>
                )}
              </div>
            ) : (
              <PriceDisplay salePrice={salePrice} listPrice={listPrice > salePrice ? listPrice : undefined} size="sm" />
            )}
          </div>

          {/* Gift promotion preview (chỉ hiện ngoài flash sale) */}
          {!compact && (
            <div className="min-h-[28px] mt-1.5 flex items-center">
              {product.giftDescription? (
                <div className="w-full text-[11px] text-ink bg-surface-soft border border-hairline-soft rounded-md p-1.5 line-clamp-1 flex items-center gap-1.5">
                  <Gift size={12} className="text-primary flex-shrink-0" />
                  <span className="truncate">{product.giftDescription}</span>
                </div>
              ): (
                <div className="w-full text-[11px] text-steel bg-surface-soft/40 border border-hairline-soft/40 rounded-md p-1.5 line-clamp-1 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-amber-500 flex-shrink-0" />
                  <span className="truncate text-charcoal/80">Bảo hành VAT chính hãng</span>
                </div>
              )}
            </div>
          )}

          {/* Rating & Sold count */}
          <div className={`flex items-center justify-between text-[11px] border-t border-hairline-soft/60 ${
            compact? 'mt-1 pt-1 min-h-[20px]': 'mt-2 pt-1.5 min-h-[24px]'
          }`}>
            <RatingStars rating={product.rating} reviewCount={compact? 0: product.reviewCount} size={compact? 10: 11} />
            <span className="text-steel font-mono text-[10px]">Đã bán {product.soldCount ?? 0}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
