import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { paymentService, PaymentIntentData } from '../services/paymentService';
import { sharedStore, cleanLogNote } from '../services/sharedStore';
import { productService } from '../services/productService';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { OrderDetail, OrderStatus, OrderItemSnapshot } from '../types/order';
import { formatVND } from '../components/common/PriceDisplay';
import { ReviewImageUploader, ReviewImageFile } from '../components/common/ReviewImageUploader';
import { 
  Search, 
  Package, 
  CheckCircle,
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertCircle, 
  XCircle, 
  QrCode, 
  RotateCcw,
  ShieldCheck,
  FileText,
  Printer,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Star,
  X,
  Copy,
  Check
} from 'lucide-react';

export const resolveOrderReturnState = (ord: OrderDetail, returnRequests?: any[]) => {
  const reqs = returnRequests || sharedStore.getReturnRequests();
  const matchedReq = reqs.find((r: any) => r.orderId === ord.orderId || r.orderCode === ord.orderCode);

  const historyRejectNote = ord.statusHistory?.find((h: { note?: string }) => {
    const lower = (h.note || '').toLowerCase();
    return lower.includes('đổi trả') && lower.includes('bị từ chối');
  })?.note;

  const returnStatus =
    ord.returnStatus ||
    matchedReq?.status ||
    (ord.paymentStatus === 'REFUNDED' ? 'APPROVED' : historyRejectNote ? 'REJECTED' : undefined);

  return {
    returnId: ord.returnId || matchedReq?.returnId,
    returnStatus,
    rejectReason: ord.returnRejectReason || matchedReq?.rejectReason || historyRejectNote,
    inspectionResult: ord.returnInspectionResult || matchedReq?.inspectionResult,
    refundAmount: ord.returnRefundAmount ?? matchedReq?.refundAmount,
  };
};

export const checkIsReturnOrder = (ord: OrderDetail, returnRequests?: any[]) => {
  if (ord.paymentStatus === 'REFUNDED') return true;
  const retInfo = resolveOrderReturnState(ord, returnRequests);
  if (retInfo.returnStatus) return true;
  const isFailedDelivery = 
    ord.cancelReason?.includes('Giao thất bại') || 
    ord.cancelReason?.includes('RETURN') || 
    ord.cancelReason?.includes('hoàn kho') ||
    ord.cancelReason?.includes('hoàn hàng') ||
    ord.cancelReason?.includes('từ chối nhận') ||
    ord.cancelReason?.includes('đổi trả');
  const hasReturnHistory = ord.statusHistory?.some((h: { note?: string }) => {
    const note = h.note?.toLowerCase() || '';
    return note.includes('đổi trả') || note.includes('hoàn kho') || note.includes('hoàn hàng') || note.includes('thất bại');
  });
  return Boolean(isFailedDelivery) || Boolean(hasReturnHistory);
};

export const getStatusBadge = (status: OrderStatus, order?: OrderDetail) => {
  if (order && checkIsReturnOrder(order)) {
    const ret = resolveOrderReturnState(order);
    if (ret.returnStatus === 'REJECTED') {
      return {
        label: 'Hoàn trả thất bại (Đã từ chối)',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    }
    if (ret.returnStatus === 'APPROVED' || order.paymentStatus === 'REFUNDED') {
      return {
        label: 'Đã hoàn hàng / Hoàn tiền',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    }
    if (ret.returnStatus === 'PENDING' || ret.returnStatus === 'INSPECTING') {
      return {
        label: 'Đang xử lý đổi trả',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500'
      };
    }
    return {
      label: 'Hoàn hàng / Trả hàng',
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      dot: 'bg-purple-500'
    };
  }

  switch (status) {
    case 'PENDING_PAYMENT':
      return {
        label: 'Chờ thanh toán',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'WAITING_CONFIRMATION':
      return {
        label: 'Chờ xác nhận',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500'
      };
    case 'CONFIRMED':
      return {
        label: 'Đã xác nhận',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-500'
      };
    case 'PREPARING':
      return {
        label: 'Đang chuẩn bị hàng',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500'
      };
    case 'PICKED_UP':
      return {
        label: 'Đã lấy hàng',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500'
      };
    case 'SHIPPING':
      return {
        label: 'Đang giao hàng',
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        dot: 'bg-cyan-500'
      };
    case 'COMPLETED':
      return {
        label: 'Giao thành công',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    default:
      return {
        label: status,
        bg: 'bg-gray-50 text-gray-700 border-gray-200',
        dot: 'bg-gray-500'
      };
  }
};

const ORDER_STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: 'WAITING_CONFIRMATION', label: 'Chờ xác nhận', desc: 'Đã tạo đơn & giữ chỗ kho' },
  { key: 'CONFIRMED', label: 'Đã xác nhận', desc: 'Duyệt xuất soạn hàng' },
  { key: 'PREPARING', label: 'Đang chuẩn bị', desc: 'Kiểm đếm & đóng gói' },
  { key: 'SHIPPING', label: 'Đang giao hàng', desc: 'Đã xuất kho vật lý' },
  { key: 'COMPLETED', label: 'Hoàn tất', desc: 'Giao thành công & chốt DT' },
];

export const OrderTrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code') || '';
  const isJustCreated = searchParams.get('created') === 'true';

  const [allOrders, setAllOrders] = useState<OrderDetail[]>([]);
  const [orderFilterTab, setOrderFilterTab] = useState<'ALL' | 'WAITING_CONFIRMATION' | 'PREPARING' | 'SHIPPING' | 'COMPLETED' | 'RETURNS' | 'CANCELLED'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(urlCode? 'detail': 'list');

  const [searchCode, setSearchCode] = useState(urlCode);
  const [phoneFilter, setPhoneFilter] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Modal hủy đơn
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Đổi ý không có nhu cầu mua nữa');

  // Modal yêu cầu Đổi trả trong 7 ngày
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('Lỗi phần cứng từ nhà sản xuất (yêu cầu đổi 1-1)');
  const [returnNote, setReturnNote] = useState('');
  const [returnBankName, setReturnBankName] = useState('');
  const [returnAccountNumber, setReturnAccountNumber] = useState('');
  const [returnAccountHolder, setReturnAccountHolder] = useState('');

  // Modal xem biểu mẫu số hóa
  const [viewFormModal, setViewFormModal] = useState<'ORDER' | 'CONFIRM' | 'EXPORT' | 'RETURN' | null>(null);

  const { user } = useAuthStore();
  const { showToast } = useToastStore();

  // Review modal state
  const [reviewedOrderItemIds, setReviewedOrderItemIds] = useState<number[]>([]);
  const [reviewModalItem, setReviewModalItem] = useState<{
    orderItemId: number;
    productId: number;
    productName: string;
    orderCode: string;
    customerName: string;
    customerPhone: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<ReviewImageFile[]>([]);
  const [reviewMessage, setReviewMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadReviewedItems = () => {
    const revs = sharedStore.getReviews(undefined, true);
    const ids = revs.map(r => r.orderItemId).filter((id): id is number => typeof id === 'number');
    setReviewedOrderItemIds(ids);
  };

  const loadAllOrders = async () => {
    const list = await orderService.getAllOrders();
    setAllOrders(list);
    return list;
  };

  const fetchOrder = async (code: string, phone?: string) => {
    setIsLoading(true);
    setNotFound(false);
    const res = await orderService.trackOrder(code, phone);
    if (res) {
      setOrder(res);
      setViewMode('detail');
    } else {
      setOrder(null);
      setNotFound(true);
      setViewMode('detail');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllOrders();
    loadReviewedItems();
    if (urlCode) {
      fetchOrder(urlCode);
    } else {
      setViewMode('list');
    }
  }, [urlCode]);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isNotifyingPayment, setIsNotifyingPayment] = useState(false);

  // Countdown timer cho QR chuyển khoản (15 phút)
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; isExpired: boolean }>({
    minutes: 15,
    seconds: 0,
    isExpired: false,
  });

  // Tính toán đếm ngược thời gian hết hạn mã QR
  useEffect(() => {
    if (!order || order.paymentStatus === 'PAID') return;
    const isTransfer = order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER' || order.status === 'PENDING_PAYMENT';
    if (!isTransfer) return;

    const calculateTime = () => {
      let deadlineMs = 0;
      if (order.paymentDeadline) {
        deadlineMs = new Date(order.paymentDeadline).getTime();
      } else {
        const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
        deadlineMs = createdMs + 30 * 60 * 1000;
      }

      const diffSec = Math.floor((deadlineMs - Date.now()) / 1000);
      if (diffSec <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
      } else {
        setTimeLeft({
          minutes: Math.floor(diffSec / 60),
          seconds: diffSec % 60,
          isExpired: false,
        });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [order?.paymentDeadline, order?.createdAt, order?.paymentStatus, order?.paymentMethod, order?.status]);

  // Tự động hủy đơn hàng và nhả tồn kho khi QR hết hiệu lực (30 phút)
  useEffect(() => {
    if (timeLeft.isExpired && order && order.status === 'PENDING_PAYMENT' && order.paymentStatus !== 'PAID') {
      const cancelReasonText = 'Mã QR hết hiệu lực thanh toán (Quá thời hạn giữ chỗ 30 phút) - Hệ thống tự động hủy đơn và nhả tồn kho';
      
      // 1. Gọi backend hủy đơn và nhả tồn kho
      orderService.cancelOrder(order.orderCode, cancelReasonText, 'Hệ thống tự động').catch(() => {});
      
      // 2. Cập nhật sharedStore để hoàn trả tồn kho ngay lập tức
      sharedStore.cancelOrder(order.orderId, cancelReasonText, 'Hệ thống tự động');
      
      // 3. Cập nhật state order của trang hiện tại
      const updated = sharedStore.getOrderById(order.orderId);
      if (updated) {
        setOrder(updated);
      } else {
        setOrder(prev => prev ? {
          ...prev,
          status: 'CANCELLED',
          cancelReason: cancelReasonText
        } : null);
      }

      showToast('Đơn hàng đã tự động bị hủy do hết hạn thanh toán QR. Toàn bộ tồn kho giữ chỗ đã được giải phóng!', 'warning');
    }
  }, [timeLeft.isExpired, order?.orderId, order?.status, order?.paymentStatus]);

  // Tự động đồng bộ khi Admin xác nhận thanh toán (qua sharedStore hoặc Polling API)
  useEffect(() => {
    if (!order) return;

    // 1. Lắng nghe sharedStore (tự động nhận ngay lập tức khi Admin thao tác cùng hệ thống)
    const unsubscribe = sharedStore.subscribe(() => {
      const freshOrder = sharedStore.getOrderById(order.orderId) || (order.orderCode ? sharedStore.getOrderByCode(order.orderCode) : undefined);
      if (freshOrder && (freshOrder.paymentStatus !== order.paymentStatus || freshOrder.status !== order.status)) {
        setOrder(freshOrder);
        if (freshOrder.paymentStatus === 'PAID') {
          showToast('Đơn hàng đã được xác nhận thanh toán thành công!', 'success');
        }
      }
    });

    // 2. Định kỳ kiểm tra backend mỗi 3 giây nếu đơn hàng chưa thanh toán
    let pollInterval: any = null;
    if (order.paymentStatus !== 'PAID' && (order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER' || order.status === 'PENDING_PAYMENT')) {
      pollInterval = setInterval(async () => {
        try {
          const fresh = await orderService.trackOrder(order.orderCode);
          if (fresh && fresh.paymentStatus === 'PAID') {
            setOrder(fresh);
            sharedStore.updateOrderPaymentStatus(fresh.orderId, 'PAID');
            showToast('Đơn hàng đã được xác nhận thanh toán thành công!', 'success');
          }
        } catch (_) {}
      }, 3000);
    }

    return () => {
      unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [order?.orderId, order?.orderCode, order?.paymentStatus, order?.status]);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Đã sao chép ${fieldName}!`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // API 10.1: POST /api/v1/payments/create-intent khi đơn chuyển khoản chưa thanh toán
  useEffect(() => {
    const isTransfer = order && (order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER');
    const isNotPaid = order && order.paymentStatus !== 'PAID';
    if (isTransfer && isNotPaid) {
      paymentService.createPaymentIntent({
        orderId: order.orderId,
        paymentMethod: 'BANK_TRANSFER',
      }).then(intent => {
        if (intent) setPaymentIntent(intent);
      }).catch(err => {
        console.warn('[OrderTrackingPage] createPaymentIntent error', err);
      });
    }
  }, [order?.orderId, order?.status, order?.paymentStatus, order?.paymentMethod]);

  const handleOpenReviewModal = (item: OrderItemSnapshot, ord: OrderDetail) => {
    setReviewModalItem({
      orderItemId: item.orderItemId,
      productId: item.productId,
      productName: item.productNameSnapshot,
      orderCode: ord.orderCode,
      customerName: user?.fullName || ord.recipientName || 'Khách hàng',
      customerPhone: user?.phone || ord.recipientPhone || ''
    });
    setReviewRating(5);
    setReviewComment('');
    setReviewImages([]);
    setReviewMessage(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalItem || !reviewComment.trim()) return;

    setReviewMessage(null);
    setIsSubmittingReview(true);
    const res = await productService.submitReview({
      orderItemId: reviewModalItem.orderItemId,
      productId: reviewModalItem.productId,
      productName: reviewModalItem.productName,
      userName: reviewModalItem.customerName,
      phone: reviewModalItem.customerPhone,
      rating: reviewRating,
      comment: reviewComment.trim(),
      imageFiles: reviewImages.map(img => img.file)
    });
    setIsSubmittingReview(false);

    if (res.success) {
      setReviewMessage({ text: res.message, type: 'success' });
      setReviewedOrderItemIds(prev => [...prev, reviewModalItem.orderItemId]);
      showToast("Cảm ơn bạn đã gửi đánh giá sản phẩm thành công!", "success");
      setTimeout(() => {
        setReviewModalItem(null);
      }, 1200);
    } else {
      setReviewMessage({ text: res.message, type: 'error' });
    }
  };

  const handleSelectOrderFromList = (ord: OrderDetail) => {
    setOrder(ord);
    setSearchCode(ord.orderCode);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    orderService.getOrderByCode(ord.orderCode).then(full => {
      if (full) setOrder(full);
    }).catch(() => {});
  };

  const handleBackToList = () => {
    setViewMode('list');
    setOrder(null);
    setNotFound(false);
    loadAllOrders();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = orderSearchQuery.trim();
    if (!query) return;

    // Tìm đơn khớp chính xác mã đơn (kể cả có dấu # hoặc không)
    const exactMatch = allOrders.find(
      o => o.orderCode.toLowerCase() === query.toLowerCase() ||
           o.orderCode.toLowerCase() === query.replace(/^#/, '').toLowerCase()
    );

    if (exactMatch) {
      handleSelectOrderFromList(exactMatch);
    } else {
      fetchOrder(query);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      fetchOrder(searchCode.trim(), phoneFilter.trim() || undefined);
    }
  };

  const handleConfirmCancel = async () => {
    if (!order) return;
    const success = await orderService.cancelOrder(order.orderCode, cancelReason);
    if (success) {
      showToast("Hủy đơn hàng thành công! Số lượng sản phẩm đã được giải phóng và hoàn lại tồn kho bán lẻ.", 'success');
      setShowCancelModal(false);
      fetchOrder(order.orderCode);
      loadAllOrders();
    } else {
      showToast("Đơn hàng không ở trạng thái cho phép tự hủy (chỉ hủy được khi Chờ thanh toán hoặc Chờ xác nhận).", 'warning');
    }
  };

  const handleConfirmReturn = async () => {
    if (!order) return;
    const isCodOrder = (order.paymentMethod || 'COD').toUpperCase() === 'COD';
    const bankInfo = (returnBankName.trim() || returnAccountNumber.trim() || returnAccountHolder.trim())
      ? {
          bankName: returnBankName.trim(),
          accountNumber: returnAccountNumber.trim(),
          accountHolder: returnAccountHolder.trim(),
        }
      : undefined;

    if (isCodOrder && (!bankInfo?.bankName || !bankInfo?.accountNumber || !bankInfo?.accountHolder)) {
      showToast('Vui lòng cung cấp đầy đủ thông tin tài khoản ngân hàng nhận tiền hoàn đối với đơn thanh toán COD!', 'warning');
      return;
    }

    const reasonText = `${returnReason}${returnNote? `: ${returnNote}`: ''}`;
    const res = await orderService.requestReturn(order.orderId, reasonText, bankInfo);
    if (res.success) {
      showToast(res.message, 'success');
      setShowReturnModal(false);
      setReturnNote('');
      setReturnBankName('');
      setReturnAccountNumber('');
      setReturnAccountHolder('');
      fetchOrder(order.orderCode);
    } else {
      showToast(res.message, 'warning');
    }
  };

  // Xác định bước hiện tại trong tiến trình
  const getStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'PENDING_PAYMENT':
      case 'WAITING_CONFIRMATION': return 0;
      case 'CONFIRMED': return 1;
      case 'PREPARING': return 2;
      case 'PICKED_UP': return 2;
      case 'SHIPPING': return 3;
      case 'COMPLETED': return 4;
      case 'CANCELLED': return -1;
      default: return 0;
    }
  };

  const currentStepIdx = order? getStepIndex(order.status): 0;
  const isCancellable = order && (order.status === 'PENDING_PAYMENT' || order.status === 'WAITING_CONFIRMATION');
  const currentReturnState = order ? resolveOrderReturnState(order) : undefined;
  const hasBlockingReturn = currentReturnState?.returnStatus && currentReturnState.returnStatus !== 'REJECTED';
  const isReturnEligible = order && order.status === 'COMPLETED' && order.paymentStatus !== 'REFUNDED' && !hasBlockingReturn;

  const returnRequests = sharedStore.getReturnRequests();
  const isReturnOrder = (ord: OrderDetail) => checkIsReturnOrder(ord, returnRequests);

  const waitingCount = allOrders.filter(o => (o.status === 'WAITING_CONFIRMATION' || o.status === 'PENDING_PAYMENT') &&!isReturnOrder(o)).length;
  const preparingCount = allOrders.filter(o => (o.status === 'CONFIRMED' || o.status === 'PREPARING') &&!isReturnOrder(o)).length;
  const shippingCount = allOrders.filter(o => o.status === 'SHIPPING' &&!isReturnOrder(o)).length;
  const completedCount = allOrders.filter(o => o.status === 'COMPLETED' &&!isReturnOrder(o)).length;
  const returnsCount = allOrders.filter(o => isReturnOrder(o)).length;
  const cancelledCount = allOrders.filter(o => o.status === 'CANCELLED' &&!isReturnOrder(o)).length;
  const totalCount = allOrders.length;

  const FILTER_TABS: { key: 'ALL' | 'WAITING_CONFIRMATION' | 'PREPARING' | 'SHIPPING' | 'COMPLETED' | 'RETURNS' | 'CANCELLED'; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: totalCount },
    { key: 'WAITING_CONFIRMATION', label: 'Chờ xác nhận', count: waitingCount },
    { key: 'PREPARING', label: 'Chờ lấy hàng', count: preparingCount },
    { key: 'SHIPPING', label: 'Chờ giao hàng', count: shippingCount },
    { key: 'COMPLETED', label: 'Đã giao', count: completedCount },
    { key: 'RETURNS', label: 'Trả hàng', count: returnsCount },
    { key: 'CANCELLED', label: 'Đã hủy', count: cancelledCount },
  ];

  const filteredOrders = allOrders.filter(ord => {
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.trim().toLowerCase();
      const codeMatch = ord.orderCode.toLowerCase().includes(q) || `#${ord.orderCode.toLowerCase()}`.includes(q);
      const phoneMatch = ord.recipientPhone.toLowerCase().includes(q);
      const nameMatch = ord.recipientName.toLowerCase().includes(q);
      const itemMatch = ord.items.some(it => it.productNameSnapshot.toLowerCase().includes(q));
      if (!codeMatch && !phoneMatch && !nameMatch && !itemMatch) {
        return false;
      }
    }

    const isRet = isReturnOrder(ord);
    if (orderFilterTab === 'WAITING_CONFIRMATION') {
      return (ord.status === 'WAITING_CONFIRMATION' || ord.status === 'PENDING_PAYMENT') &&!isRet;
    }
    if (orderFilterTab === 'PREPARING') {
      return (ord.status === 'CONFIRMED' || ord.status === 'PREPARING') &&!isRet;
    }
    if (orderFilterTab === 'SHIPPING') {
      return ord.status === 'SHIPPING' &&!isRet;
    }
    if (orderFilterTab === 'COMPLETED') {
      return ord.status === 'COMPLETED' &&!isRet;
    }
    if (orderFilterTab === 'RETURNS') {
      return isRet;
    }
    if (orderFilterTab === 'CANCELLED') {
      return ord.status === 'CANCELLED' &&!isRet;
    }
    return true;
  });

  useEffect(() => {
    setVisibleCount(8);
  }, [orderFilterTab, orderSearchQuery]);

  const displayedOrders = filteredOrders.slice(0, visibleCount);

  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [allOrders, viewMode]);

  const scrollTabs = (dir: 'left' | 'right') => {
    if (tabsRef.current) {
      const amount = dir === 'left'? -220: 220;
      tabsRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkScroll, 320);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Thông báo vừa tạo đơn */}
      {isJustCreated && (
        <div className="p-4 bg-surface-soft border border-success/30 rounded-xl text-xs text-charcoal flex items-start gap-3">
          <CheckCircle size={20} className="text-success flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-ink-deep">Đặt hàng thành công!</h4>
            <p className="mt-0.5 text-steel leading-relaxed">
              Đơn hàng của bạn đã được ghi nhận.
            </p>
          </div>
        </div>
      )}

      {/* 2. Kết quả Tra cứu */}
      {isLoading? (
        <div className="py-16 text-center text-steel text-xs bg-canvas rounded-xxl border border-hairline-soft">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-semibold text-charcoal">Đang truy xuất thông tin đơn hàng...</p>
        </div>
      ): notFound? (
        <div className="py-12 text-center text-steel text-xs bg-canvas rounded-xxl border border-hairline-soft p-6 space-y-3">
          <AlertCircle size={28} className="text-attention mx-auto" />
          <h4 className="font-bold text-sm text-ink-deep">Không tìm thấy đơn hàng</h4>
          <p className="text-steel">Vui lòng kiểm tra lại mã đơn hàng hoặc số điện thoại.</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleBackToList}
              className="btn-marketing px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Xem danh sách đơn hàng</span>
            </button>
          </div>
        </div>
      ): viewMode === 'detail' && order? (
        <div className="space-y-6">
          
          {/* Nút quay lại danh sách đơn hàng */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-deep hover:text-primary bg-surface-soft hover:bg-hairline-soft/80 px-4 py-2 rounded-full border border-hairline-soft transition-all cursor-pointer shadow-xs self-start"
              >
                <ArrowLeft size={14} />
                <span>Quay lại danh sách đơn hàng</span>
              </button>
            </div>

            <span className="text-xs text-steel">
              Đang xem tiến trình mã đơn: <strong className="font-mono text-ink-deep">#{order.orderCode}</strong>
            </span>
          </div>

          {/* Card Thông tin chung */}
          <div className="bg-canvas border border-hairline-soft rounded-xxl p-6 sm:p-8 shadow-sticky space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
              <div>
                <span className="text-[11px] text-steel block">Mã đơn hàng:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-lg font-bold text-ink-deep">#{order.orderCode}</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(order.status, order).bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(order.status, order).dot}`} />
                    <span>{getStatusBadge(order.status, order).label}</span>
                  </span>
                </div>
                <span className="text-xs text-steel">Ngày tạo: {order.createdAt.split('T')[0]}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Nút xem biểu mẫu Đơn hàng */}
                <button
                  type="button"
                  onClick={() => setViewFormModal('ORDER')}
                  className="btn-secondary px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                  title="Xem bản in Đơn đặt hàng"
                >
                  <FileText size={13} className="text-primary" />
                  <span>Xem Đơn đặt hàng</span>
                </button>

                {/* Nút xem phiếu xuất kho nếu đã xuất kho */}
                {(order.status === 'SHIPPING' || order.status === 'COMPLETED') && (
                  <button
                    type="button"
                    onClick={() => setViewFormModal('EXPORT')}
                    className="btn-secondary px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                    title="Xem Phiếu xuất kho"
                  >
                    <FileText size={13} className="text-primary" />
                    <span>Xem Phiếu xuất kho</span>
                  </button>
                )}

                {/* Nút Yêu cầu đổi trả trong 7 ngày */}
                {isReturnEligible && (
                  <button
                    onClick={() => setShowReturnModal(true)}
                    className="btn-secondary px-3.5 py-1.5 rounded-full text-xs font-bold text-attention border-attention/30 flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Yêu cầu Đổi trả (7 ngày)</span>
                  </button>
                )}

                {isCancellable && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-3.5 py-1.5 rounded-full border border-critical/30 text-critical hover:bg-critical/10 text-xs font-bold transition-colors"
                  >
                    Hủy đơn hàng
                  </button>
                )}

                <Link
                  to="/"
                  className="btn-marketing px-4 py-1.5 rounded-full text-xs font-bold"
                >
                  Mua thêm
                </Link>
              </div>
            </div>

            {/* Trạng thái đơn hàng */}
            {checkIsReturnOrder(order)? (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
                <RotateCcw size={18} className="text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-purple-950 font-bold">Trạng thái: Trả hàng / Hoàn hàng </strong>
                  <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                    {order.cancelReason || 'Đơn hàng đã được bưu cục hoàn trả về kho bán lẻ hoặc đang có yêu cầu đổi trả bảo hành theo chính sách NextGen Smart Tech.'}
                  </p>
                </div>
              </div>
            ): order.status === 'CANCELLED'? (
              <div className="p-5 bg-rose-50/80 border-2 border-rose-300 rounded-2xl text-xs text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <XCircle size={24} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-black text-rose-900 uppercase tracking-tight">Đơn hàng này đã bị hủy</strong>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-800 border border-rose-300">
                        ĐÃ HỦY & NHẢ TỒN KHO
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      Lý do: <span className="font-semibold">{order.cancelReason || 'Hết hạn thời gian thanh toán qua mã QR (15 phút)'}</span>.
                      <strong className="block text-emerald-800 font-extrabold mt-1">✓ Toàn bộ số lượng sản phẩm giữ chỗ đã được giải phóng và hoàn trả lại tồn kho khả dụng.</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    to="/products"
                    className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold text-center transition shadow-xs whitespace-nowrap"
                  >
                    Tiếp tục mua sắm
                  </Link>
                </div>
              </div>
            ): (
              <div className="py-4">
                <div className="grid grid-cols-5 gap-2 text-center relative">
                  {ORDER_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;

                    return (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-all ${
                          isDone? 'bg-ink-deep text-canvas shadow-xs': isCurrent? 'bg-primary text-canvas ring-4 ring-primary/20 shadow-xs': 'bg-surface-soft text-steel'
                        }`}>
                          {isDone? '✓': idx + 1}
                        </div>
                        <strong className={`text-[11px] block leading-tight ${
                          isCurrent? 'text-primary font-bold': isDone? 'text-ink-deep': 'text-steel'
                        }`}>
                          {step.label}
                        </strong>
                        <span className="text-[10px] text-steel hidden sm:block mt-0.5">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Banner Thông Báo Đã Thanh Toán Thành Công */}
            {order.paymentStatus === 'PAID' && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 text-emerald-950 shadow-xs animate-in zoom-in-95 duration-200">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                    <CheckCircle2 size={28} />
                  </div>
                  <div className="space-y-1 text-center sm:text-left flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">
                        Thanh toán thành công
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ĐÃ THANH TOÁN
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      NextGen đã xác nhận nhận đủ số tiền <strong className="font-mono text-emerald-700 font-extrabold">{formatVND(order.totalAmount)}</strong> qua hình thức {order.paymentMethod === 'COD' ? 'Tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản VietQR'}. Đơn hàng hiện đang được chuyển sang bộ phận kho để chuẩn bị đóng gói và vận chuyển!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* QR Payment Box (Chỉ hiển thị khi đơn đang Chờ thanh toán, Chưa thanh toán và là Chuyển khoản) */}
            {order.status === 'PENDING_PAYMENT' && order.paymentStatus !== 'PAID' && (order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER') && (() => {
              const bankName = paymentIntent?.bankName || 'Vietcombank (Ngoại Thương Việt Nam)';
              const bankAccountNo = paymentIntent?.bankAccountNumber || '0123456789';
              const bankAccountName = paymentIntent?.bankAccountName || 'CÔNG TY NEXTGEN VIỆT NAM';
              const amountToPay = paymentIntent?.amount || order.totalAmount;
              const transferContent = paymentIntent?.transferContent || order.orderCode;
              const qrCodeUrl = paymentIntent?.qrContent 
                ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentIntent.qrContent)}` 
                : `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=BANK|${encodeURIComponent(bankName)}|${bankAccountNo}|${encodeURIComponent(transferContent)}|${amountToPay}`;

              return (
                <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border-2 border-blue-200 rounded-2xl p-5 text-xs space-y-4 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                        <QrCode size={18} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm uppercase">
                          Thanh toán chuyển khoản ngân hàng (VietQR)
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Quét mã QR hoặc chuyển khoản chính xác theo thông tin bên dưới
                        </span>
                      </div>
                    </div>
                    {timeLeft.isExpired ? (
                      <span className="font-mono text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1.5 animate-pulse">
                        <AlertCircle size={13} /> Mã QR đã hết hạn
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1.5 shadow-xs">
                        <Clock size={13} className="text-amber-700 animate-spin" style={{ animationDuration: '4s' }} /> 
                        Thời gian còn lại: <strong className="font-mono text-rose-600 font-black text-sm">{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</strong>
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    {/* Cột Trái: Ảnh Mã QR */}
                    <div className="sm:col-span-5 bg-white p-4 rounded-xl border border-blue-100 text-center shadow-xs flex flex-col items-center">
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 inline-block relative overflow-hidden">
                        <img 
                          src={qrCodeUrl}
                          alt="VietQR Chuyển khoản" 
                          className={`w-40 h-40 object-contain mx-auto transition-all ${timeLeft.isExpired ? 'blur-xs opacity-25' : ''}`}
                        />
                        {timeLeft.isExpired && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-white/85 rounded-xl">
                            <AlertCircle size={26} className="text-rose-600 mb-1" />
                            <span className="text-[11px] font-bold text-rose-700 leading-tight">Mã QR đã hết hạn</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                                if (order) {
                                  (order as any).paymentDeadline = newDeadline;
                                  sharedStore.updateOrderPaymentStatus(order.orderId, order.paymentStatus);
                                  setTimeLeft({ minutes: 15, seconds: 0, isExpired: false });
                                }
                              }}
                              className="mt-2 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow-xs transition"
                            >
                              Gia hạn mã QR
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-blue-700 block mt-2">
                        Quét bằng ứng dụng Ngân hàng (MB, VCB, Techcombank, v.v.)
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Tự động điền đúng số tiền và nội dung đơn hàng
                      </span>
                    </div>

                    {/* Cột Phải: Chi tiết tài khoản nhận & Nút xác nhận */}
                    <div className="sm:col-span-7 space-y-2.5 text-slate-700">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Ngân hàng thụ hưởng:</span>
                          <strong className="text-slate-900 font-bold text-xs">{bankName}</strong>
                        </div>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Số tài khoản:</span>
                          <strong className="font-mono text-sm text-blue-700 font-bold tracking-wider">{bankAccountNo}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(bankAccountNo, 'Số tài khoản')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                        >
                          {copiedField === 'Số tài khoản' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedField === 'Số tài khoản' ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Chủ tài khoản:</span>
                          <strong className="text-slate-900 font-bold text-xs">{bankAccountName}</strong>
                        </div>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Số tiền cần thanh toán:</span>
                          <strong className="text-emerald-700 font-bold text-sm font-mono">{formatVND(amountToPay)}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(String(amountToPay), 'Số tiền')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                        >
                          {copiedField === 'Số tiền' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedField === 'Số tiền' ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      </div>

                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-amber-700 block font-semibold">Nội dung chuyển khoản (bắt buộc):</span>
                          <strong className="font-mono text-slate-900 font-extrabold text-xs">{transferContent}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(transferContent, 'Nội dung CK')}
                          className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 rounded text-[11px] font-bold border border-amber-300 flex items-center gap-1 transition"
                        >
                          {copiedField === 'Nội dung CK' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedField === 'Nội dung CK' ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      </div>

                      {order.paymentStatus === 'PENDING' ? (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2">
                          <CheckCircle size={15} className="text-emerald-600" />
                          <span>Quý khách đã gửi xác nhận chuyển khoản! Đang chờ nhân viên đối soát sao kê.</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isNotifyingPayment}
                          onClick={async () => {
                            setIsNotifyingPayment(true);
                            try {
                              await orderService.customerNotifyPayment(order.orderId, 'Khách hàng xác nhận đã chuyển khoản thành công');
                              await fetchOrder(order.orderCode);
                              showToast("Đã gửi thông báo xác nhận chuyển khoản! Nhân viên sẽ đối soát và kích hoạt đơn.", 'success');
                            } catch (err: any) {
                              showToast(err.message || "Lỗi khi gửi thông báo", 'error');
                            } finally {
                              setIsNotifyingPayment(false);
                            }
                          }}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle size={16} />
                          <span>{isNotifyingPayment ? 'Đang gửi thông báo...' : 'Tôi đã chuyển khoản thành công'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Kết quả xử lý Đổi trả / Hoàn tiền nếu có */}
            {currentReturnState?.returnStatus && (
              <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                currentReturnState.returnStatus === 'REJECTED'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : currentReturnState.returnStatus === 'APPROVED' || order.paymentStatus === 'REFUNDED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-purple-50 border-purple-200 text-purple-800'
              }`}>
                <RotateCcw size={18} className="flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">
                    {currentReturnState.returnStatus === 'REJECTED'
                      ? `Yêu cầu đổi trả thất bại / Đã bị từ chối${currentReturnState.returnId ? ` (RMA-#${currentReturnState.returnId})` : ''}`
                      : currentReturnState.returnStatus === 'APPROVED' || order.paymentStatus === 'REFUNDED'
                        ? `Yêu cầu đổi trả đã được chấp thuận & hoàn tiền${currentReturnState.refundAmount ? ` (${formatVND(currentReturnState.refundAmount)})` : ''}`
                        : currentReturnState.returnStatus === 'INSPECTING'
                          ? 'Kỹ thuật viên đang thẩm định yêu cầu đổi trả của bạn'
                          : 'Yêu cầu đổi trả đang chờ tiếp nhận xử lý'}
                  </div>
                  {currentReturnState.returnStatus === 'REJECTED' && currentReturnState.rejectReason && (
                    <div><strong>Lý do từ chối:</strong> {currentReturnState.rejectReason}</div>
                  )}
                  {currentReturnState.inspectionResult && (
                    <div><strong>Kết quả kiểm tra:</strong> {currentReturnState.inspectionResult}</div>
                  )}
                </div>
              </div>
            )}

            {/* Thông tin người nhận & vận chuyển */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-hairline-soft">
              <div className="space-y-1">
                <span className="font-bold text-ink-deep uppercase tracking-wider block text-[11px]">Thông tin nhận hàng:</span>
                <div>Người nhận: <strong className="text-ink-deep">{order.recipientName}</strong> ({order.recipientPhone})</div>
                <div className="text-steel">Địa chỉ: {order.shippingAddress}</div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-ink-deep uppercase tracking-wider block text-[11px]">Thanh toán & Giao vận:</span>
                <div>Hình thức: <strong className="text-ink-deep">{order.paymentMethod === 'COD'? 'Thanh toán tiền mặt khi nhận hàng (COD)': 'Chuyển khoản VietQR'}</strong></div>
                <div>Trạng thái TT: {order.paymentStatus === 'PAID' ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300 text-xs">
                    <CheckCircle2 size={12} /> Đã thanh toán (Thành công)
                  </span>
                ) : order.paymentStatus === 'PENDING' ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 text-xs">
                    <Clock size={12} /> Đang chờ đối soát (Đã chuyển khoản)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-300 text-xs">
                    <AlertCircle size={12} /> Chưa thanh toán
                  </span>
                )}</div>
                {order.carrier && (
                  <div className="text-steel">Đơn vị giao: {order.carrier} (Mã VĐ: <strong className="font-mono text-ink-deep">{order.trackingCode}</strong>)</div>
                )}
              </div>
            </div>

            {/* Danh sách sản phẩm Snapshot */}
            <div className="pt-4 border-t border-hairline-soft space-y-3">
              <span className="font-bold text-ink-deep uppercase tracking-wider block text-[11px]">Sản phẩm đã đặt mua:</span>
              <div className="divide-y divide-hairline-soft">
                {order.items.map((item) => (
                  <div key={item.orderItemId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <img src={item.imageUrl} alt={item.productNameSnapshot} className="w-12 h-12 object-contain bg-surface-soft rounded-lg border border-hairline-soft p-1" />
                      <div>
                        <h5 className="font-bold text-ink-deep">{item.productNameSnapshot}</h5>
                        <div className="text-[11px] text-steel">
                          {item.colorSnapshot}{item.romSnapshot ? ` - ${item.romSnapshot}` : ''} | SKU: <span className="font-mono">{item.skuSnapshot}</span>
                        </div>
                        <div className="text-[11px] text-steel">Số lượng: x{item.quantity}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                      <div className="font-bold text-ink-deep text-right font-mono">
                        {formatVND(item.unitPrice * item.quantity)}
                      </div>
                      {order.status === 'COMPLETED' && (
                        reviewedOrderItemIds.includes(item.orderItemId) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/30 whitespace-nowrap">
                            <CheckCircle size={12} />
                            <span>Đã đánh giá</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(item, order)}
                            className="btn-secondary py-1 px-3 text-[11px] font-bold rounded-full flex items-center gap-1 shadow-xs hover:border-attention text-attention whitespace-nowrap cursor-pointer hover:bg-attention/10 transition-all"
                          >
                            <Star size={12} className="fill-attention text-attention" />
                            <span>Đánh giá sản phẩm</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total footer */}
              <div className="pt-3 border-t border-hairline-soft text-right text-xs space-y-1 text-charcoal">
                <div>Tạm tính: <strong className="text-ink-deep">{formatVND(order.subtotal)}</strong></div>
                {order.voucherDiscount > 0 && (
                  <div className="text-success">Giảm giá voucher: -{formatVND(order.voucherDiscount)}</div>
                )}
                <div>Phí vận chuyển: <strong className="text-ink-deep">{order.shippingFee === 0? 'Miễn phí': formatVND(order.shippingFee)}</strong></div>
                <div className="text-base font-bold text-ink-deep pt-1.5">
                  Tổng thanh toán: {formatVND(order.totalAmount)}
                </div>
              </div>
            </div>

            {/* Lịch sử trạng thái */}
            <div className="pt-4 border-t border-hairline-soft">
              <span className="font-bold text-ink-deep uppercase tracking-wider block text-[11px] mb-2.5">Nhật ký xử lý đơn hàng (Audit Trail):</span>
              <div className="space-y-2 text-xs">
                {order.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-charcoal">
                    <span className="font-mono text-[11px] text-steel w-36 flex-shrink-0">{h.time}</span>
                    <span className="text-ink font-medium">● {cleanLogNote(h.note)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      ): (
        /* 3. DANH SÁCH ĐƠN HÀNG CỦA TÔI */
        <div className="space-y-6">
          {/* Header & Filter Tabs */}
          <div className="bg-canvas border border-hairline-soft rounded-xxl p-6 sm:p-8 space-y-5 shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline-soft">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-ink-deep flex items-center gap-2">
                  <Package size={22} className="text-primary" />
                  <span>Đơn hàng của tôi</span>
                </h1>
                <p className="text-xs text-steel mt-0.5">
                  Tra cứu tiến trình, lịch sử vận chuyển & quản lý đơn hàng theo thời gian thực
                </p>
              </div>

              <span className="text-xs text-charcoal bg-surface-soft px-3 py-1.5 rounded-full border border-hairline-soft font-medium self-start sm:self-auto">
                {totalCount} đơn hàng
              </span>
            </div>

            {/* Thanh Tra cứu / Tìm kiếm đơn hàng tích hợp */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Tra cứu theo mã đơn (#DH...), số điện thoại người nhận hoặc tên sản phẩm..."
                  className="w-full pl-10 pr-9 py-2.5 bg-surface-soft border border-hairline-soft rounded-full text-xs text-ink placeholder:text-steel/70 focus:outline-none focus:border-ink-deep focus:bg-canvas transition-all"
                />
                {orderSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-steel hover:text-ink text-xs font-bold w-4 h-4 rounded-full bg-hairline-soft/80 flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="bg-ink-button hover:bg-charcoal text-on-ink-button text-xs font-bold px-4 py-2.5 rounded-full transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              >
                Tra cứu
              </button>
            </form>

            {/* Filter Tabs: 7 trạng thái chuẩn có nút điều hướng cuộn và lăn chuột mượt mà */}
            <div className="relative">
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollTabs('left')}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-canvas/95 border border-hairline shadow-md flex items-center justify-center text-charcoal hover:text-ink-deep hover:bg-surface-soft transition-all"
                  title="Cuộn sang trái"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              <div
                ref={tabsRef}
                onScroll={checkScroll}
                onWheel={(e) => {
                  if (tabsRef.current && e.deltaY!== 0) {
                    tabsRef.current.scrollLeft += e.deltaY;
                    checkScroll();
                  }
                }}
                className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-smooth no-scrollbar px-1"
              >
                {FILTER_TABS.map(tab => {
                  const isActive = orderFilterTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={(e) => {
                        setOrderFilterTab(tab.key);
                        e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        setTimeout(checkScroll, 300);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer flex-shrink-0 ${
                        isActive? 'bg-ink-deep text-canvas shadow-xs ring-2 ring-ink-deep/20': 'bg-surface-soft hover:bg-hairline-soft/80 text-charcoal border border-hairline-soft'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        isActive? 'bg-primary text-canvas': 'bg-canvas text-steel border border-hairline-soft/70'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollTabs('right')}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-canvas/95 border border-hairline shadow-md flex items-center justify-center text-charcoal hover:text-ink-deep hover:bg-surface-soft transition-all"
                  title="Cuộn sang phải (Xem trạng thái Đã hủy)"
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Orders Cards List */}
          {filteredOrders.length === 0? (
            <div className="bg-canvas border border-hairline-soft rounded-xxl p-12 text-center text-xs space-y-3">
              <Package size={36} className="text-steel/50 mx-auto" />
              <h4 className="font-bold text-sm text-ink-deep">
                {orderFilterTab === 'ALL' && 'Chưa có đơn hàng nào'}
                {orderFilterTab === 'WAITING_CONFIRMATION' && 'Không có đơn hàng nào đang chờ xác nhận'}
                {orderFilterTab === 'PREPARING' && 'Không có đơn hàng nào đang chờ lấy hàng'}
                {orderFilterTab === 'SHIPPING' && 'Không có đơn hàng nào đang chờ giao hàng'}
                {orderFilterTab === 'COMPLETED' && 'Chưa có đơn hàng nào đã giao hoàn tất'}
                {orderFilterTab === 'RETURNS' && 'Không có đơn hàng nào trong mục trả hàng'}
                {orderFilterTab === 'CANCELLED' && 'Không có đơn hàng nào đã hủy'}
              </h4>
              <p className="text-steel">
                Hãy khám phá các sản phẩm công nghệ chính hãng và mua sắm ngay hôm nay.
              </p>
              <Link to="/" className="btn-marketing inline-block px-5 py-2.5 rounded-full text-xs font-bold shadow-xs">
                Mua sắm thiết bị mới
              </Link>
            </div>
          ): (
            <div className="space-y-4">
              {displayedOrders.map((ord) => {
                const badge = getStatusBadge(ord.status, ord);

                return (
                  <div
                    key={ord.orderId}
                    className="bg-canvas border border-hairline-soft rounded-xxl p-5 sm:p-6 space-y-4 shadow-none hover:shadow-subtle hover:border-hairline transition-all"
                  >
                    {/* Top Row: Order Code, Date, Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline-soft">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-base font-bold text-ink-deep">
                          #{ord.orderCode}
                        </div>
                        <span className="text-[11px] text-steel">
                          {ord.createdAt.replace('T', ' ').slice(0, 16)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Items Mini List */}
                    <div className="space-y-2.5">
                      {ord.items.map((it) => (
                        <div key={it.orderItemId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-surface-soft/40 p-2.5 rounded-xl border border-hairline-soft/50">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img
                              src={it.imageUrl}
                              alt={it.productNameSnapshot}
                              className="w-12 h-12 object-contain rounded-lg bg-canvas p-1 border border-hairline-soft flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <strong className="text-ink-deep block text-xs font-bold line-clamp-1">{it.productNameSnapshot}</strong>
                              <div className="text-[11px] text-steel">
                                Màu: <span>{it.colorSnapshot}</span>{it.romSnapshot ? <> • Dung lượng: <span>{it.romSnapshot}</span></> : null} • SL: <strong>x{it.quantity}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-1 sm:pt-0">
                            <div className="font-bold text-ink-deep text-xs font-mono text-right">
                              {formatVND(it.lineTotal)}
                            </div>
                            {ord.status === 'COMPLETED' && (
                              reviewedOrderItemIds.includes(it.orderItemId) ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/30 whitespace-nowrap">
                                  <CheckCircle size={11} />
                                  <span>Đã đánh giá</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenReviewModal(it, ord);
                                  }}
                                  className="btn-secondary py-1 px-2.5 text-[11px] font-bold rounded-full flex items-center gap-1 shadow-xs text-attention border-attention/30 hover:bg-attention/10 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <Star size={11} className="fill-attention text-attention" />
                                  <span>Đánh giá</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Kết quả Đổi trả trên thẻ đơn hàng */}
                    {(() => {
                      const cardRet = resolveOrderReturnState(ord, returnRequests);
                      if (!cardRet.returnStatus) return null;
                      if (cardRet.returnStatus === 'REJECTED') {
                        return (
                          <div className="text-xs bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-rose-700 flex items-start gap-2">
                            <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                            <div>
                              <strong>Hoàn trả thất bại (Đã từ chối): </strong>
                              <span>{cardRet.rejectReason || 'Sản phẩm không đủ điều kiện đổi trả theo chính sách.'}</span>
                            </div>
                          </div>
                        );
                      }
                      if (cardRet.returnStatus === 'APPROVED' || ord.paymentStatus === 'REFUNDED') {
                        return (
                          <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-700 flex items-start gap-2">
                            <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                            <div>
                              <strong>Đã chấp thuận đổi trả &amp; hoàn tiền</strong>
                              {cardRet.refundAmount ? ` (${formatVND(cardRet.refundAmount)})` : ''}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="text-xs bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-purple-700 flex items-center gap-2">
                          <RotateCcw size={14} className="flex-shrink-0" />
                          <span><strong>Đang xử lý đổi trả</strong> ({cardRet.returnStatus === 'INSPECTING' ? 'Đang giám định' : 'Chờ tiếp nhận'})</span>
                        </div>
                      );
                    })()}

                    {/* Mini Progress Status Note */}
                    {ord.statusHistory && ord.statusHistory.length > 0 && (
                      <div className="text-xs bg-primary/5 border border-primary/15 rounded-xl p-3 flex items-start gap-2.5 text-charcoal">
                        <Clock size={15} className="text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-ink-deep">Tiến trình gần nhất: </span>
                          <span>{cleanLogNote(ord.statusHistory[ord.statusHistory.length - 1].note)}</span>
                          <span className="text-[11px] text-steel ml-1.5">({ord.statusHistory[ord.statusHistory.length - 1].time})</span>
                        </div>
                      </div>
                    )}

                    {/* Bottom Row: Recipient & Detail Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-hairline-soft">
                      <div className="text-xs text-charcoal space-y-0.5">
                        <div>
                          <span className="text-steel">Người nhận: </span>
                          <strong className="text-ink-deep">{ord.recipientName}</strong> ({ord.recipientPhone})
                        </div>
                        <div className="text-[11px] text-steel line-clamp-1">
                          Giao tới: {ord.shippingAddress}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
                        <div className="text-right">
                          <span className="text-[11px] text-steel block">Tổng thanh toán:</span>
                          <span className="font-bold text-base text-ink-deep font-mono">{formatVND(ord.totalAmount)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectOrderFromList(ord)}
                          className="btn-marketing px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer hover:scale-102 transition-transform"
                        >
                          <span>Xem chi tiết tiến trình</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Nút Xem thêm: Ban đầu hiển thị 8 đơn, mỗi lần bấm tăng thêm 4 đơn */}
              <div className="pt-2 flex flex-col items-center justify-center gap-2">
                <div className="text-[11px] text-steel">
                  Đang hiển thị <strong>{displayedOrders.length}</strong> trên tổng số <strong>{filteredOrders.length}</strong> đơn hàng
                </div>
                {visibleCount < filteredOrders.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 4)}
                    className="btn-secondary px-6 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 hover:bg-surface-soft hover:border-ink-deep transition-all shadow-xs cursor-pointer"
                  >
                    <span>Xem thêm đơn hàng</span>
                    <ChevronDown size={14} />
                  </button>
                )}
                {filteredOrders.length > 8 && visibleCount >= filteredOrders.length && (
                  <div className="text-[11px] text-steel font-medium">
                    Đã hiển thị toàn bộ {filteredOrders.length} đơn hàng
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL HỦY ĐƠN */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline-soft rounded-xxl max-w-md w-full p-6 sm:p-8 shadow-sticky space-y-4 text-xs">
            <h3 className="text-base font-medium text-ink-deep">
              Xác nhận hủy đơn hàng #{order?.orderCode}
            </h3>
            <p className="text-steel leading-relaxed">
              Bạn có chắc chắn muốn hủy đơn hàng này không? Sau khi hủy, suất sản phẩm đang được <strong>giữ chỗ trong kho sẽ được giải phóng</strong> và hoàn lại cho khách hàng khác mua.
            </p>

            <div>
              <label className="block font-medium text-charcoal mb-1.5">Lý do hủy đơn:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              >
                <option value="Đổi ý không có nhu cầu mua nữa">Đổi ý không có nhu cầu mua nữa</option>
                <option value="Muốn đổi màu sắc hoặc phiên bản bộ nhớ khác">Muốn đổi màu sắc hoặc phiên bản bộ nhớ khác</option>
                <option value="Thời gian giao hàng không phù hợp">Thời gian giao hàng không phù hợp</option>
                <option value="Tìm thấy mức giá tốt hơn ở nơi khác">Tìm thấy mức giá tốt hơn ở nơi khác</option>
              </select>
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t border-hairline-soft">
              <button
                onClick={() => setShowCancelModal(false)}
                className="btn-secondary px-4 py-2 text-xs font-bold rounded-full"
              >
                Không, giữ lại đơn
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-5 py-2 bg-critical hover:bg-critical/90 text-canvas text-xs font-bold rounded-full shadow-xs transition"
              >
                Xác nhận hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL YÊU CẦU ĐỔI TRẢ TRONG 7 NGÀY */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline-soft rounded-xxl max-w-md w-full p-6 sm:p-8 shadow-sticky space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
              <RotateCcw className="text-attention" size={18} />
              <h3 className="text-base font-medium text-ink-deep">
                Yêu cầu Đổi trả đơn #{order?.orderCode}
              </h3>
            </div>
            
            <p className="text-steel leading-relaxed">
              Theo chính sách bảo hành NextGen Smart Tech, bạn được quyền đổi trả máy trong vòng <strong>7 ngày</strong> kể từ khi nhận hàng. Thiết bị gửi về kho sẽ được nhân viên thẩm định tình trạng seal và ngoại quan trước khi hoàn tiền hoặc đổi mới.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block font-medium text-charcoal mb-1.5">Lý do yêu cầu đổi trả:</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                >
                  <option value="Lỗi phần cứng từ nhà sản xuất (yêu cầu đổi 1-1)">Lỗi phần cứng từ nhà sản xuất (yêu cầu đổi 1-1)</option>
                  <option value="Hàng giao không đúng mẫu mã / màu sắc đã đặt">Hàng giao không đúng mẫu mã / màu sắc đã đặt</option>
                  <option value="Hộp máy có dấu hiệu bị móp méo / rách seal khi nhận">Hộp máy có dấu hiệu bị móp méo / rách seal khi nhận</option>
                  <option value="Đổi ý không còn nhu cầu sử dụng (yêu cầu hoàn tiền)">Đổi ý không còn nhu cầu sử dụng (yêu cầu hoàn tiền)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-charcoal mb-1.5">Mô tả chi tiết tình trạng máy:</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả cụ thể hiện tượng lỗi, tình trạng nguyên seal hoặc phụ kiện đi kèm..."
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  className="w-full p-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                />
              </div>

              {(order?.paymentMethod || 'COD').toUpperCase() === 'COD' && (
                <div className="space-y-2.5 pt-2 border-t border-hairline-soft">
                  <label className="block font-semibold text-ink-deep">
                    Tài khoản ngân hàng nhận tiền hoàn (bắt buộc cho đơn COD):
                  </label>
                  <div>
                    <label className="block font-medium text-charcoal mb-1">Tên ngân hàng:</label>
                    <input
                      type="text"
                      placeholder="VD: Vietcombank, MBBank, Techcombank..."
                      value={returnBankName}
                      onChange={(e) => setReturnBankName(e.target.value)}
                      className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-medium text-charcoal mb-1">Số tài khoản:</label>
                      <input
                        type="text"
                        placeholder="Nhập số tài khoản..."
                        value={returnAccountNumber}
                        onChange={(e) => setReturnAccountNumber(e.target.value)}
                        className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink font-mono text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-charcoal mb-1">Chủ tài khoản:</label>
                      <input
                        type="text"
                        placeholder="VD: NGUYEN THE MINH"
                        value={returnAccountHolder}
                        onChange={(e) => setReturnAccountHolder(e.target.value)}
                        className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t border-hairline-soft">
              <button
                onClick={() => setShowReturnModal(false)}
                className="btn-secondary px-4 py-2 text-xs font-bold rounded-full"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReturn}
                className="btn-marketing px-5 py-2 text-xs font-bold rounded-full"
              >
                Gửi yêu cầu đổi trả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM BIỂU MẪU SỐ HÓA  */}
      {viewFormModal && order && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline-soft rounded-xxl max-w-2xl w-full p-6 sm:p-8 shadow-sticky space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <div className="flex items-center gap-2">
                <FileText className="text-primary" size={18} />
                <h3 className="text-sm font-bold text-ink-deep uppercase tracking-wider">
                  Biểu mẫu: {
                    viewFormModal === 'ORDER' ? 'ĐƠN ĐẶT HÀNG' : viewFormModal === 'CONFIRM' ? 'PHIẾU XÁC NHẬN ĐƠN HÀNG' : viewFormModal === 'EXPORT' ? 'PHIẾU XUẤT KHO' : 'PHIẾU NHẬP LẠI/HOÀN KHO'
                  }
                </h3>
              </div>
              <button
                onClick={() => setViewFormModal(null)}
                className="text-steel hover:text-ink p-1 rounded-full text-xs font-bold"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Khung mô phỏng biểu mẫu văn bản hành chính theo DOCX */}
            <div className="p-6 bg-surface-soft border border-hairline-soft rounded-xl space-y-4 text-charcoal">
              <div className="flex justify-between items-start text-[11px] pb-3 border-b border-hairline-soft">
                <div>
                  <div className="font-bold text-ink-deep uppercase">CÔNG TY TNHH NEXTGEN SMART TECH RETAIL</div>
                  <div>Hệ thống bán lẻ thiết bị di động chính hãng</div>
                  <div>Hotline: 1800.6018 • Email: support@nextgen.vn</div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-ink-deep">Biểu mẫu điện tử</div>
                  <div>Ngày lập: {order.createdAt.split('T')[0]}</div>
                  <div>Phiên bản: 1.0 (Số hóa)</div>
                </div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-base font-bold text-ink-deep uppercase tracking-wider">
                  {viewFormModal === 'ORDER' && 'ĐƠN ĐẶT HÀNG TRỰC TUYẾN'}
                  {viewFormModal === 'CONFIRM' && 'PHIẾU XÁC NHẬN ĐƠN HÀNG'}
                  {viewFormModal === 'EXPORT' && 'PHIẾU XUẤT KHO BÁN HÀNG'}
                  {viewFormModal === 'RETURN' && 'PHIẾU NHẬP LẠI / HOÀN KHO'}
                </h2>
                <span className="font-mono text-xs text-steel">Số phiếu: #{order.orderCode}</span>
              </div>

              {/* Thông tin đối tượng */}
              <div className="text-[11px] space-y-1 bg-canvas p-3.5 rounded-lg border border-hairline-soft">
                <div>Khách hàng: <strong className="text-ink-deep">{order.recipientName}</strong> • SĐT: <strong className="text-ink-deep">{order.recipientPhone}</strong></div>
                <div>Địa chỉ giao nhận: {order.shippingAddress}</div>
                <div>Hình thức thanh toán: {order.paymentMethod === 'COD'? 'Tiền mặt khi nhận (COD)': 'Chuyển khoản VietQR'}</div>
                {order.carrier && <div>Đơn vị vận chuyển: {order.carrier} (Vận đơn: {order.trackingCode})</div>}
              </div>

              {/* Bảng danh sách sản phẩm */}
              <table className="w-full text-left text-[11px] border border-hairline-soft border-collapse bg-canvas rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-surface-soft border-b border-hairline-soft text-ink-deep font-bold">
                    <th className="p-2.5 border-r border-hairline-soft">STT</th>
                    <th className="p-2.5 border-r border-hairline-soft">Mã SKU</th>
                    <th className="p-2.5 border-r border-hairline-soft">Tên sản phẩm & Biến thể</th>
                    <th className="p-2.5 border-r border-hairline-soft text-center">SL</th>
                    <th className="p-2.5 border-r border-hairline-soft text-right">Đơn giá</th>
                    <th className="p-2.5 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {order.items.map((it, idx) => (
                    <tr key={it.orderItemId}>
                      <td className="p-2.5 border-r border-hairline-soft text-center">{idx + 1}</td>
                      <td className="p-2.5 border-r border-hairline-soft font-mono text-steel">{it.skuSnapshot}</td>
                      <td className="p-2.5 border-r border-hairline-soft">
                        {it.productNameSnapshot} ({it.colorSnapshot} - {it.romSnapshot})
                      </td>
                      <td className="p-2.5 border-r border-hairline-soft text-center">{it.quantity}</td>
                      <td className="p-2.5 border-r border-hairline-soft text-right">{formatVND(it.unitPrice)}</td>
                      <td className="p-2.5 text-right font-medium text-ink-deep">{formatVND(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tổng cộng */}
              <div className="text-right text-[11px] space-y-1">
                <div>Tổng tiền hàng: <strong className="text-ink-deep">{formatVND(order.subtotal)}</strong></div>
                {order.voucherDiscount > 0 && <div className="text-success">Giảm giá voucher: -{formatVND(order.voucherDiscount)}</div>}
                <div>Phí vận chuyển: <strong className="text-ink-deep">{order.shippingFee === 0? '0 ₫ (Miễn phí)': formatVND(order.shippingFee)}</strong></div>
                <div className="text-xs font-bold text-ink-deep pt-1.5">
                  TỔNG THANH TOÁN: {formatVND(order.totalAmount)}
                </div>
              </div>

              {/* Chữ ký số hóa */}
              <div className="grid grid-cols-2 gap-4 text-center text-[10px] pt-4 border-t border-hairline-soft">
                <div>
                  <div className="font-bold text-ink-deep uppercase">NGƯỜI LẬP PHIẾU</div>
                  <div className="text-steel italic pt-6">(Hệ thống số hóa tự động)</div>
                </div>
                <div>
                  <div className="font-bold text-ink-deep uppercase">NGƯỜI PHÊ DUYỆT</div>
                  <div className="text-steel italic pt-6">(Nguyễn Thanh Hùng - Ký duyệt)</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>In biểu mẫu</span>
              </button>
              <button
                type="button"
                onClick={() => setViewFormModal(null)}
                className="btn-marketing px-5 py-2 text-xs font-bold rounded-full"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL ĐÁNH GIÁ SẢN PHẨM SAU KHI GIAO HÀNG THÀNH CÔNG */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReview}
            className="bg-canvas border border-hairline-soft rounded-xxl max-w-lg w-full p-6 sm:p-8 shadow-sticky space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <div>
                <h3 className="text-base font-bold text-ink-deep flex items-center gap-2">
                  <Star className="text-attention fill-attention" size={18} />
                  <span>Đánh giá sản phẩm</span>
                </h3>
                <div className="text-xs text-steel line-clamp-1 mt-0.5">
                  Đơn hàng #{reviewModalItem.orderCode} • {reviewModalItem.productName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalItem(null)}
                className="text-steel hover:text-ink-deep p-1 rounded-full text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {reviewMessage && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                reviewMessage.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-critical/10 border-critical/30 text-critical'
              }`}>
                {reviewMessage.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                <span>{reviewMessage.text}</span>
              </div>
            )}

            {/* Star Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-charcoal block">Mức độ hài lòng của bạn:</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      size={24}
                      className={star <= reviewRating ? 'fill-attention text-attention' : 'text-hairline'}
                    />
                  </button>
                ))}
                <span className="ml-2 font-bold text-ink-deep text-xs">
                  {reviewRating === 5 && 'Tuyệt vời (5 sao)'}
                  {reviewRating === 4 && 'Rất tốt (4 sao)'}
                  {reviewRating === 3 && 'Bình thường (3 sao)'}
                  {reviewRating === 2 && 'Chưa hài lòng (2 sao)'}
                  {reviewRating === 1 && 'Kém (1 sao)'}
                </span>
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="font-bold text-charcoal block">Nhận xét chi tiết về sản phẩm:</label>
              <textarea
                required
                rows={4}
                placeholder="Chia sẻ trải nghiệm sử dụng thực tế (chất lượng màn hình, thời lượng pin, độ mượt khi sử dụng, camera)..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full p-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            {/* Upload real photos */}
            <div className="space-y-1.5">
              <label className="font-bold text-charcoal block">Hình ảnh thực tế (tối đa 5 ảnh):</label>
              <ReviewImageUploader
                images={reviewImages}
                onChange={setReviewImages}
                maxImages={5}
                maxSizeMB={5}
                disabled={isSubmittingReview}
              />
            </div>

            <div className="text-[11px] text-steel bg-surface-soft p-2.5 rounded-lg border border-hairline-soft">
              Đánh giá của bạn sẽ được gắn nhãn <strong className="text-primary font-bold">"Đã mua hàng chính hãng"</strong> và xác thực trên hệ thống bán lẻ.
            </div>

            {/* Biểu mẫu cuộn được: lặp lại thông báo ngay sát nút Gửi để lỗi (vd: tải ảnh thất bại) không bị khuất ở đầu form */}
            {reviewMessage?.type === 'error' && (
              <div role="alert" className="p-3 rounded-xl border flex items-start gap-2 bg-critical/10 border-critical/30 text-critical">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{reviewMessage.text}</span>
              </div>
            )}
            {isSubmittingReview && reviewImages.length > 0 && (
              <div className="text-[11px] text-steel">Đang tải {reviewImages.length} ảnh lên và gửi đánh giá, vui lòng chờ...</div>
            )}

            <div className="flex gap-2.5 justify-end pt-3 border-t border-hairline-soft">
              <button
                type="button"
                onClick={() => setReviewModalItem(null)}
                className="btn-ghost px-4 py-2 text-xs font-bold"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSubmittingReview}
                className="btn-marketing px-6 py-2 text-xs font-bold rounded-full disabled:opacity-50"
              >
                {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
