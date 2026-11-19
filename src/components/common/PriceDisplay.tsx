import React from 'react';
import { formatVND } from '../../utils/orderFormatters';

export { formatVND };

interface PriceDisplayProps {
  salePrice: number;
  listPrice?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDiscountPercent?: boolean;
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  salePrice,
  listPrice,
  size = 'md',
  showDiscountPercent = true,
  className = '',
}) => {
  const hasDiscount = listPrice && listPrice > salePrice;
  const discountPercent = hasDiscount
    ? Math.round(((listPrice - salePrice) / listPrice) * 100)
    : 0;

  // Typography hierarchy from DESIGN-meta.md
  const sizeClasses = {
    sm: 'text-sm font-bold text-ink-deep',
    md: 'text-base font-bold text-ink-deep',
    lg: 'text-xl font-bold text-ink-deep',
    xl: 'text-2xl sm:text-3xl font-bold text-ink-deep tracking-tight',
  };

  const listSizeClasses = {
    sm: 'text-xs text-steel line-through',
    md: 'text-xs text-steel line-through',
    lg: 'text-sm text-steel line-through',
    xl: 'text-base text-steel line-through',
  };

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={sizeClasses[size]}>{formatVND(salePrice)}</span>
      {hasDiscount && (
        <>
          <span className={listSizeClasses[size]}>{formatVND(listPrice)}</span>
          {showDiscountPercent && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-warning text-ink-deep inline-flex items-center">
              -{discountPercent}%
            </span>
          )}
        </>
      )}
    </div>
  );
};
