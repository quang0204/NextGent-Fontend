import React from 'react';

interface ProductCardSkeletonProps {
  compact?: boolean;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ compact = false }) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-canvas border border-hairline-soft rounded-2xl flex flex-col justify-between relative h-full w-full shadow-xs animate-pulse ${
        compact ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'
      }`}
    >
      {/* Top Badges row */}
      <div className={`flex items-center justify-between gap-1 mb-1 ${compact ? 'min-h-[22px]' : 'min-h-[26px]'}`}>
        <div className="h-4 w-16 bg-surface-soft rounded-full" />
        <div className="flex gap-1">
          <div className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} rounded-full bg-surface-soft`} />
          <div className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} rounded-full bg-surface-soft`} />
        </div>
      </div>

      {/* Image box */}
      <div
        className={`w-full bg-surface-soft rounded-lg flex items-center justify-center ${
          compact ? 'my-0.5 h-28 sm:h-32' : 'my-1 h-36 sm:h-40'
        }`}
      >
        <div className="w-16 h-16 rounded-xl bg-hairline-soft/40" />
      </div>

      {/* Content Area */}
      <div className={`flex flex-col flex-1 justify-between ${compact ? 'pt-1 space-y-1' : 'pt-1.5 space-y-1.5'}`}>
        <div>
          {/* ROM pills / Category badge */}
          {!compact && (
            <div className="flex gap-1 mb-1 min-h-[22px] items-center">
              <div className="h-4 w-12 bg-surface-soft rounded-full" />
              <div className="h-4 w-12 bg-surface-soft rounded-full" />
            </div>
          )}

          {/* Product Title */}
          <div className={`flex flex-col justify-center space-y-1 ${compact ? 'h-8' : 'h-9'}`}>
            <div className="h-3.5 w-5/6 bg-surface-soft rounded" />
            <div className="h-3 w-1/2 bg-surface-soft rounded" />
          </div>

          {/* Key Specs tags */}
          {!compact && (
            <div className="flex gap-1 mt-1 min-h-[20px] items-center">
              <div className="h-4 w-14 bg-surface-soft rounded" />
              <div className="h-4 w-16 bg-surface-soft rounded" />
            </div>
          )}
        </div>

        {/* Pricing & Gift */}
        <div className={compact ? 'pt-0.5' : 'pt-1'}>
          <div className={`${compact ? 'min-h-[28px]' : 'min-h-[36px]'} flex flex-col justify-center`}>
            <div className="h-5 w-24 bg-surface-soft rounded" />
          </div>

          {!compact && (
            <div className="min-h-[28px] mt-1.5 flex items-center">
              <div className="w-full h-6 bg-surface-soft rounded-md" />
            </div>
          )}

          {/* Rating & Sold count */}
          <div
            className={`flex items-center justify-between border-t border-hairline-soft/60 ${
              compact ? 'mt-1 pt-1 min-h-[20px]' : 'mt-2 pt-1.5 min-h-[24px]'
            }`}
          >
            <div className="h-3 w-16 bg-surface-soft rounded" />
            <div className="h-3 w-12 bg-surface-soft rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
