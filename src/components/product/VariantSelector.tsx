import React from 'react';
import { ProductVariant } from '../../types/product';
import { formatVND } from '../common/PriceDisplay';
import { Check } from 'lucide-react';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  onSelectVariant: (variant: ProductVariant) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariant,
  onSelectVariant,
}) => {
  // Kiểm tra trạng thái hoạt động của biến thể
  const isVariantActive = (v: ProductVariant) => {
    return v.isActive !== false && (v as any).status !== 'INACTIVE' && (v as any).status !== 'DISCONTINUED';
  };

  // Tính số lượng tồn kho khả dụng thực tế
  const getVariantAvailableQty = (v: ProductVariant) => {
    if (v.availableQty !== undefined && v.availableQty !== null) {
      return v.availableQty;
    }
    const onHand = v.onHandQty ?? 0;
    const reserved = v.reservedQty ?? 0;
    return Math.max(0, onHand - reserved);
  };

  // Gom danh sách ROM duy nhất (chỉ lấy khi sản phẩm thực tế có cấu hình ROM > 0)
  const hasStorageVariants = variants.some(v => v.romGb && v.romGb > 0);
  const uniqueRoms = hasStorageVariants
    ? Array.from(new Set(variants.map(v => v.romGb || 0).filter(r => r > 0))).sort((a, b) => a - b)
    : [];

  // Gom danh sách biến thể có sẵn cho ROM hiện tại (nếu không có cấu hình ROM thì lấy toàn bộ variants)
  const colorsForCurrentRom = hasStorageVariants
    ? variants.filter(v => (v.romGb || 0) === (selectedVariant.romGb || 0))
    : variants;

  const handleRomChange = (rom: number) => {
    const romVariants = variants.filter(v => (v.romGb || 0) === rom);
    if (!romVariants.length) return;

    // Ưu tiên 1: Biến thể cùng màu sắc và còn hàng
    const matchSameColorAvailable = romVariants.find(
      v => v.color === selectedVariant.color && isVariantActive(v) && getVariantAvailableQty(v) > 0
    );
    if (matchSameColorAvailable) {
      onSelectVariant(matchSameColorAvailable);
      return;
    }

    // Ưu tiên 2: Biến thể đầu tiên của ROM đó CÒN HÀNG
    const firstAvailable = romVariants.find(
      v => isVariantActive(v) && getVariantAvailableQty(v) > 0
    );
    if (firstAvailable) {
      onSelectVariant(firstAvailable);
      return;
    }

    // Ưu tiên 3: Biến thể cùng màu sắc (kể cả hết hàng)
    const matchSameColor = romVariants.find(v => v.color === selectedVariant.color);
    if (matchSameColor) {
      onSelectVariant(matchSameColor);
      return;
    }

    // Cuối cùng: biến thể đầu tiên của ROM đó
    onSelectVariant(romVariants[0]);
  };

  return (
    <div className="space-y-5">
      
      {/* 1. Lựa chọn Dung lượng ROM (chỉ hiển thị khi sản phẩm có tùy chọn ROM) */}
      {hasStorageVariants && (
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-700 uppercase">1. Chọn phiên bản bộ nhớ:</span>
            <span className="text-slate-400 font-mono text-[11px]">SKU: {selectedVariant.sku}</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {uniqueRoms.map((rom) => {
              const romVariants = variants.filter(v => (v.romGb || 0) === rom);
              const availableRomVariants = romVariants.filter(
                v => isVariantActive(v) && getVariantAvailableQty(v) > 0
              );
              // ROM chỉ hết hàng khi TẤT CẢ biến thể màu thuộc ROM này đều hết hàng hoặc ngừng bán
              const isRomOutOfStock = romVariants.length > 0 && availableRomVariants.length === 0;

              // Ưu tiên hiển thị giá theo màu hiện tại nếu còn hàng, hoặc lấy biến thể còn hàng đầu tiên
              const matchCurrentColor = romVariants.find(v => v.color === selectedVariant.color);
              const vSample = (matchCurrentColor && isVariantActive(matchCurrentColor) && getVariantAvailableQty(matchCurrentColor) > 0)
                ? matchCurrentColor
                : (availableRomVariants[0] || matchCurrentColor || romVariants[0]);

              const isSelected = (selectedVariant.romGb || 0) === rom;

              return (
                <button
                  key={rom}
                  disabled={isRomOutOfStock}
                  onClick={() => handleRomChange(rom)}
                  className={`p-3 rounded-lg text-left transition-all relative ${
                    isRomOutOfStock
                      ? 'border border-hairline bg-surface-soft opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'border-2 border-primary bg-canvas text-ink-deep'
                      : 'border border-hairline bg-canvas hover:border-slate text-ink'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                  <div className="font-bold text-xs">{rom <= 0 ? 'Tiêu chuẩn' : (rom >= 1024 ? '1 TB' : `${rom} GB`)}</div>
                  <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                    <span className="text-xs font-bold text-ink-deep">
                      {vSample ? formatVND(vSample.salePrice || vSample.listPrice || 0) : ''}
                    </span>
                    {vSample && vSample.listPrice && vSample.listPrice > (vSample.salePrice || 0) && (
                      <span className="text-[10px] text-steel line-through">
                        {formatVND(vSample.listPrice)}
                      </span>
                    )}
                  </div>
                  {isRomOutOfStock && (
                    <div className="text-[10px] text-critical font-semibold mt-0.5">Hết hàng</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Lựa chọn Màu sắc / Biến thể */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-ink uppercase">
            {hasStorageVariants ? '2. Chọn màu sắc:' : 'Chọn màu sắc / phiên bản:'}
          </span>
          <div className="flex items-center gap-2">
            {!hasStorageVariants && (
              <span className="text-slate-400 font-mono text-[11px]">SKU: {selectedVariant.sku}</span>
            )}
            <span className="text-ink-deep font-semibold">{selectedVariant.variantName || selectedVariant.color}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {colorsForCurrentRom.map((v) => {
            const isSelected = selectedVariant.variantId === v.variantId;
            const isDiscontinued = !isVariantActive(v);
            const isOutOfStock = getVariantAvailableQty(v) <= 0 && !isDiscontinued;
            const currentSale = v.salePrice > 0 ? v.salePrice : (v.listPrice || 0);
            const hasDiscount = v.listPrice && v.listPrice > currentSale;

            return (
              <button
                key={v.variantId}
                disabled={isDiscontinued}
                onClick={() => onSelectVariant(v)}
                className={`p-3 rounded-lg text-left flex items-center gap-2.5 transition-all relative ${
                  isDiscontinued
                    ? 'border border-rose-200 bg-slate-50 opacity-60 cursor-not-allowed text-slate-700'
                    : isSelected
                    ? isOutOfStock
                      ? 'border-2 border-amber-500 bg-amber-50/20 text-ink-deep'
                      : 'border-2 border-primary bg-canvas text-ink-deep'
                    : isOutOfStock
                    ? 'border border-dashed border-hairline bg-surface-soft/60 hover:border-slate text-slate-500'
                    : 'border border-hairline bg-canvas hover:border-slate text-ink'
                }`}
              >
                {v.colorHex && (
                  <span 
                    className={`w-5 h-5 rounded-full border flex-shrink-0 ${
                      isSelected ? 'ring-2 ring-primary ring-offset-1 border-transparent' : 'border-hairline'
                    }`}
                    style={{ backgroundColor: v.colorHex }}
                  />
                )}
                <div className="truncate flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-xs truncate" title={v.variantName || v.color}>
                      {v.color || v.variantName || 'Mặc định'}
                    </span>
                    {isDiscontinued ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 shrink-0">
                        Ngừng bán
                      </span>
                    ) : isOutOfStock ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 shrink-0">
                        Hết hàng
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className={`text-[11px] font-bold ${isDiscontinued ? 'text-slate-500 line-through' : 'text-ink-deep'}`}>
                      {formatVND(currentSale)}
                    </span>
                    {hasDiscount && !isDiscontinued && (
                      <span className="text-[10px] text-steel line-through">
                        {formatVND(v.listPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
