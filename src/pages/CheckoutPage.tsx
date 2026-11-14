import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { orderService } from '../services/orderService';
import { sharedStore } from '../services/sharedStore';
import { promotionService } from '../services/promotionService';
import { paymentService } from '../services/paymentService';
import { formatVND } from '../components/common/PriceDisplay';
import { UserAddress } from '../types/user';
import { 
  ShieldCheck, 
  MapPin, 
  CreditCard, 
  Truck, 
  Ticket, 
  Clock, 
  QrCode, 
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  FileText,
  Check,
  Plus,
  X
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBuyNow = searchParams.get('buyNow') === 'true';

  const { 
    items, 
    clearCart, 
    removeItems,
    buyNowItem, 
    clearBuyNowItem, 
    getSelectedItems 
  } = useCartStore();
  const { user, addAddress } = useAuthStore();
  const { showToast } = useToastStore();

  // Xác định danh sách sản phẩm cần thanh toán
  const checkoutItems = isBuyNow 
    ? (buyNowItem ? [buyNowItem] : [])
    : (getSelectedItems().length > 0 ? getSelectedItems() : items);

  const addresses = user?.addresses || [];
  const hasAddresses = addresses.length > 0;

  // Selected address state
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(() => {
    const def = addresses.find(a => a.isDefault) || addresses[0];
    return def? def.addressId: null;
  });

  const [isAddingNewAddress, setIsAddingNewAddress] = useState<boolean>(!hasAddresses);

  // Address fields for order submission
  const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
  const [fullName, setFullName] = useState(defaultAddr?.recipientName || user?.fullName || '');
  const [phone, setPhone] = useState(defaultAddr?.phone || user?.phone || '');
  const [province, setProvince] = useState(defaultAddr?.province || 'Hà Nội');
  const [district, setDistrict] = useState(defaultAddr?.district || 'Quận Hai Bà Trưng');
  const [ward, setWard] = useState(defaultAddr?.ward || 'Phường Đồng Tâm');
  const [addressLine, setAddressLine] = useState(defaultAddr?.addressLine || '');
  const [note, setNote] = useState('');

  // New address form fields
  const [newRecipient, setNewRecipient] = useState(user?.fullName || '');
  const [newPhone, setNewPhone] = useState(user?.phone || '');
  const [newProvince, setNewProvince] = useState('Hà Nội');
  const [newDistrict, setNewDistrict] = useState('Quận Hai Bà Trưng');
  const [newWard, setNewWard] = useState('Phường Đồng Tâm');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);

  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'SIMULATED_TRANSFER'>('COD');

  const [voucherCode, setVoucherCode] = useState(searchParams.get('voucher') || '');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [vouchers, setVouchers] = useState(sharedStore.getVouchers());
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = shippingMethod === 'express'? 30000: 0;
  const totalAmount = Math.max(0, subtotal - voucherDiscount + shippingFee);

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

  // Sync address selection when addresses or selection changes
  useEffect(() => {
    if (addresses.length > 0) {
      const active = addresses.find(a => a.addressId === selectedAddressId) || addresses.find(a => a.isDefault) || addresses[0];
      if (active) {
        setSelectedAddressId(active.addressId);
        setFullName(active.recipientName);
        setPhone(active.phone);
        setProvince(active.province);
        setDistrict(active.district);
        setWard(active.ward);
        setAddressLine(active.addressLine);
      }
    } else {
      setIsAddingNewAddress(true);
    }
  }, [selectedAddressId, user?.addresses]);

  useEffect(() => {
    const urlVoucher = searchParams.get('voucher');
    if (urlVoucher) {
      applyVoucher(urlVoucher);
    }
  }, []);

  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.addressId);
    setFullName(addr.recipientName);
    setPhone(addr.phone);
    setProvince(addr.province);
    setDistrict(addr.district);
    setWard(addr.ward);
    setAddressLine(addr.addressLine);
    setIsAddingNewAddress(false);
  };

  const handleSaveNewAddress = (): boolean => {
    if (!newRecipient.trim()) {
      setErrorMsg('Vui lòng nhập họ tên người nhận cho địa chỉ mới.');
      showToast('Vui lòng nhập họ tên người nhận!', 'error');
      return false;
    }
    const cleanPhone = newPhone.trim();
    if (!cleanPhone ||!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(cleanPhone)) {
      setErrorMsg('Số điện thoại người nhận không đúng định dạng di động Việt Nam (10 chữ số).');
      showToast('Số điện thoại không đúng định dạng (10 chữ số)!', 'error');
      return false;
    }
    if (!newAddressLine.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ chi tiết (số nhà, đường) cho địa chỉ mới.');
      showToast('Vui lòng nhập địa chỉ chi tiết!', 'error');
      return false;
    }

    const createdAddr: Omit<UserAddress, 'addressId'> = {
      recipientName: newRecipient.trim(),
      phone: cleanPhone,
      province: newProvince.trim() || 'Hà Nội',
      district: newDistrict.trim() || 'Quận Hai Bà Trưng',
      ward: newWard.trim() || 'Phường Đồng Tâm',
      addressLine: newAddressLine.trim(),
      isDefault: addresses.length === 0? true: newIsDefault,
    };

    addAddress(createdAddr);
    
    setFullName(createdAddr.recipientName);
    setPhone(createdAddr.phone);
    setProvince(createdAddr.province);
    setDistrict(createdAddr.district);
    setWard(createdAddr.ward);
    setAddressLine(createdAddr.addressLine);

    setNewAddressLine('');
    setIsAddingNewAddress(false);
    setErrorMsg('');
    showToast('Đã lưu địa chỉ vào Sổ địa chỉ thành công!', 'success');
    return true;
  };

  // API 6.6: POST /api/v1/vouchers/apply
  const applyVoucher = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const res = await promotionService.applyVoucher(cleanCode, subtotal);

    if (!res.success) {
      showToast(res.message, 'error');
      return;
    }

    const discount = res.data?.discountAmount || 0;
    setVoucherDiscount(discount);
    setAppliedVoucher(cleanCode);
    setVoucherCode(cleanCode);
    showToast(`Áp dụng mã ${cleanCode}: Giảm ${formatVND(discount)}!`, 'success');
  };

  const handleRemoveVoucher = () => {
    setVoucherDiscount(0);
    setAppliedVoucher('');
    setVoucherCode('');
    showToast('Đã bỏ chọn mã voucher', 'info');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Bắt buộc phải có địa chỉ nhận hàng trong Sổ địa chỉ
    if (!hasAddresses || isAddingNewAddress) {
      const saved = handleSaveNewAddress();
      if (!saved) return;
    }

    // Form Validation
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng chọn hoặc nhập họ tên người nhận hàng.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone ||!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(cleanPhone)) {
      setErrorMsg('Số điện thoại không đúng định dạng di động Việt Nam (10 chữ số).');
      return;
    }
    if (!addressLine.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ cụ thể nhận hàng.');
      return;
    }
    if (checkoutItems.length === 0) {
      setErrorMsg('Không có sản phẩm nào để thanh toán.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullShippingAddress = `${addressLine.trim()}, ${ward}, ${district}, ${province}`;
      const res = await orderService.createOrder(
        {
          recipientName: fullName.trim(),
          recipientPhone: cleanPhone,
          shippingAddress: fullShippingAddress,
          paymentMethod: paymentMethod,
          shippingMethod: shippingMethod,
          expectedTotalAmount: totalAmount,
          note: note.trim(),
          voucherCode: appliedVoucher || undefined,
          items: checkoutItems.map(i => ({ variantId: i.variantId, quantity: i.quantity }))
        },
        user?.role || 'CUSTOMER',
        fullName.trim()
      );

      // API 10.1: POST /api/v1/payments/create-intent
      try {
        await paymentService.createPaymentIntent({
          orderId: res.orderId,
          paymentMethod: paymentMethod === 'SIMULATED_TRANSFER' ? 'BANK_TRANSFER' : 'COD',
          note: note.trim() || undefined,
        });
      } catch (intentErr) {
        console.warn('[CheckoutPage] createPaymentIntent error', intentErr);
      }

      // Quản lý dọn dẹp sau khi tạo đơn thành công:
      if (isBuyNow) {
        // Mua ngay: chỉ xóa buyNowItem, giữ nguyên giỏ hàng
        clearBuyNowItem();
      } else {
        // Thanh toán giỏ hàng: chỉ xóa các món đã chọn mua
        await removeItems(checkoutItems.map(i => i.id));
      }

      // Điều hướng đến trang thông báo thành công / tra cứu đơn
      navigate(`/orders?code=${res.orderCode}&created=true`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-medium text-ink-deep">
          {isBuyNow ? 'Phiên mua ngay đã kết thúc hoặc không tìm thấy sản phẩm' : 'Không có sản phẩm nào được chọn để thanh toán'}
        </h2>
        <p className="text-xs text-steel">
          {isBuyNow 
            ? 'Vui lòng quay lại trang chi tiết sản phẩm và nhấn Mua ngay lại.' 
            : 'Vui lòng quay lại giỏ hàng và tích chọn các sản phẩm bạn muốn thanh toán.'}
        </p>
        <Link to={isBuyNow ? '/' : '/cart'} className="btn-marketing inline-block text-xs font-bold px-6 py-3 rounded-full">
          {isBuyNow ? 'Quay lại cửa hàng' : 'Quay lại giỏ hàng'}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Breadcrumb */}
      <nav className="text-xs text-steel flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <span>/</span>
        {isBuyNow ? (
          <span className="text-steel">Mua ngay</span>
        ) : (
          <Link to="/cart" className="hover:text-primary transition-colors">Giỏ hàng</Link>
        )}
        <span>/</span>
        <span className="text-ink font-semibold">Thanh toán & Đặt hàng</span>
      </nav>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Delivery & Payment Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Thông tin giao hàng */}
          <div className="bg-canvas border border-hairline-soft rounded-xxl p-6 sm:p-8 space-y-5 shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-hairline-soft gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink-deep uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={16} className="text-primary" />
                  <span>1. Địa chỉ nhận hàng</span>
                </h2>
                <p className="text-[11px] text-steel mt-0.5">
                  Chọn địa chỉ nhận hàng lưu sẵn trong sổ địa chỉ hoặc thêm địa chỉ mới
                </p>
              </div>

              <div className="flex items-center gap-2">
                {hasAddresses &&!isAddingNewAddress && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-surface-soft px-3 py-1.5 rounded-full border border-hairline-soft hover:border-primary transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Thêm địa chỉ mới</span>
                  </button>
                )}
                {user && (
                  <Link
                    to="/account"
                    className="text-[11px] text-steel hover:text-primary transition-colors hidden sm:inline-block"
                  >
                    Quản lý sổ địa chỉ ↗
                  </Link>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-surface-soft border border-critical/30 text-critical text-xs rounded-xl flex items-center gap-2.5">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TRƯỜNG HỢP 1: Chưa có địa chỉ nào trong Sổ địa chỉ */}
            {!hasAddresses && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                  <span>Bạn chưa có địa chỉ nhận hàng nào trong Sổ địa chỉ!</span>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  Để mua hàng, vui lòng nhập thông tin địa chỉ nhận hàng bên dưới. Hệ thống sẽ tự động lưu vào Sổ địa chỉ của bạn để sử dụng cho đơn hàng này và các lần mua tiếp theo.
                </p>
              </div>
            )}

            {/* TRƯỜNG HỢP 2: Đã có danh sách địa chỉ và đang chọn */}
            {hasAddresses &&!isAddingNewAddress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-steel">Chọn địa chỉ giao tới:</span>
                  <span className="text-[11px] text-steel">Cuộn chuột để xem ({addresses.length} địa chỉ lưu sẵn)</span>
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1.5">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.addressId;
                    return (
                      <div
                        key={addr.addressId}
                        onClick={() => handleSelectAddress(addr)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex items-start gap-3.5 ${
                          isSelected? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20': 'border-hairline-soft bg-canvas hover:border-charcoal/40 hover:bg-surface-soft/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingAddressRadio"
                          checked={isSelected}
                          onChange={() => handleSelectAddress(addr)}
                          className="mt-1 h-4 w-4 text-primary focus:ring-primary border-hairline cursor-pointer flex-shrink-0"
                        />
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-ink-deep">{addr.recipientName}</span>
                            <span className="text-steel text-xs font-mono font-medium">({addr.phone})</span>
                            {addr.isDefault && (
                              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                                Mặc định
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] bg-success/10 text-success font-bold px-2 py-0.5 rounded-full border border-success/30 flex items-center gap-1 sm:ml-auto">
                                <Check size={11} /> Đang chọn
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-charcoal leading-relaxed line-clamp-2">
                            {addr.addressLine}, {addr.ward}, {addr.district}, {addr.province}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FORM THÊM ĐỊA CHỈ MỚI VÀO SỔ ĐỊA CHỈ */}
            {(isAddingNewAddress ||!hasAddresses) && (
              <div className="p-5 bg-surface-soft border border-hairline-soft rounded-xl space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-hairline-soft">
                  <h3 className="font-bold text-xs text-ink-deep uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={14} className="text-primary" />
                    <span>Thêm địa chỉ nhận hàng vào Sổ địa chỉ</span>
                  </h3>
                  {hasAddresses && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewAddress(false)}
                      className="text-[11px] text-steel hover:text-ink flex items-center gap-1 underline cursor-pointer"
                    >
                      <X size={12} /> Hủy bỏ, chọn địa chỉ có sẵn
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-charcoal font-medium mb-1.5">
                      Họ tên người nhận <span className="text-critical">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-charcoal font-medium mb-1.5">
                      Số điện thoại nhận hàng <span className="text-critical">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ví dụ: 0987654321"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink font-mono focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-charcoal font-medium mb-1.5">Tỉnh / Thành phố <span className="text-critical">*</span></label>
                    <input
                      type="text"
                      required
                      value={newProvince}
                      onChange={(e) => setNewProvince(e.target.value)}
                      className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-charcoal font-medium mb-1.5">Quận / Huyện <span className="text-critical">*</span></label>
                    <input
                      type="text"
                      required
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-charcoal font-medium mb-1.5">Phường / Xã <span className="text-critical">*</span></label>
                    <input
                      type="text"
                      required
                      value={newWard}
                      onChange={(e) => setNewWard(e.target.value)}
                      className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-charcoal font-medium mb-1.5">
                      Địa chỉ chi tiết (Số nhà, đường) <span className="text-critical">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Số 12, Phố Vọng"
                      value={newAddressLine}
                      onChange={(e) => setNewAddressLine(e.target.value)}
                      className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-charcoal">
                      <input
                        type="checkbox"
                        checked={newIsDefault}
                        onChange={(e) => setNewIsDefault(e.target.checked)}
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Đặt làm địa chỉ mặc định trong Sổ địa chỉ</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleSaveNewAddress}
                      className="btn-marketing px-5 py-2.5 text-xs font-bold rounded-full shadow-xs cursor-pointer self-start sm:self-auto"
                    >
                      Lưu vào Sổ & Sử dụng địa chỉ này
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ghi chú giao hàng */}
            <div className="text-xs pt-3 border-t border-hairline-soft">
              <label className="block text-charcoal font-medium mb-1.5">Ghi chú giao hàng</label>
              <input
                type="text"
                placeholder="Ví dụ: Gọi trước khi giao, giao trong giờ hành chính..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 2. Phương thức vận chuyển mô phỏng */}
          <div className="bg-canvas border border-hairline-soft rounded-xxl p-6 sm:p-8 space-y-4 shadow-none">
            <h2 className="text-sm font-bold text-ink-deep uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-hairline-soft">
              <Truck size={16} className="text-primary" />
              <span>2. Hình thức giao hàng (Mô phỏng)</span>
            </h2>

            <div className="space-y-3 text-xs">
              <label className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition ${
                shippingMethod === 'standard'? 'border-2 border-primary bg-surface-soft': 'border border-hairline-soft bg-canvas hover:border-charcoal'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                    className="w-4 h-4 text-primary accent-primary"
                  />
                  <div>
                    <strong className="text-ink-deep block font-medium">Giao hàng tiêu chuẩn (Toàn quốc)</strong>
                    <span className="text-steel text-[11px]">Dự kiến nhận sau 2-3 ngày làm việc</span>
                  </div>
                </div>
                <span className="text-success font-bold">Miễn phí</span>
              </label>

              <label className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition ${
                shippingMethod === 'express'? 'border-2 border-primary bg-surface-soft': 'border border-hairline-soft bg-canvas hover:border-charcoal'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                    className="w-4 h-4 text-primary accent-primary"
                  />
                  <div>
                    <strong className="text-ink-deep block font-medium">Giao hỏa tốc 2 giờ (Hà Nội & TP.HCM)</strong>
                    <span className="text-steel text-[11px]">Nhận máy ngay trong ngày có hẹn giờ</span>
                  </div>
                </div>
                <span className="text-ink-deep font-bold">30.000₫</span>
              </label>
            </div>
          </div>

          {/* 3. Phương thức thanh toán mô phỏng */}
          <div className="bg-canvas border border-hairline-soft rounded-xxl p-6 sm:p-8 space-y-4 shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <h2 className="text-sm font-bold text-ink-deep uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                <span>3. Phương thức thanh toán (Mô phỏng)</span>
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              
              {/* Option COD */}
              <label className={`flex items-start gap-3.5 p-4 rounded-xl cursor-pointer transition ${
                paymentMethod === 'COD'? 'border-2 border-primary bg-surface-soft': 'border border-hairline-soft bg-canvas hover:border-charcoal'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="w-4 h-4 text-primary accent-primary mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-ink-deep text-xs font-bold">Thanh toán khi nhận hàng (COD - Khuyên dùng)</strong>
                  </div>
                  <p className="text-xs text-steel leading-relaxed">
                    Được quyền đồng kiểm tra ngoại quan máy và niêm phong chính hãng trước khi thanh toán tiền cho nhân viên giao hàng. Đơn hàng mang trạng thái <strong>Chờ xác nhận</strong>.
                  </p>
                </div>
              </label>

              {/* Option Simulated QR Transfer */}
              <label className={`flex items-start gap-3.5 p-4 rounded-xl cursor-pointer transition ${
                paymentMethod === 'SIMULATED_TRANSFER'? 'border-2 border-primary bg-surface-soft': 'border border-hairline-soft bg-canvas hover:border-charcoal'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'SIMULATED_TRANSFER'}
                  onChange={() => setPaymentMethod('SIMULATED_TRANSFER')}
                  className="w-4 h-4 text-primary accent-primary mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-ink-deep text-xs font-bold">Chuyển khoản qua mã QR (Mô phỏng VietQR)</strong>
                    <span className="bg-surface-soft text-attention font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-attention/30 flex items-center gap-1">
                      <Clock size={11} /> Giữ chỗ kho 30 phút
                    </span>
                  </div>
                  <p className="text-xs text-steel leading-relaxed">
                    Hệ thống tự động hiển thị mã QR và nội dung là mã đơn hàng. Áp dụng thời hạn giữ chỗ tồn kho tối đa <strong>30 phút</strong>.
                  </p>
                </div>
              </label>

            </div>
          </div>

        </div>

        {/* Right Column: Order Summary & Placement (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-24">
          
          <div className="bg-canvas border border-hairline-soft rounded-xl p-6 shadow-sticky space-y-5">
            <h3 className="font-bold text-xs text-ink-deep uppercase tracking-wider pb-3 border-b border-hairline-soft flex items-center justify-between">
              <span>Đơn hàng của bạn ({checkoutItems.length} mặt hàng)</span>
              {!isBuyNow && (
                <Link to="/cart" className="text-primary text-xs hover:underline font-semibold">
                  Sửa giỏ hàng
                </Link>
              )}
            </h3>

            {/* List items mini */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {checkoutItems.map((it) => (
                <div key={it.id} className="flex gap-3 items-center text-xs">
                  <img
                    src={it.imageUrl}
                    alt={it.productName}
                    className="w-12 h-12 object-contain rounded-lg bg-surface-soft p-1.5 border border-hairline-soft flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <strong className="text-ink-deep line-clamp-1 block text-xs font-bold">{it.productName}</strong>
                    <div className="text-[11px] text-steel">
                      <span>{it.color}</span> • <span>{it.storage}</span> • <span>x{it.quantity}</span>
                    </div>
                    <div className="font-mono text-[10px] text-steel">SKU: {it.sku}</div>
                  </div>
                  <div className="font-bold text-ink-deep text-xs">
                    {formatVND(it.price * it.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Voucher Selection & Display */}
            <div className="pt-3 border-t border-hairline-soft space-y-2.5">
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
                  className="flex-1 h-10 px-3 bg-canvas border border-hairline rounded-lg text-xs text-ink uppercase font-mono font-bold focus:outline-none focus:border-2 focus:border-fb-blue"
                />
                <button
                  type="button"
                  onClick={() => applyVoucher(voucherCode)}
                  className="btn-marketing px-4 py-2 text-xs font-bold rounded-full"
                >
                  Áp dụng
                </button>
              </div>

              {appliedVoucher && (
                <div className="text-xs text-success font-medium bg-surface-soft p-2.5 rounded-lg border border-success/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Check size={14} />
                    <span>Đang áp dụng: <strong>{appliedVoucher}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">-{formatVND(voucherDiscount)}</span>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="text-steel hover:text-alert text-[11px] underline ml-1 cursor-pointer transition-colors"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              )}

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
                            handleRemoveVoucher();
                          } else {
                            applyVoucher(v.code);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                          isSelected? 'border-ink-deep bg-surface-soft text-ink-deep font-bold shadow-xs': isEligible? 'border-hairline-soft bg-canvas hover:border-charcoal text-ink cursor-pointer': 'border-hairline-soft bg-surface-soft opacity-50 cursor-not-allowed text-steel'
                        }`}
                      >
                        <div className="pr-2">
                          <div className="font-mono font-bold text-xs text-ink-deep flex items-center gap-1.5">
                            <span>{v.code}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-success inline-block"></span>}
                          </div>
                          <div className="text-[11px] text-steel">
                            Giảm {(v.discountType === 'PERCENT' || (v.discountType as any) === 'PERCENTAGE')? `${v.discountValue}%`: formatVND(v.discountValue)} cho đơn từ {formatVND(v.minOrderValue)}
                            {(v.discountType === 'PERCENT' || (v.discountType as any) === 'PERCENTAGE') && v.maxDiscount? ` (tối đa ${formatVND(v.maxDiscount)})`: ''}
                          </div>
                          {(v.startAt || v.expiredAt) && (
                            <div className="text-[10px] text-steel/80 font-mono mt-0.5">
                              HSD: {v.startAt ? new Date(v.startAt).toLocaleDateString('vi-VN') : 'Nay'} - {v.expiredAt ? new Date(v.expiredAt).toLocaleDateString('vi-VN') : 'KGH'}
                            </div>
                          )}
                        </div>
                        {isSelected? (
                          <span className="text-[11px] font-bold text-success bg-surface-soft px-2 py-0.5 rounded-full border border-success/30 flex items-center gap-1 flex-shrink-0">
                            <Check size={11} /> Đã chọn
                          </span>
                        ): (
                          <span className="text-[11px] font-bold text-primary flex-shrink-0">
                            {isEligible? 'Chọn': 'Chưa đủ ĐK'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Financial Calculations */}
            <div className="space-y-2.5 text-xs pt-3 border-t border-hairline-soft text-charcoal">
              <div className="flex justify-between">
                <span>Tạm tính hàng hóa:</span>
                <strong className="text-ink-deep font-medium">{formatVND(subtotal)}</strong>
              </div>

              {voucherDiscount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Giảm giá Voucher:</span>
                  <strong className="font-bold">-{formatVND(voucherDiscount)}</strong>
                </div>
              )}

              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <span>{shippingFee === 0? <strong className="text-success font-medium">Miễn phí</strong>: formatVND(shippingFee)}</span>
              </div>

              <div className="flex justify-between text-sm font-medium text-ink-deep pt-3 border-t border-hairline-soft">
                <span>Tổng tiền thanh toán:</span>
                <span className="text-ink-deep text-lg font-bold">{formatVND(totalAmount)}</span>
              </div>
            </div>

            {/* Submit Button: Cobalt CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-buy w-full py-4 rounded-full font-bold text-xs tracking-wider uppercase shadow-sticky transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting? (
                <span>Đang xử lý tạo đơn & giữ chỗ kho...</span>
              ): (
                <>
                  <CheckCircle size={16} />
                  <span>Xác nhận Đặt hàng ngay</span>
                </>
              )}
            </button>

           
          </div>

        </div>

      </form>

    </div>
  );
};
