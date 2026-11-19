import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: number;
  hideCount?: boolean;
  showScore?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  reviewCount,
  size = 14,
  hideCount = false,
  showScore = true,
}) => {
  const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
  // Có đánh giá nếu reviewCount > 0, hoặc nếu reviewCount không được truyền và safeRating > 0
  const hasReviews = reviewCount !== undefined ? reviewCount > 0 : safeRating > 0;

  return (
    <div className="flex items-center gap-1 text-xs select-none">
      <div className="flex items-center gap-0.5 text-amber-400 flex-shrink-0">
        {[1, 2, 3, 4, 5].map((i) => {
          // Tính % tô màu cho ngôi sao thứ i (0% đến 100%)
          const fillPercent = hasReviews
            ? Math.max(0, Math.min(100, Math.round((safeRating - (i - 1)) * 100)))
            : 0;

          return (
            <div
              key={i}
              className="relative inline-flex items-center justify-center flex-shrink-0"
              style={{ width: size, height: size }}
            >
              {/* Ngôi sao nền xám */}
              <Star size={size} className="text-stone-300 dark:text-stone-600 flex-shrink-0" />
              {/* Ngôi sao vàng được crop theo % trung bình thực tế */}
              {fillPercent > 0 && (
                <div
                  className="absolute top-0 left-0 h-full overflow-hidden flex-shrink-0 pointer-events-none"
                  style={{ width: `${fillPercent}%` }}
                >
                  <Star
                    size={size}
                    className="fill-amber-400 text-amber-400 flex-shrink-0"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hasReviews ? (
        <>
          {showScore && (
            <span className="font-bold text-ink-deep dark:text-amber-300 ml-0.5 text-[11px] leading-none">
              {safeRating.toFixed(1)}
            </span>
          )}
          {!hideCount && reviewCount !== undefined && reviewCount > 0 && (
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
