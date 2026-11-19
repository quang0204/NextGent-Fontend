import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: number;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  reviewCount,
  size = 14,
}) => {
  const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
  const hasReviews = (reviewCount !== undefined ? reviewCount > 0 : false) || safeRating > 0;

  return (
    <div className="flex items-center gap-1 text-xs select-none">
      <div className="flex items-center text-amber-400 flex-shrink-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={`${
              hasReviews && i <= Math.round(safeRating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-stone-300 dark:text-stone-600'
            }`}
          />
        ))}
      </div>
      {hasReviews ? (
        <>
          <span className="font-bold text-ink-deep dark:text-amber-300 ml-0.5 text-[11px] leading-none">
            {safeRating.toFixed(1)}
          </span>
          {reviewCount !== undefined && reviewCount > 0 && (
            <span className="text-steel font-medium text-[10px] leading-none">
              ({reviewCount})
            </span>
          )}
        </>
      ) : (
        <span className="text-steel font-normal text-[10px] leading-none ml-0.5">
          Chưa có đánh giá
        </span>
      )}
    </div>
  );
};
