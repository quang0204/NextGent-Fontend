import React, { useState, useEffect, useMemo } from 'react';
import { sharedStore } from '../../services/sharedStore';
import { promotionService } from '../../services/promotionService';
import { productService } from '../../services/productService';
import { Product } from '../../types/product';
import { PortalPromotion, PortalPromotionVariant, PromotionStatus } from '../../types/portal';
import { formatVND } from '../common/PriceDisplay';
import { 
  X, 
  Flame, 
  Search, 
  Check, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  Percent, 
  Tag, 
  Layers 
} from 'lucide-react';

export interface PromotionCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PromotionCampaignModal: React.FC<PromotionCampaignModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const [endAt, setEndAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 2 tuần
    return d.toISOString().slice(0, 16);
  });
  const [status, setStatus] = useState<PromotionStatus>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Danh sách sản phẩm thực tế từ Database / sharedStore
  const [productsList, setProductsList] = useState<Product[]>(() => sharedStore.getProducts());

  useEffect(() => {
    if (!isOpen) return;
    productService.getProducts().then(prods => {
      if (prods && prods.length > 0) {
        setProductsList(prods);
      }
    }).catch(() => {});
  }, [isOpen]);

  // Lấy danh sách toàn bộ biến thể SKU thực tế với ID và giá niêm yết chuẩn
  const allVariants = useMemo(() => {
    return productsList.flatMap(p => 
      (p.variants || []).map(v => {
        const basePrice = v.listPrice || v.salePrice || 0;
        return {
          variantId: Number(v.variantId),
          productId: p.productId,
          productName: p.name,
          sku: v.sku || `SKU-${v.variantId}`,
          color: v.color || 'Mặc định',
          romGb: v.romGb || 0,
          listPrice: basePrice,
          salePrice: v.salePrice || basePrice,
          imageUrl: v.imageUrl || p.thumbnail
        };
      })
    );
  }, [productsList]);

  // Quản lý các biến thể đã chọn kèm promo_price
  const [selectedVariantsMap, setSelectedVariantsMap] = useState<Record<number, number>>({});

  if (!isOpen) return null;

  // Lọc biến thể theo từ khóa
  const filteredVariants = allVariants.filter(v => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      v.productName.toLowerCase().includes(term) ||
      v.sku.toLowerCase().includes(term) ||
      v.color.toLowerCase().includes(term)
    );
  });

  const toggleSelectVariant = (variantId: number, basePrice: number) => {
    setSelectedVariantsMap(prev => {
      const copy = { ...prev };
      if (copy[variantId] !== undefined) {
        delete copy[variantId];
      } else {
        // Mặc định giảm 10%
        const rawDiscount = (basePrice * 10) / 100;
        let promoPrice = Math.round((basePrice - rawDiscount) / 10000) * 10000;
        if (promoPrice >= basePrice) {
          promoPrice = Math.max(10000, basePrice - 10000);
        }
        copy[variantId] = promoPrice;
      }
      return copy;
    });
  };

  const setDiscountPercent = (variantId: number, basePrice: number, percent: number) => {
    // Giá sau khi giảm: basePrice * (1 - percent / 100)
    // Làm tròn đến 10.000đ gần nhất (chuẩn tiền tệ VNĐ)
    const rawDiscount = (basePrice * percent) / 100;
    let promoPrice = Math.round((basePrice - rawDiscount) / 10000) * 10000;
    // Ràng buộc nghiệp vụ bắt buộc: promoPrice luôn phải nhỏ hơn listPrice ít nhất 10.000đ
    if (promoPrice >= basePrice) {
      promoPrice = Math.max(10000, basePrice - 10000);
    }
    if (promoPrice <= 0) {
      promoPrice = 10000;
    }
    setSelectedVariantsMap(prev => ({
      ...prev,
      [variantId]: promoPrice
    }));
  };

  const handlePriceChange = (variantId: number, val: number) => {
    setSelectedVariantsMap(prev => ({
      ...prev,
      [variantId]: val
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên chiến dịch khuyến mãi.');
      return;
    }

    if (new Date(startAt) >= new Date(endAt)) {
      setErrorMsg('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
      return;
    }

    const selectedIds = Object.keys(selectedVariantsMap).map(Number);
    if (selectedIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 01 biến thể SKU để áp dụng chương trình khuyến mãi.');
      return;
    }

    // Kiểm tra tính hợp lệ của từng mức giá promo
    for (const vId of selectedIds) {
      const variantInfo = allVariants.find(v => v.variantId === vId);
      if (!variantInfo) continue;

      const promoPrice = selectedVariantsMap[vId];
      if (!promoPrice || promoPrice <= 0) {
        setErrorMsg(`Giá khuyến mãi cho SKU ${variantInfo.sku} phải lớn hơn 0 đ.`);
        return;
      }
      if (promoPrice >= variantInfo.listPrice) {
        setErrorMsg(`Giá khuyến mãi (${formatVND(promoPrice)}) cho SKU ${variantInfo.sku} phải thấp hơn giá niêm yết (${formatVND(variantInfo.listPrice)}).`);
        return;
      }
    }

    // Gọi API 6.3: POST /api/v1/admin/promotions
    const apiVariants = selectedIds.map(vId => ({
      variantId: Number(vId),
      promoPrice: Number(selectedVariantsMap[vId])
    }));

    const variantDetails: PortalPromotionVariant[] = selectedIds.map((vId, idx) => {
      const v = allVariants.find(av => av.variantId === vId);
      const promoPrice = Number(selectedVariantsMap[vId]);
      return {
        promoVariantId: Date.now() + idx,
        promotionId: 0,
        variantId: vId,
        productId: v?.productId || 0,
        productName: v?.productName || '',
        sku: v?.sku || '',
        color: v?.color || '',
        romGb: v?.romGb || 0,
        listPrice: v?.listPrice || 0,
        promoPrice: promoPrice
      };
    });

    promotionService.createPromotion({
      name: name.trim(),
      description: description.trim() || undefined,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      status,
      variants: apiVariants,
      variantDetails,
    }).then(res => {
      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
      onSuccess();
      onClose();
    }).catch(err => {
      setErrorMsg(err.message || 'Không thể tạo mới chiến dịch khuyến mãi.');
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-canvas border border-hairline-soft rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 text-xs my-8 animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Flame size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink-deep uppercase tracking-tight">
                Tạo Chiến dịch Khuyến mãi / Flash Sale
              </h3>
              <p className="text-[11px] text-steel">
                Thiết lập mức giá ưu đãi theo từng SKU biến thể và tự động áp dụng giá bán ra storefront
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-steel hover:text-ink rounded-lg hover:bg-surface-soft transition"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-critical/10 border border-critical/30 rounded-xl text-critical text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Thông tin chiến dịch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-charcoal mb-1">
                Tên chiến dịch khuyến mãi: <span className="text-critical">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Siêu Sale Khai Xuân 2026, Flash Sale Đêm Muộn..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink font-medium focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-charcoal mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-primary" />
                <span>Thời gian bắt đầu:</span>
              </label>
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink font-mono text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-charcoal mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-primary" />
                <span>Thời gian kết thúc:</span>
              </label>
              <input
                type="datetime-local"
                required
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink font-mono text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-charcoal mb-1">Mô tả chương trình:</label>
              <input
                type="text"
                placeholder="Ví dụ: Giảm giá sốc cho toàn bộ Flagship Apple & Samsung..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Chọn danh sách SKU biến thể (Bảng 12: Promotion_Variants) */}
          <div className="space-y-2 pt-2 border-t border-hairline-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-bold text-ink-deep flex items-center gap-1.5 text-xs">
                  <Layers size={14} className="text-primary" />
                  <span>Chọn các SKU biến thể áp dụng ({Object.keys(selectedVariantsMap).length} đã chọn):</span>
                </label>
                <p className="text-[10px] text-steel">
                  Quy tắc: Mỗi biến thể chỉ áp dụng 1 giá Flash Sale ưu đãi cao nhất tại một thời điểm.
                </p>
              </div>

              {/* Tìm kiếm nhanh */}
              <div className="relative w-full sm:w-60">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel" />
                <input
                  type="text"
                  placeholder="Tìm SKU hoặc tên máy..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 bg-surface-soft border border-hairline rounded-full text-[11px] focus:bg-canvas focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Danh sách cuộn các biến thể */}
            <div className="max-h-60 overflow-y-auto border border-hairline-soft rounded-xl divide-y divide-hairline-soft bg-canvas">
              {filteredVariants.map(v => {
                const isSelected = selectedVariantsMap[v.variantId] !== undefined;
                const currentPromoPrice = selectedVariantsMap[v.variantId] || 0;
                const discountPct = isSelected && v.listPrice > 0 ? Math.round(((v.listPrice - currentPromoPrice) / v.listPrice) * 100) : 0;

                return (
                  <div
                    key={v.variantId}
                    className={`p-3 transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-surface-soft'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Checkbox & Thông tin SKU */}
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectVariant(v.variantId, v.listPrice)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-hairline"
                        />
                        <img
                          src={v.imageUrl}
                          alt={v.sku}
                          className="w-10 h-10 object-contain rounded-lg border border-hairline-soft p-0.5 bg-canvas"
                        />
                        <div>
                          <div className="font-bold text-ink-deep flex items-center gap-1.5">
                            <span>{v.productName}</span>
                            <span className="font-mono text-[10px] text-steel font-normal">({v.sku})</span>
                          </div>
                          <div className="text-[11px] text-steel flex items-center gap-2">
                            <span>Màu: <strong className="text-charcoal">{v.color}</strong></span>
                            {v.romGb > 0 && <span>• {v.romGb}GB</span>}
                            <span>• Niêm yết: <strong className="text-charcoal">{formatVND(v.listPrice)}</strong></span>
                          </div>
                        </div>
                      </label>

                      {/* Giá khuyến mãi & Quick actions */}
                      {isSelected && (
                        <div className="flex items-center gap-2 pl-7 sm:pl-0">
                          {/* Quick % buttons */}
                          <div className="flex gap-1 text-[10px] font-bold">
                            {[5, 10, 15, 20].map(pct => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setDiscountPercent(v.variantId, v.listPrice, pct)}
                                className={`px-1.5 py-0.5 rounded border transition ${
                                  discountPct === pct 
                                    ? 'bg-primary text-canvas border-primary font-black shadow-xs' 
                                    : 'bg-surface-soft border-hairline-soft text-charcoal hover:border-primary'
                                }`}
                              >
                                -{pct}%
                              </button>
                            ))}
                          </div>

                          {/* Ô nhập giá khuyến mãi */}
                          <div className="relative w-36">
                            <input
                              type="number"
                              step={10000}
                              min={10000}
                              max={Math.max(10000, v.listPrice - 10000)}
                              value={currentPromoPrice}
                              onChange={(e) => handlePriceChange(v.variantId, parseInt(e.target.value, 10) || 0)}
                              className="w-full h-8 px-2 text-right font-bold font-mono text-primary bg-canvas border border-hairline rounded-lg text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-steel font-mono pointer-events-none">
                              đ
                            </span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-hairline-soft">
            <span className="text-[11px] text-steel">
              Đã chọn <strong>{Object.keys(selectedVariantsMap).length}</strong> biến thể tham gia Flash Sale
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost px-4 py-2 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-marketing px-5 py-2.5 text-xs font-bold rounded-full shadow-xs flex items-center gap-1.5"
              >
                <Flame size={14} />
                <span>Kích hoạt Chiến dịch</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
