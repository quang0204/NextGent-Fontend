import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { sharedStore } from '../../services/sharedStore';
import { promotionService } from '../../services/promotionService';
import { PortalVoucher, PortalPromotion } from '../../types/portal';
import { formatVND } from '../../components/common/PriceDisplay';
import { PromotionCampaignModal } from '../../components/portal/PromotionCampaignModal';
import { PortalPagination } from '../../components/portal/PortalPagination';
import { 
  Ticket, 
  Flame, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Power,
  X
} from 'lucide-react';

export const PortalPromotionsView: React.FC = () => {
  const [promotions, setPromotions] = useState<PortalPromotion[]>(sharedStore.getPromotions());
  const [vouchers, setVouchers] = useState<PortalVoucher[]>(sharedStore.getVouchers());
  const [showAddPromoModal, setShowAddPromoModal] = useState(false);
  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
  const [expandedPromoId, setExpandedPromoId] = useState<number | null>(1);

  // Phân trang danh sách voucher
  const [voucherPage, setVoucherPage] = useState(1);
  const [voucherPageSize, setVoucherPageSize] = useState(6);

  const paginatedVouchers = useMemo(() => {
    const start = (voucherPage - 1) * voucherPageSize;
    return vouchers.slice(start, start + voucherPageSize);
  }, [vouchers, voucherPage, voucherPageSize]);

  // Form add voucher
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(100000);
  const [maxDiscount, setMaxDiscount] = useState<number>(500000);
  const [minOrderValue, setMinOrderValue] = useState<number>(5000000);
  const [usageLimit, setUsageLimit] = useState<number>(200);
  const [voucherStartAt, setVoucherStartAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [voucherExpiredAt, setVoucherExpiredAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const formatDateTimeDisplay = (raw?: string) => {
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw.replace('T', ' ').replace('Z', '');
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // API 6.2: GET /api/v1/admin/promotions
  const loadPromotions = useCallback(async () => {
    try {
      const res = await promotionService.getAdminPromotions();
      if (res?.content && res.content.length > 0) {
        setPromotions(res.content.map(p => ({
          promotionId: p.promotionId,
          name: p.name,
          description: p.description,
          startAt: p.startAt,
          endAt: p.endAt,
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
          variants: p.variants || [],
        })));
      }
    } catch (err) {
      console.warn('[PortalPromotionsView] loadPromotions error', err);
    }
  }, []);

  // API 6.7: GET /api/v1/admin/vouchers
  const loadVouchers = useCallback(async () => {
    try {
      const res = await promotionService.getAdminVouchers();
      if (res?.content && res.content.length > 0) {
        setVouchers(res.content.map(v => ({
          voucherId: v.voucherId,
          code: v.code,
          discountType: (v.discountType === 'PERCENT' || (v.discountType as any) === 'PERCENTAGE') ? 'PERCENT' : 'FIXED',
          discountValue: v.discountValue,
          maxDiscount: v.maxDiscount || undefined,
          minOrderValue: v.minOrderValue,
          usageLimit: v.usageLimit,
          usedCount: v.usedCount,
          startAt: v.startAt || '',
          expiredAt: v.expiredAt,
          isActive: v.isActive,
        })));
      }
    } catch (err) {
      console.warn('[PortalPromotionsView] loadVouchers error', err);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
    loadVouchers();
  }, [loadPromotions, loadVouchers]);

  useEffect(() => {
    const unsubscribe = sharedStore.subscribe(() => {
      setPromotions([...sharedStore.getPromotions()]);
      setVouchers([...sharedStore.getVouchers()]);
    });
    return () => unsubscribe();
  }, []);

  // API 6.8: POST /api/v1/admin/vouchers
  const handleAddVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError(null);
    if (!code.trim()) {
      setVoucherError('Vui lòng nhập mã Voucher.');
      return;
    }

    if (!voucherStartAt || !voucherExpiredAt) {
      setVoucherError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc cho Voucher.');
      return;
    }

    const startDateObj = new Date(voucherStartAt);
    const endDateObj = new Date(voucherExpiredAt);
    if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) {
      setVoucherError('Định dạng ngày bắt đầu hoặc ngày kết thúc không hợp lệ.');
      return;
    }
    if (startDateObj >= endDateObj) {
      setVoucherError('Ngày kết thúc phải sau ngày bắt đầu!');
      return;
    }

    if (discountType === 'PERCENT') {
      if (discountValue <= 0 || discountValue > 100) {
        setVoucherError('Mức giảm theo phần trăm (%) phải từ 1% đến 100%.');
        return;
      }
    } else {
      if (discountValue < 1000) {
        setVoucherError('Mức giảm tiền mặt phải từ 1.000đ trở lên.');
        return;
      }
    }

    const cleanCode = code.trim().toUpperCase();
    const res = await promotionService.createVoucher({
      code: cleanCode,
      discountType,
      discountValue,
      maxDiscount: discountType === 'PERCENT' && maxDiscount > 0 ? maxDiscount : null,
      minOrderValue,
      usageLimit,
      startAt: startDateObj.toISOString(),
      expiredAt: endDateObj.toISOString(),
      isActive: true,
    });

    if (!res.success) {
      setVoucherError(res.message);
      return;
    }

    setCode('');
    setVoucherError(null);
    setShowAddVoucherModal(false);
    loadVouchers();
    alert(`Đã khởi tạo mã Voucher ${cleanCode} thành công! Khách hàng có thể áp dụng tại giỏ hàng.`);
  };

  // API 6.9: PATCH /api/v1/admin/vouchers/{id}/toggle
  const handleToggleVoucher = async (id: number) => {
    await promotionService.toggleVoucherStatus(id);
    loadVouchers();
  };

  // API 6.4: PUT /api/v1/admin/promotions/{id}/status
  const handleTogglePromotion = async (id: number) => {
    const target = promotions.find(p => p.promotionId === id);
    if (!target) return;
    const nextStatus = target.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await promotionService.updatePromotionStatus(id, nextStatus);
    loadPromotions();
  };

  const handleDeletePromotion = (id: number, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa chiến dịch khuyến mãi "${name}"?`)) {
      sharedStore.deletePromotion(id);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-medium text-ink-deep tracking-tight">
              Khuyến mãi & Mã giảm giá
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-attention/10 text-attention border border-attention/30 font-mono">
              Khuyến mãi & Voucher
            </span>
          </div>
          <p className="text-xs text-steel mt-1">
            Quy tắc nghiệp vụ: Mỗi biến thể SKU chỉ áp dụng 01 mức giá Flash Sale ưu đãi cao nhất + Tối đa 01 Voucher/đơn hàng (chống cộng dồn sai quy định).
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CHIẾN DỊCH KHUYẾN MÃI / FLASH SALE                            */}
      {/* ========================================================================= */}
      <div className="bg-canvas border border-hairline-soft rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline-soft">
          <div>
            <h3 className="text-sm font-bold text-ink-deep uppercase flex items-center gap-2">
              <Flame size={16} className="text-attention" />
              <span>Chiến dịch Khuyến mãi & Flash Sale</span>
            </h3>
            <p className="text-xs text-steel mt-0.5">
              Áp dụng mức giá ưu đãi trực tiếp cho danh sách biến thể SKU và tự động đồng bộ giá bán trên website
            </p>
          </div>

          <button
            onClick={() => setShowAddPromoModal(true)}
            className="btn-marketing px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
          >
            <Plus size={13} />
            <span>Thêm chiến dịch mới</span>
          </button>
        </div>

        {/* Promotion Campaigns List */}
        {promotions.length === 0? (
          <div className="py-8 text-center text-xs text-steel space-y-2">
            <Flame size={32} className="mx-auto text-hairline" />
            <p>Chưa có chiến dịch Flash Sale nào. Bấm nút trên để tạo chiến dịch mới.</p>
          </div>
        ): (
          <div className="space-y-4">
            {promotions.map(promo => {
              const isExpanded = expandedPromoId === promo.promotionId;
              const isActive = promo.status === 'ACTIVE';
              const promoVariants = (promo.variants && promo.variants.length > 0)
                ? promo.variants
                : (sharedStore.getPromotions().find(sp => sp.promotionId === promo.promotionId || sp.name === promo.name)?.variants || []);

              return (
                <div
                  key={promo.promotionId}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isActive? 'border-hairline-soft bg-canvas shadow-xs': 'border-hairline-soft bg-surface-soft/60 opacity-80'
                  }`}
                >
                  {/* Campaign Header Card */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-soft/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-ink-deep text-sm">
                          {promo.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                          isActive? 'bg-success/10 text-success border-success/30': 'bg-charcoal/10 text-charcoal border-charcoal/20'
                        }`}>
                          {isActive? 'ĐANG KÍCH HOẠT': 'TẠM TẮT'}
                        </span>
                        <span className="text-[10px] font-mono text-steel bg-canvas px-2 py-0.5 rounded border border-hairline-soft">
                          {promoVariants.length} SKU áp dụng
                        </span>
                      </div>
                      
                      {promo.description && (
                        <p className="text-xs text-steel line-clamp-1">{promo.description}</p>
                      )}

                      <div className="text-[11px] text-steel flex items-center gap-3 pt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-primary" />
                          <span>Hiệu lực: {promo.startAt.replace('T', ' ')} &rarr; {promo.endAt.replace('T', ' ')}</span>
                        </span>
                        <span>•</span>
                        <span>Tạo bởi: <strong className="text-charcoal">{promo.createdBy}</strong></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleTogglePromotion(promo.promotionId)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition ${
                          isActive? 'bg-surface-soft hover:bg-critical/10 text-charcoal hover:text-critical border border-hairline-soft': 'bg-success text-on-primary hover:bg-success/90'
                        }`}
                        title={isActive? 'Tạm dừng chiến dịch này': 'Kích hoạt chiến dịch này'}
                      >
                        <Power size={13} />
                        <span>{isActive? 'Tạm dừng': 'Kích hoạt'}</span>
                      </button>

                      <button
                        onClick={() => handleDeletePromotion(promo.promotionId, promo.name)}
                        className="p-1.5 text-steel hover:text-critical hover:bg-critical/10 rounded-lg transition"
                        title="Xóa chiến dịch này"
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        onClick={() => setExpandedPromoId(isExpanded? null: promo.promotionId)}
                        className="btn-ghost px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
                      >
                        <span>{isExpanded? 'Thu gọn': 'Chi tiết SKU'}</span>
                        {isExpanded? <ChevronUp size={14} />: <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded SKU Table (Bảng 12: Promotion_Variants) */}
                  {isExpanded && (
                    <div className="border-t border-hairline-soft p-4 bg-canvas space-y-2 text-xs">
                      <div className="font-bold text-charcoal flex items-center gap-1.5 mb-2">
                        <Layers size={14} className="text-primary" />
                        <span>Danh sách biến thể áp dụng giá Flash Sale ({promoVariants.length} biến thể):</span>
                      </div>

                      <div className="overflow-x-auto border border-hairline-soft rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-soft border-b border-hairline-soft text-steel font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Mã SKU</th>
                              <th className="py-2.5 px-3">Tên sản phẩm</th>
                              <th className="py-2.5 px-3">Phân loại / Màu</th>
                              <th className="py-2.5 px-3 text-right">Giá niêm yết</th>
                              <th className="py-2.5 px-3 text-right">Giá Flash Sale</th>
                              <th className="py-2.5 px-3 text-center">Mức giảm</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-hairline-soft">
                            {promoVariants.map((pv, idx) => {
                              const discountPct = pv.listPrice > 0? Math.round(((pv.listPrice - pv.promoPrice) / pv.listPrice) * 100): 0;
                              return (
                                <tr key={idx} className="hover:bg-surface-soft/40 transition">
                                  <td className="py-2.5 px-3 font-mono font-bold text-primary">
                                    {pv.sku}
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-ink-deep">
                                    {pv.productName}
                                  </td>
                                  <td className="py-2.5 px-3 text-steel">
                                    {pv.color} {Boolean(pv.romGb && pv.romGb > 0) && `• ${pv.romGb}GB`}
                                  </td>
                                  <td className="py-2.5 px-3 text-right line-through text-steel font-mono">
                                    {formatVND(pv.listPrice)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-ink-deep font-mono">
                                    {formatVND(pv.promoPrice)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="font-bold text-[10px] text-attention bg-attention/10 px-2 py-0.5 rounded-full border border-attention/30">
                                      -{discountPct}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: BẢNG 13: QUẢN LÝ MÃ GIẢM GIÁ VOUCHER                   */}
      {/* ========================================================================= */}
      <div className="bg-canvas border border-hairline-soft rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline-soft">
          <div>
            <h3 className="text-sm font-bold text-ink-deep uppercase flex items-center gap-2">
              <Ticket size={16} className="text-primary" />
              <span>Quản lý Mã giảm giá</span>
            </h3>
            <p className="text-xs text-steel mt-0.5">
              Thiết lập mã giảm giá theo đơn hàng, kiểm soát giá trị đơn tối thiểu và hạn mức lượt dùng
            </p>
          </div>

          <button
            onClick={() => setShowAddVoucherModal(true)}
            className="btn-marketing px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
          >
            <Plus size={13} />
            <span>Thêm mã Voucher mới</span>
          </button>
        </div>

        {/* Voucher Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {paginatedVouchers.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-400 bg-surface-soft/40 rounded-xl border border-hairline-soft">
              Chưa có mã giảm giá nào.
            </div>
          ) : (
            paginatedVouchers.map(v => {
              const isPercent = v.discountType === 'PERCENT' || (v.discountType as any) === 'PERCENTAGE';
              return (
                <div 
                  key={v.voucherId} 
                  className={`p-4 rounded-xl border relative transition-all ${
                    v.isActive? 'border-hairline-soft bg-canvas hover:shadow-sm': 'border-hairline-soft bg-surface-soft opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-sm font-bold text-ink-deep bg-surface-soft px-2.5 py-0.5 rounded-full border border-hairline-soft">
                        {v.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isPercent
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-attention/10 text-attention border-attention/30'
                      }`}>
                        {isPercent ? 'Giảm %' : 'Giảm tiền'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleVoucher(v.voucherId)}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition shrink-0 ${
                        v.isActive? 'bg-success/10 text-success border border-success/30 hover:bg-critical/10 hover:text-critical': 'bg-surface-soft text-steel border border-hairline-soft hover:bg-success/10 hover:text-success'
                      }`}
                    >
                      {v.isActive? 'ĐANG KÍCH HOẠT': 'TẠM TẮT'}
                    </button>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-charcoal">
                      Mức giảm:{' '}
                      <span className="text-ink-deep font-bold">
                        {isPercent ? `${v.discountValue}%` : formatVND(v.discountValue)}
                      </span>
                      {isPercent && v.maxDiscount ? (
                        <span className="text-[11px] font-normal text-steel"> (Tối đa {formatVND(v.maxDiscount)})</span>
                      ) : null}
                    </div>
                    <div className="text-steel text-[11px]">
                      Đơn tối thiểu: <strong>{formatVND(v.minOrderValue)}</strong>
                    </div>
                    <div className="text-steel text-[11px]">
                      Lượt dùng: <strong className="text-charcoal">{v.usedCount}</strong> / {v.usageLimit} lượt
                    </div>
                    <div className="text-steel text-[10px] font-mono pt-1.5 border-t border-hairline-soft/60 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-primary shrink-0" />
                        <span>Bắt đầu: <strong className="text-charcoal">{formatDateTimeDisplay(v.startAt)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-attention shrink-0" />
                        <span>Kết thúc: <strong className="text-charcoal">{formatDateTimeDisplay(v.expiredAt)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Phân trang danh sách Voucher */}
        {vouchers.length > 0 && (
          <div className="border border-hairline-soft rounded-xl overflow-hidden mt-3">
            <PortalPagination
              currentPage={voucherPage}
              totalItems={vouchers.length}
              pageSize={voucherPageSize}
              onPageChange={setVoucherPage}
              onPageSizeChange={setVoucherPageSize}
              pageSizeOptions={[6, 12, 24]}
            />
          </div>
        )}
      </div>

      {/* Modal 1: PromotionCampaignModal */}
      <PromotionCampaignModal
        isOpen={showAddPromoModal}
        onClose={() => setShowAddPromoModal(false)}
        onSuccess={() => {
          setPromotions([...sharedStore.getPromotions()]);
          loadPromotions();
        }}
      />

      {/* Modal 2: Thêm Voucher mới */}
      {showAddVoucherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-canvas border border-hairline-soft rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs my-8 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-hairline-soft">
              <div>
                <h3 className="text-sm font-bold text-ink-deep uppercase">
                  Tạo mã giảm giá Voucher mới
                </h3>
                <p className="text-[11px] text-steel mt-0.5">
                  Hỗ trợ giảm theo số tiền (Amount) hoặc phần trăm (%) kèm thời gian hiệu lực
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVoucherError(null);
                  setShowAddVoucherModal(false);
                }}
                className="p-1 text-steel hover:text-ink rounded"
              >
                <X size={16} />
              </button>
            </div>

            {voucherError && (
              <div className="p-2.5 bg-critical/10 border border-critical/30 rounded-lg text-critical text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{voucherError}</span>
              </div>
            )}

            <form onSubmit={handleAddVoucher} className="space-y-3.5">
              <div>
                <label className="block font-bold text-charcoal mb-1">Mã Voucher (Code): <span className="text-critical">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: SALE100, VIP10, TET2026..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-10 bg-canvas border border-hairline rounded-lg px-3 text-ink font-mono font-bold uppercase focus:border-2 focus:border-fb-blue focus:outline-none"
                />
              </div>

              {/* Chọn loại giảm giá: FIXED (Amount) hoặc PERCENT (%) */}
              <div>
                <label className="block font-bold text-charcoal mb-1">Loại hình giảm giá:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('FIXED');
                      if (discountValue <= 100) setDiscountValue(100000);
                    }}
                    className={`h-10 rounded-lg border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      discountType === 'FIXED'
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-soft text-charcoal border-hairline-soft hover:border-primary'
                    }`}
                  >
                    <span>Giảm tiền mặt (VNĐ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('PERCENT');
                      if (discountValue > 100) setDiscountValue(10);
                    }}
                    className={`h-10 rounded-lg border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      discountType === 'PERCENT'
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-soft text-charcoal border-hairline-soft hover:border-primary'
                    }`}
                  >
                    <span>Giảm phần trăm (%)</span>
                  </button>
                </div>
              </div>

              {discountType === 'FIXED' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-charcoal">Mức giảm tiền mặt (VNĐ): <span className="text-critical">*</span></label>
                    <div className="flex gap-1">
                      {[50000, 100000, 200000, 500000, 1000000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDiscountValue(val)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                            discountValue === val
                              ? 'bg-primary/15 text-primary border-primary'
                              : 'bg-surface-soft text-steel border-hairline-soft hover:text-ink'
                          }`}
                        >
                          {val >= 1000000 ? `${val / 1000000}Tr` : `${val / 1000}K`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    required
                    step={1000}
                    min={1000}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseInt(e.target.value, 10) || 0)}
                    className="w-full h-10 bg-canvas border border-hairline rounded-lg px-3 text-ink font-bold focus:border-2 focus:border-fb-blue focus:outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-charcoal">Phần trăm giảm (%): <span className="text-critical">*</span></label>
                      <div className="flex gap-1">
                        {[5, 10, 15, 20, 50].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDiscountValue(pct)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                              discountValue === pct
                                ? 'bg-primary/15 text-primary border-primary'
                                : 'bg-surface-soft text-steel border-hairline-soft hover:text-ink'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      required
                      step={1}
                      min={1}
                      max={100}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseInt(e.target.value, 10) || 0)}
                      className="w-full h-10 bg-canvas border border-hairline rounded-lg px-3 text-ink font-bold focus:border-2 focus:border-fb-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-charcoal mb-1">Giảm tối đa (VNĐ - 0 = KGH):</label>
                    <input
                      type="number"
                      step={50000}
                      min={0}
                      placeholder="VD: 500000"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(parseInt(e.target.value, 10) || 0)}
                      className="w-full h-10 bg-canvas border border-hairline rounded-lg px-3 text-ink font-bold focus:border-2 focus:border-fb-blue focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Ngày bắt đầu & Ngày kết thúc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-primary" />
                    <span>Ngày bắt đầu: <span className="text-critical">*</span></span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={voucherStartAt}
                    onChange={(e) => setVoucherStartAt(e.target.value)}
                    className="w-full h-10 bg-canvas border border-hairline rounded-lg px-2.5 text-ink font-mono text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-charcoal mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-attention" />
                    <span>Ngày kết thúc: <span className="text-critical">*</span></span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={voucherExpiredAt}
                    onChange={(e) => setVoucherExpiredAt(e.target.value)}
                    className="w-full h-10 bg-canvas border border-hairline rounded-lg px-2.5 text-ink font-mono text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal mb-1">Đơn hàng tối thiểu (VNĐ):</label>
                  <input
                    type="number"
                    required
                    step={100000}
                    min={0}
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(parseInt(e.target.value, 10) || 0)}
                    className="w-full h-10 bg-canvas border border-hairline rounded-lg px-3 text-ink font-bold focus:border-2 focus:border-fb-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">Giới hạn lượt sử dụng:</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-10 bg-canvas border border-hairline rounded-lg px-3 text-ink font-bold focus:border-2 focus:border-fb-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-hairline-soft">
                <button
                  type="button"
                  onClick={() => {
                    setVoucherError(null);
                    setShowAddVoucherModal(false);
                  }}
                  className="btn-ghost px-3.5 py-2 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-marketing px-5 py-2 font-bold rounded-full shadow-xs text-xs"
                >
                  Lưu & Phát hành Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
