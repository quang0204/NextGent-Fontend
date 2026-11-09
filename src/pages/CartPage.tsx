import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useToastStore } from '../stores/toastStore';
import { formatVND } from '../components/common/PriceDisplay';
import { sharedStore } from '../services/sharedStore';
import { promotionService } from '../services/promotionService';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ArrowLeft, 
  ShieldCheck, 
  Ticket, 
  ArrowRight,
  AlertCircle,
  Check
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    items, 
    fetchCart,
    updateQuantity, 
    removeItem, 
    clearCart, 
    selectedItemIds, 
    toggleSelectItem, 
    selectAllItems, 
    deselectAllItems, 
    getSelectedTotalAmount,
    getSelectedCount,
    setBuyNowItem
  } = useCartStore();
  const { showToast } = useToastStore();

  // Kiểm tra xác thực: Nếu là khách vãng lai khi vào trang giỏ hàng thì lập tức chuyển hướng sang đăng nhập/đăng ký
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      showToast('Vui lòng đăng nhập hoặc đăng ký tài khoản để quản lý giỏ hàng!', 'info');
      navigate('/auth?redirect=/cart');
      return;
    }
    fetchCart();
  }, [fetchCart, navigate, showToast]);

  // Reset any direct buy now session when visiting regular cart
  useEffect(() => {
    setBuyNowItem(null);
  }, [setBuyNowItem]);

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [vouchers, setVouchers] = useState(sharedStore.getVouchers());

  // API 6.5: GET /api/v1/vouchers/valid
  useEffect(() => {
    promotionService.getValidVouchers().then(res => {
      if (res && res.length > 0) {
        setVouchers(res.map(v => ({
          voucherId: v.voucherId,
          code: v.code,
          discountType: (v.discountType === 'PERCENT' || (v.discountType as any) === 'PERCENTAGE') ? 'PERCENT' : 'FIXED',
          discountValue: v.discountValue,
          maxDiscount: v.maxDiscount || undefined,
          minOrderValue: v.minOrderValue,
          usageLimit: v.usageLimit,
          usedCount: v.usedCount,
          startAt: '',
          expiredAt: v.expiredAt,
          isActive: true,
        })));
      }
    }).catch(() => {});
  }, []);

  const subtotal = getSelectedTotalAmount();
  const selectedCount = getSelectedCount();
  const finalTotal = Math.max(0, subtotal - voucherDiscount);
  const isAllSelected = items.length > 0 && selectedItemIds.length === items.length;

  // API 6.6: POST /api/v1/vouchers/apply
  const applyVoucherByCode = async (codeToApply: string) => {
    const cleanCode = codeToApply.trim().toUpperCase();
    const res = await promotionService.applyVoucher(cleanCode, subtotal);

    if (!res.success) {
      showToast(res.message, 'error');
      return;
    }

    const discount = res.data?.discountAmount || 0;
    setVoucherDiscount(discount);
    setAppliedVoucher(cleanCode);
    setVoucherCode(cleanCode);
    showToast(`Áp dụng thành công mã ${cleanCode}: Giảm ${formatVND(discount)}!`, 'success');
  };

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    applyVoucherByCode(voucherCode);
  };

  const handleQuantityDelta = async (id: string, delta: number) => {
    const res = await updateQuantity(id, delta);
    if (!res.success && res.message) {
      showToast(res.message, 'warning');
    }
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      showToast('Giỏ hàng trống!', 'error');
      return;
    }
    if (selectedItemIds.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 sản phẩm để tiến hành thanh toán!', 'warning');
      return;
    }
    const query = appliedVoucher ? `?voucher=${appliedVoucher}` : '';
    navigate(`/checkout${query}`);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mx-auto text-steel border border-hairline-soft">
          <Trash2 size={24} />
        </div>
        <h2 className="text-xl font-medium text-ink-deep">Giỏ hàng của bạn đang trống</h2>
        <p className="text-xs text-steel max-w-sm mx-auto">
          Hãy khám phá các mẫu điện thoại, máy tính bảng và phụ kiện chính hãng để tiến hành mua sắm.
        </p>
        <Link
          to="/"
          className="btn-marketing inline-flex items-center gap-2 text-xs font-bold px-6 py-3 rounded-full transition-colors mt-2"
        >
          <ArrowLeft size={14} />
          <span>Tiếp tục mua sắm</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Title & Clear Cart */}
      <div className="flex items-center justify-between pb-4 border-b border-hairline-soft">
        <div>
          <h1 className="text-2xl font-medium text-ink-deep tracking-tight">
            Giỏ hàng của bạn ({items.reduce((s, i) => s + i.quantity, 0)} sản phẩm)
          </h1>
          <p className="text-xs text-steel mt-1">
            Miễn phí vận chuyển toàn quốc cho tất cả đơn hàng thiết bị di động chính hãng
          </p>
        </div>
        <button
          onClick={async () => {
            if (confirm('Bạn có chắc muốn xóa tất cả sản phẩm khỏi giỏ hàng?')) {
              await clearCart();
              showToast('Đã làm trống giỏ hàng', 'info');
            }
          }}
          className="text-xs text-steel hover:text-critical transition-colors flex items-center gap-1.5 font-semibold"
        >
          <Trash2 size={14} />
          <span>Xóa tất cả</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Items List (8 cols) */}
        <div className="lg:col-span-8 bg-canvas border border-hairline-soft rounded-xxl shadow-none overflow-hidden">
          {/* Select All Bar */}
          <div className="p-4 bg-surface-soft/60 border-b border-hairline-soft flex items-center justify-between text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-ink-deep select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => {
                  if (isAllSelected) {
                    deselectAllItems();
                  } else {
                    selectAllItems();
                  }
                }}
                className="w-4 h-4 rounded border-hairline text-primary focus:ring-primary accent-[#0064e0] cursor-pointer"
              />
              <span>Chọn tất cả ({items.length} mặt hàng)</span>
            </label>

            <span className="text-steel font-medium">
              Đã chọn: <strong className="text-primary font-bold">{selectedItemIds.length}</strong>/{items.length} mặt hàng
            </span>
          </div>

          <div className="divide-y divide-hairline-soft">
            {items.map((item) => {
              const isSelected = selectedItemIds.includes(item.id);
              const isMaxReached = item.quantity >= item.availableQty;

              return (
                <div 
                  key={item.id} 
                  className={`p-4 sm:p-5 flex gap-3 sm:gap-4 items-center transition-colors ${
                    isSelected ? 'bg-canvas' : 'bg-surface-soft/20 opacity-75'
                  }`}
                >
                  {/* Select Checkbox for item */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectItem(item.id)}
                    className="w-4 h-4 rounded border-hairline text-primary focus:ring-primary accent-[#0064e0] cursor-pointer flex-shrink-0"
                    title={isSelected ? "Bỏ chọn sản phẩm này" : "Chọn sản phẩm này để mua"}
                  />

                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-surface-soft p-2 flex-shrink-0 border border-hairline-soft"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/f1f4f7/5d6c7b?text=NextGen';
                    }}
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/product/${item.productId}`} 
                        className="font-bold text-xs sm:text-sm text-ink-deep hover:text-primary line-clamp-1 transition-colors"
                      >
                        {item.productName}
                      </Link>
                      {item.isFlashSale && (
                        <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 animate-pulse">
                          ⚡ Flash Sale
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-steel flex flex-wrap gap-2">
                      <span>Màu: <strong className="text-charcoal font-medium">{item.color}</strong></span>
                      <span>•</span>
                      <span>Bản: <strong className="text-charcoal font-medium">{item.storage}</strong></span>
                    </div>

                    <div className="text-[11px] font-mono text-steel flex items-center gap-3">
                      <span>SKU: {item.sku}</span>
                      {item.availableStock !== undefined && (
                        <span className="text-[10px] text-steel">
                          (Kho còn {item.availableStock})
                        </span>
                      )}
                    </div>

                    {item.inStock === false && (
                      <div className="text-[11px] text-critical font-bold flex items-center gap-1">
                        <AlertCircle size={12} />
                        Sản phẩm tạm thời hết hàng
                      </div>
                    )}

                    {isMaxReached && item.inStock !== false && (
                      <div className="text-[11px] text-attention font-medium flex items-center gap-1">
                        <AlertCircle size={12} />
                        Đã chọn số lượng khả dụng tối đa ({item.availableQty})
                      </div>
                    )}

                    <div className="text-xs font-bold text-ink-deep sm:hidden">
                      {formatVND(item.price)}
                    </div>
                  </div>

                  {/* Price Desktop */}
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-bold text-ink-deep">
                      {formatVND(item.price)}
                    </div>
                    {item.originalPrice > item.price && (
                      <div className="text-xs text-steel line-through">
                        {formatVND(item.originalPrice)}
                      </div>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center border border-hairline-soft rounded-full bg-surface-soft px-1 py-0.5">
                    <button
                      onClick={() => handleQuantityDelta(item.id, -1)}
                      disabled={item.quantity <= 1}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-canvas disabled:opacity-30 text-charcoal transition"
                      title="Giảm số lượng"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-ink-deep">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityDelta(item.id, 1)}
                      disabled={isMaxReached}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-canvas disabled:opacity-30 text-charcoal transition"
                      title={isMaxReached ? "Đã đạt giới hạn tồn kho khả dụng" : "Tăng số lượng"}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={async () => {
                      await removeItem(item.id);
                      showToast(`Đã bỏ "${item.productName}" khỏi giỏ hàng`, 'info');
                    }}
                    className="text-steel hover:text-critical p-2 transition-colors"
                    title="Xóa sản phẩm này"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary Right (4 cols) */}
        <div className="lg:col-span-4 bg-canvas border border-hairline-soft rounded-xl p-6 space-y-5 shadow-sticky">
          <h3 className="font-bold text-xs text-ink-deep uppercase tracking-wider pb-3 border-b border-hairline-soft">
            Tóm tắt chi phí đơn hàng
          </h3>

          {/* Voucher Input */}
          <form onSubmit={handleApplyVoucher} className="space-y-2">
            <label className="text-xs font-medium text-charcoal flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Ticket size={14} className="text-primary" />
                <span>Mã giảm giá (Voucher):</span>
              </span>
              <span className="text-[11px] text-steel">1 mã/đơn</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập mã voucher..."
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                className="flex-1 h-10 px-3 bg-canvas border border-hairline rounded-lg text-xs text-ink uppercase focus:outline-none focus:border-2 focus:border-fb-blue font-mono font-bold"
              />
              <button
                type="submit"
                className="btn-marketing px-4 py-2 text-xs font-bold rounded-full"
              >
                Áp dụng
              </button>
            </div>
            {appliedVoucher && (
              <div className="text-xs text-success font-medium mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Check size={13} />
                  <span>Đang áp dụng: <strong>{appliedVoucher}</strong> (-{formatVND(voucherDiscount)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setVoucherDiscount(0);
                    setAppliedVoucher('');
                    setVoucherCode('');
                  }}
                  className="text-steel hover:text-alert text-[11px] underline cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </form>

          {/* Quick Voucher Selection List */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-steel uppercase tracking-wider block">
              Voucher gợi ý có sẵn:
            </span>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1.5">
              {vouchers.filter(v => v.isActive).map(v => {
                const isSelected = appliedVoucher === v.code;
                const isEligible = subtotal >= v.minOrderValue;

                return (
                  <button
                    key={v.voucherId}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setVoucherDiscount(0);
                        setAppliedVoucher('');
                        setVoucherCode('');
                      } else {
                        applyVoucherByCode(v.code);
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'border-ink-deep bg-surface-soft text-ink-deep font-bold'
                        : isEligible
                        ? 'border-hairline-soft bg-canvas hover:border-charcoal text-ink'
                        : 'border-hairline-soft bg-surface-soft opacity-50 cursor-not-allowed text-steel'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold text-xs text-ink-deep">{v.code}</div>
                      <div className="text-[11px] text-steel">
                        Giảm {v.discountType === 'PERCENT' ? `${v.discountValue}%` : formatVND(v.discountValue)} cho đơn từ {formatVND(v.minOrderValue)}
                        {v.discountType === 'PERCENT' && v.maxDiscount ? ` (tối đa ${formatVND(v.maxDiscount)})` : ''}
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="text-[11px] font-bold text-success bg-surface-soft px-2 py-0.5 rounded-full border border-success/30">Đã chọn</span>
                    ) : (
                      <span className="text-[11px] font-bold text-primary">Chọn</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2.5 text-xs pt-3 border-t border-hairline-soft text-charcoal">
            <div className="flex justify-between">
              <span>Tạm tính ({selectedCount} món đã chọn):</span>
              <strong className="text-ink-deep font-medium">{formatVND(subtotal)}</strong>
            </div>

            {voucherDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>Giảm giá voucher:</span>
                <strong className="font-bold">-{formatVND(voucherDiscount)}</strong>
              </div>
            )}

            <div className="flex justify-between">
              <span>Phí vận chuyển tiêu chuẩn:</span>
              <span className="text-success font-medium">Miễn phí</span>
            </div>

            <div className="flex justify-between text-sm font-medium text-ink-deep pt-3 border-t border-hairline-soft">
              <span>Tổng thanh toán:</span>
              <span className="text-ink-deep text-lg font-bold">{formatVND(finalTotal)}</span>
            </div>
            <p className="text-[11px] text-steel italic">
              (Đã bao gồm thuế GTGT và tem niêm phong chống tráo hàng)
            </p>
          </div>

          {/* Checkout Navigation Button: Cobalt Buy CTA */}
          <button
            onClick={handleProceedToCheckout}
            disabled={selectedItemIds.length === 0}
            className="btn-buy w-full py-3.5 rounded-full font-bold text-xs tracking-wider uppercase shadow-sticky transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Tiến hành Thanh toán {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
            <ArrowRight size={15} />
          </button>

          <div className="text-[11px] text-steel flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck size={14} className="text-primary" />
            <span>Cam kết hàng chính hãng 100% • Bảo hành 12 tháng</span>
          </div>
        </div>

      </div>

    </div>
  );
};
