import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { sharedStore, cleanLogNote } from '../../services/sharedStore';
import { inventoryService } from '../../services/inventoryService';
import { orderService } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';
import { returnService } from '../../services/returnService';
import { OrderDetail, OrderStatus, OrderItemSnapshot } from '../../types/order';
import { PortalShipment, PortalReturnRequest } from '../../types/portal';
import { formatVND } from '../../components/common/PriceDisplay';
import { PortalPagination } from '../../components/portal/PortalPagination';
import { 
  Package, 
  Search, 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertCircle, 
  XCircle, 
  FileText, 
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  Filter,
  Printer,
  Sparkles,
  Calendar,
  X,
  CreditCard,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Boxes,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

// PIPELINE TRẠNG THÁI CHUẨN THƯƠNG MẠI ĐIỆN TỬ NEXTGEN SMART TECH
const STATUS_PIPELINE: { key: OrderStatus; label: string; badgeClass: string; desc: string }[] = [
  { 
    key: 'PENDING_PAYMENT', 
    label: 'Chờ thanh toán', 
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Chờ khách quét mã QR thanh toán (Khóa giữ chỗ tồn kho 30 phút)'
  },
  { 
    key: 'WAITING_CONFIRMATION', 
    label: 'Chờ xác nhận', 
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Đơn COD mới tạo, chờ điện thoại thoại xác minh và duyệt đơn'
  },
  { 
    key: 'CONFIRMED', 
    label: 'Đã xác nhận', 
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    desc: 'Đã duyệt xác nhận đơn, chuyển lệnh đóng gói cho thủ kho'
  },
  { 
    key: 'PREPARING', 
    label: 'Đang chuẩn bị hàng', 
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'Kho đang chuẩn bị hàng, đóng gói và đã đẩy sang bảng Vận đơn'
  },
  { 
    key: 'PICKED_UP', 
    label: 'Đã lấy hàng', 
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Bưu tá đã lấy hàng từ kho thành công'
  },
  { 
    key: 'SHIPPING', 
    label: 'Đang giao hàng', 
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    desc: 'Bưu tá đang giao kiện hàng tới địa chỉ người nhận'
  },
  { 
    key: 'COMPLETED', 
    label: 'Hoàn tất (Chốt DT)', 
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Giao hàng thành công, thu đủ tiền COD, chính thức ghi nhận doanh thu thuần'
  },
  { 
    key: 'CANCELLED', 
    label: 'Đã hủy', 
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Đơn bị hủy bởi khách hoặc giao thất bại lập phiếu hoàn kho'
  }
];

// Helper hiển thị trạng thái thanh toán
const PAYMENT_STATUS_MAP: Record<string, { label: string; badgeClass: string }> = {
  PAID: { label: 'Đã thanh toán', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING: { label: 'Đã báo CK (Chờ duyệt)', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold' },
  UNPAID: { label: 'Chưa thanh toán', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  REFUNDED: { label: 'Đã hoàn tiền', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' }
};

// Helper hiển thị trạng thái vận chuyển
const SHIPMENT_STATUS_MAP: Record<string, { label: string; badgeClass: string; desc: string }> = {
  NONE: { 
    label: 'Chưa đẩy vận đơn', 
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    desc: 'Đơn hàng đang xử lý, chưa đẩy sang Bảng Vận đơn'
  },
  PREPARING: { 
    label: 'Đang chuẩn bị hàng', 
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-300',
    desc: 'Đã đẩy sang vận đơn, kho đang chuẩn bị đóng gói'
  },
  WAITING_PICKUP: { 
    label: 'Đang chuẩn bị hàng', 
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-300',
    desc: 'Đang chuẩn bị hàng'
  },
  PENDING: { 
    label: 'Đang chuẩn bị hàng', 
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-300',
    desc: 'Đang chuẩn bị hàng'
  },
  PICKED_UP: { 
    label: 'Đã lấy hàng', 
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-300',
    desc: 'Bưu tá đã lấy hàng từ kho vật lý thành công'
  },
  IN_TRANSIT: { 
    label: 'Đang giao hàng', 
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    desc: 'Kiện hàng đang trên đường giao tới người nhận'
  },
  DELIVERED: { 
    label: 'Giao thành công', 
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    desc: 'Khách hàng đã nhận thiết bị thành công'
  },
  DELIVERY_FAILED: { 
    label: 'Giao thất bại', 
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
    desc: 'Bưu tá giao hàng không thành công'
  },
  PICKUP_FAILED: { 
    label: 'Giao thất bại', 
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
    desc: 'Lấy hàng không thành công'
  },
  FAILED: { 
    label: 'Giao thất bại', 
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
    desc: 'Giao hàng không thành công'
  }
};

export const PortalOrdersView: React.FC = () => {
  // 1. DATA STATE
  const [orders, setOrders] = useState<OrderDetail[]>(sharedStore.getOrders());
  const [shipments, setShipments] = useState<PortalShipment[]>(sharedStore.getShipments());
  const [returnRequests, setReturnRequests] = useState<PortalReturnRequest[]>(sharedStore.getReturnRequests());

  // 2. FILTER & SEARCH STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // 3. PAGINATION STATE
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // 4. BULK ACTIONS SELECTION
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null);

  // 5. MODALS & DRAWERS
  const [viewDetailModal, setViewDetailModal] = useState<OrderDetail | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'OVERVIEW' | 'ITEMS' | 'LOGS' | 'SHIPMENT' | 'RETURNS'>('OVERVIEW');

  // Cancel confirmation dialog
  const [cancelModal, setCancelModal] = useState<OrderDetail | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Khách hàng thay đổi nhu cầu mua sắm');
  const [customCancelReason, setCustomCancelReason] = useState<string>('');

  // Restock Modal
  const [mb04Modal, setMb04Modal] = useState<OrderDetail | null>(null);
  const [mb04Reason, setMb04Reason] = useState('Khách hàng từ chối nhận (Đổi ý, không lấy máy)');
  const [mb04SealCondition, setMb04SealCondition] = useState<'INTACT' | 'DAMAGED'>('INTACT');

  // Digital Form Modal Biểu mẫu điện tử
  const [viewFormModal, setViewFormModal] = useState<{ type: 'ORDER' | 'CONFIRM' | 'EXPORT' | 'RETURN'; order: OrderDetail } | null>(null);



  // API 8.5: Tải danh sách đơn hàng quản trị & Pipeline Funnel
  const loadAdminOrders = useCallback(async () => {
    try {
      const res = await orderService.getAdminOrders({
        page: 1,
        size: 100,
        status: 'ALL',
        paymentStatus: 'ALL',
      });
      if (res?.content && res.content.length > 0) {
        setOrders(res.content);
        sharedStore.syncExternalOrders(res.content);
      }
    } catch (err) {
      console.warn('[PortalOrdersView] loadAdminOrders error', err);
    }
  }, []);

  useEffect(() => {
    loadAdminOrders();
  }, [loadAdminOrders]);

  // Subscribe changes from shared store
  useEffect(() => {
    const unsubscribe = sharedStore.subscribe(() => {
      setOrders([...sharedStore.getOrders()]);
      setShipments([...sharedStore.getShipments()]);
      setReturnRequests([...sharedStore.getReturnRequests()]);
    });
    return () => unsubscribe();
  }, []);

  // Sync selected order in modal if updated
  useEffect(() => {
    if (viewDetailModal) {
      const refreshed = orders.find(o => o.orderId === viewDetailModal.orderId);
      if (refreshed) {
        setViewDetailModal(refreshed);
      }
    }
  }, [orders]);

  // Helper tìm thông tin vận chuyển tương ứng cho đơn
  const getShipmentForOrder = (order: OrderDetail): PortalShipment | undefined => {
    return shipments.find(s => 
      s.orderCode === order.orderCode || 
      Number(s.orderId) === Number(order.orderId) ||
      (order.trackingCode && s.trackingCode === order.trackingCode)
    );
  };

  // Helper tính trạng thái đơn hàng hiệu lực (kết hợp đồng bộ tiến trình vận đơn)
  const getEffectiveOrderStatus = (order: OrderDetail): OrderStatus => {
    const sh = getShipmentForOrder(order);
    if (sh?.status === 'PICKED_UP' && order.status !== 'SHIPPING' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
      return 'PICKED_UP';
    }
    if (sh?.status === 'IN_TRANSIT' && (order.status === 'PREPARING' || order.status === 'PICKED_UP' || order.status === 'CONFIRMED')) {
      return 'SHIPPING';
    }
    if (sh?.status === 'DELIVERED' && order.status !== 'CANCELLED') {
      return 'COMPLETED';
    }
    return order.status;
  };

  // Helper tìm yêu cầu đổi trả tương ứng cho đơn
  const getReturnRequestForOrder = (order: OrderDetail): PortalReturnRequest | undefined => {
    return returnRequests.find(r => r.orderId === order.orderId || r.orderCode === order.orderCode);
  };

  // Helper tính trạng thái giao vận hiển thị của đơn theo đúng quy tắc nghiệp vụ
  const resolveShipmentStatus = (order: OrderDetail): string => {
    // 1. Kiểm tra bản ghi vận đơn tương ứng
    const sh = getShipmentForOrder(order);
    if (sh) return sh.status;

    // 2. Quy tắc nghiệp vụ: Khi đơn chưa chuẩn bị hàng thì chưa đẩy sang vận đơn
    if (order.status === 'WAITING_CONFIRMATION' || order.status === 'PENDING_PAYMENT' || order.status === 'CONFIRMED') {
      return 'NONE';
    }

    // 3. Fallback đồng bộ trạng thái
    if (order.status === 'PREPARING') return 'PREPARING';
    if (order.status === 'PICKED_UP') return 'PICKED_UP';
    if (order.status === 'SHIPPING') return 'IN_TRANSIT';
    if (order.status === 'COMPLETED') return 'DELIVERED';
    if (order.status === 'CANCELLED') return 'DELIVERY_FAILED';
    return 'NONE';
  };

  // KPI Metrics tính toán động từ dữ liệu thực tế (Không hardcode)
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const waitingConfirmation = orders.filter(o => getEffectiveOrderStatus(o) === 'WAITING_CONFIRMATION').length;
    const inProcess = orders.filter(o => {
      const s = getEffectiveOrderStatus(o);
      return s === 'PREPARING' || s === 'PICKED_UP' || s === 'SHIPPING';
    }).length;
    const completed = orders.filter(o => getEffectiveOrderStatus(o) === 'COMPLETED').length;
    const cancelled = orders.filter(o => getEffectiveOrderStatus(o) === 'CANCELLED').length;
    const totalRevenue = orders.filter(o => getEffectiveOrderStatus(o) === 'COMPLETED').reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      totalCount,
      waitingConfirmation,
      inProcess,
      completed,
      cancelled,
      totalRevenue
    };
  }, [orders]);

  // Bộ lọc dữ liệu đơn hàng
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Tìm kiếm theo mã đơn, người nhận, số điện thoại
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const matchCode = order.orderCode.toLowerCase().includes(q);
        const matchName = order.recipientName.toLowerCase().includes(q);
        const matchPhone = order.recipientPhone.toLowerCase().includes(q);
        if (!matchCode &&!matchName &&!matchPhone) return false;
      }

      // 2. Lọc trạng thái đơn hàng
      const effectiveStatus = getEffectiveOrderStatus(order);
      if (selectedStatus !== 'ALL' && effectiveStatus !== selectedStatus) {
        return false;
      }

      // 3. Lọc trạng thái thanh toán
      if (selectedPaymentStatus!== 'ALL' && order.paymentStatus!== selectedPaymentStatus) {
        return false;
      }

      // 4. Lọc theo khoảng ngày đặt hàng
      if (dateFrom) {
        const orderDateStr = order.createdAt.slice(0, 10);
        if (orderDateStr < dateFrom) return false;
      }
      if (dateTo) {
        const orderDateStr = order.createdAt.slice(0, 10);
        if (orderDateStr > dateTo) return false;
      }

      return true;
    });
  }, [orders, shipments, searchTerm, selectedStatus, selectedPaymentStatus, dateFrom, dateTo]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedPaymentStatus, dateFrom, dateTo, pageSize]);

  // Phân trang
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('ALL');
    setSelectedPaymentStatus('ALL');
    setDateFrom('');
    setDateTo('');
  };

  // Chọn / Bỏ chọn dòng
  const handleToggleSelectRow = (orderId: number) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId)? prev.filter(id => id!== orderId): [...prev, orderId]
    );
  };

  // Chọn tất cả các đơn trong trang hiện tại
  const isAllCurrentSelected = paginatedOrders.length > 0 && paginatedOrders.every(o => selectedOrderIds.includes(o.orderId));
  const isIndeterminate = paginatedOrders.some(o => selectedOrderIds.includes(o.orderId)) &&!isAllCurrentSelected;

  const handleToggleSelectAllCurrent = () => {
    if (isAllCurrentSelected) {
      const currentIds = paginatedOrders.map(o => o.orderId);
      setSelectedOrderIds(prev => prev.filter(id =>!currentIds.includes(id)));
    } else {
      const currentIds = paginatedOrders.map(o => o.orderId);
      setSelectedOrderIds(prev => Array.from(new Set([...prev,...currentIds])));
    }
  };

  // Chuyển đổi trạng thái đơn lẻ
  const handleTransition = async (orderId: number, nextStatus: OrderStatus) => {
    try {
      let apiSuccess = false;
      let apiMsg = '';

      // API 8.6: POST /api/v1/admin/orders/{id}/confirm
      if (nextStatus === 'CONFIRMED') {
        const res = await orderService.confirmOrder(orderId, { carrier: 'Giao Hàng Nhanh (GHN)', note: 'Duyệt xác nhận đơn hàng MB02' });
        apiSuccess = res.success;
        apiMsg = res.message;
      }
      // API 8.7: POST /api/v1/admin/orders/{id}/pack-export
      else if (nextStatus === 'SHIPPING') {
        const res = await orderService.packExportOrder(orderId, { packageWeightGrams: 650, exportNote: 'Đã dán niêm phong bảo hành và bọc bóng khí 4 lớp', assignedShipper: 'Tài xế GHN' });
        apiSuccess = res?.success ?? true;
      }

      const res = sharedStore.transitionOrderStatus(orderId, nextStatus, {
        performedBy: 'Nguyễn Thanh Hùng (Staff)'
      });

      if (res.success || apiSuccess) {
        setBulkActionFeedback(`✓ ${apiMsg || `Đã chuyển đơn hàng sang trạng thái ${nextStatus}!`}`);
        setTimeout(() => setBulkActionFeedback(null), 4000);
        setOrders([...sharedStore.getOrders()]);
        setShipments([...sharedStore.getShipments()]);
        await loadAdminOrders();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      console.error('[handleTransition] error', err);
      alert(err.message || 'Lỗi khi cập nhật trạng thái đơn hàng.');
    }
  };

  // Xác nhận đã nhận tiền chuyển khoản (API: POST /api/v1/admin/orders/{id}/confirm-payment)
  const handleAdminConfirmPayment = async (order: OrderDetail) => {
    try {
      const res = await orderService.adminConfirmPayment(
        order.orderId,
        `Admin xác nhận đã nhận đủ tiền chuyển khoản cho đơn hàng #${order.orderCode}`
      );
      if (!res || !res.success) {
        alert(res?.message || `Không thể xác nhận thanh toán đơn #${order.orderCode}.`);
        return;
      }

      setOrders(prev => prev.map(o => o.orderId === order.orderId ? {
        ...o,
        paymentStatus: 'PAID',
        status: o.status === 'PENDING_PAYMENT' ? 'WAITING_CONFIRMATION' : o.status
      } : o));

      if (viewDetailModal && viewDetailModal.orderId === order.orderId) {
        setViewDetailModal((prev: any) => prev ? {
          ...prev,
          paymentStatus: 'PAID',
          status: prev.status === 'PENDING_PAYMENT' ? 'WAITING_CONFIRMATION' : prev.status
        } : null);
      }

      sharedStore.updateOrderPaymentStatus(
        order.orderId,
        'PAID',
        `Admin xác nhận đã nhận đủ tiền chuyển khoản cho đơn hàng #${order.orderCode}. Chuyển sang Chờ xác nhận.`
      );
      setBulkActionFeedback(`✓ ${res.message || `Đã xác nhận thanh toán đơn #${order.orderCode} thành công!`}`);
      setTimeout(() => setBulkActionFeedback(null), 4000);
      loadAdminOrders();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || `Lỗi khi xác nhận thanh toán đơn #${order.orderCode}.`);
    }
  };

  // Xác nhận hủy đơn hàng an toàn (API 8.4: POST /api/v1/orders/{orderCode}/cancel)
  const handleConfirmCancelOrder = async () => {
    if (!cancelModal) return;
    const finalReason = customCancelReason.trim()? customCancelReason.trim(): cancelReason;

    const ok =
      (await orderService.cancelOrder(cancelModal.orderCode, finalReason, 'Quản trị viên (Admin)')) ||
      sharedStore.cancelOrder(cancelModal.orderId, finalReason, 'Quản trị viên (Admin)');
    if (ok) {
      setBulkActionFeedback(`✓ Đã hủy đơn hàng #${cancelModal.orderCode} và giải phóng tồn kho thành công!`);
      setTimeout(() => setBulkActionFeedback(null), 3500);
      loadAdminOrders();
    } else {
      alert('Không thể hủy đơn hàng này do trạng thái hiện tại không hợp lệ (Chỉ cho phép hủy khi đang Chờ thanh toán hoặc Chờ xác nhận).');
    }
    setCancelModal(null);
    setCustomCancelReason('');
  };

  // Ký duyệt hoàn kho
  const handleConfirmMb04 = async () => {
    if (!mb04Modal) return;
    const isRestock = mb04SealCondition === 'INTACT';
    const returnId = (mb04Modal as any).returnId;
    if (!returnId) {
      alert('Đơn hàng chưa có yêu cầu đổi trả (returnId) trên hệ thống để lập phiếu hoàn kho MB04.');
      return;
    }
    try {
      await returnService.inspectReturn(returnId, {
        status: isRestock ? 'APPROVED' : 'REJECTED',
        inspectionResult: mb04Reason || (isRestock ? 'Máy nguyên seal, đủ điều kiện nhập kho bán lẻ' : 'Rách seal / hư hỏng hộp'),
        refundAmount: isRestock ? Number(mb04Modal.totalAmount || 0) : 0,
        restockItems: isRestock
          ? (mb04Modal.items || [])
              .filter(i => i.variantId)
              .map(i => ({ variantId: Number(i.variantId), quantity: Number(i.quantity || 1) }))
          : undefined,
        rejectReason: isRestock ? undefined : (mb04Reason || 'Rách seal / hư hỏng hộp'),
      });
      setBulkActionFeedback(`✓ Đã lập phiếu hoàn kho và ${isRestock ? 'nhập lại tồn kho bán lẻ' : 'từ chối nhập kho'} thành công!`);
      setTimeout(() => setBulkActionFeedback(null), 4000);
      loadAdminOrders();
      setMb04Modal(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi khi ký duyệt hoàn kho MB04.');
    }
  };

  // Duyệt hàng loạt theo trạng thái đích
  const handleBulkApprove = (targetStatus: OrderStatus, actionName: string) => {
    if (selectedOrderIds.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    selectedOrderIds.forEach(orderId => {
      const order = orders.find(o => o.orderId === orderId);
      if (!order) return;

      if (targetStatus === 'CONFIRMED' && (order.status === 'WAITING_CONFIRMATION' || order.status === 'PENDING_PAYMENT')) {
        orderService.confirmOrder(orderId, { carrier: order.carrier || 'Giao Hàng Nhanh (GHN)', note: 'Duyệt xác nhận đơn hàng MB02' });
      } else if (targetStatus === 'SHIPPING' && (order.status === 'PREPARING' || order.status === 'PICKED_UP')) {
        orderService.packExportOrder(orderId, { packageWeightGrams: 650, exportNote: 'Đã dán niêm phong bảo hành và bọc bóng khí 4 lớp', assignedShipper: 'Tài xế GHN' });
      }

      const res = sharedStore.transitionOrderStatus(orderId, targetStatus, {
        performedBy: 'Nguyễn Thanh Hùng (Staff)'
      });

      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    if (successCount > 0) {
      setBulkActionFeedback(`✓ Đã ${actionName} thành công cho ${successCount} đơn hàng!${failCount > 0? ` (${failCount} đơn không đủ điều kiện chuyển bước)`: ''}`);
      setTimeout(() => setBulkActionFeedback(null), 4000);
      setSelectedOrderIds([]);
      loadAdminOrders();
    } else {
      alert(`Không thể thực hiện cho các đơn đã chọn vì không phù hợp với quy trình tuần tự nghiêm ngặt.`);
    }
  };

  // Duyệt tự động bước tiếp theo cho toàn bộ đơn được chọn
  const handleBulkStepForward = () => {
    if (selectedOrderIds.length === 0) return;

    let processedCount = 0;
    selectedOrderIds.forEach(orderId => {
      const order = orders.find(o => o.orderId === orderId);
      if (!order) return;

      let nextStatus: OrderStatus | null = null;
      if (order.status === 'WAITING_CONFIRMATION') nextStatus = 'CONFIRMED';
      else if (order.status === 'CONFIRMED') nextStatus = 'PREPARING';
      else if (order.status === 'PREPARING') nextStatus = 'SHIPPING';
      else if (order.status === 'SHIPPING') nextStatus = 'COMPLETED';

      if (nextStatus) {
        if (nextStatus === 'CONFIRMED') {
          orderService.confirmOrder(orderId, { carrier: order.carrier || 'Giao Hàng Nhanh (GHN)', note: 'Duyệt xác nhận đơn hàng MB02' });
        } else if (nextStatus === 'SHIPPING') {
          orderService.packExportOrder(orderId, { packageWeightGrams: 650, exportNote: 'Đã dán niêm phong bảo hành và bọc bóng khí 4 lớp', assignedShipper: 'Tài xế GHN' });
        }
        const res = sharedStore.transitionOrderStatus(orderId, nextStatus, {
          performedBy: 'Nguyễn Thanh Hùng (Staff)'
        });
        if (res.success) {
          processedCount++;
        }
      }
    });

    if (processedCount > 0) {
      setBulkActionFeedback(`✓ Đã tự động duyệt bước tiếp theo cho ${processedCount} đơn hàng!`);
      setTimeout(() => setBulkActionFeedback(null), 4000);
      setSelectedOrderIds([]);
    } else {
      alert('Các đơn hàng được chọn hiện đang ở trạng thái Hoàn tất hoặc Đã hủy, không có bước duyệt tiếp theo.');
    }
  };

  const selectedWaitingCount = orders.filter(o => selectedOrderIds.includes(o.orderId) && o.status === 'WAITING_CONFIRMATION').length;
  const selectedPreparingCount = orders.filter(o => selectedOrderIds.includes(o.orderId) && o.status === 'PREPARING').length;

  return (
    <div className="space-y-6 relative pb-20">
      
      {/* 3.1. HEADER TRANG & KPI METRICS */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Quản lý đơn hàng
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 font-mono">
                Điều phối
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tiếp nhận, xử lý và điều phối luồng đơn hàng từ xác nhận đơn, đóng gói, xuất kho đến hoàn tất chốt doanh thu hoặc hoàn kho theo thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="text-xs text-slate-600 font-medium px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
              Hiển thị: <strong className="text-slate-900 font-bold">{filteredOrders.length}</strong> / {orders.length} đơn
            </div>
            <button
              onClick={() => handleResetFilters()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Khôi phục mặc định bộ lọc"
            >
              <RotateCcw size={13} />
              <span>Làm mới bộ lọc</span>
            </button>
          </div>
        </div>

        {/* 4 THẺ CHỈ SỐ KPI TỔNG QUAN — TÍNH TỪ DỮ LIỆU THỰC TẾ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Tổng đơn hàng */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng đơn hàng</p>
              <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{metrics.totalCount}</p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Doanh số đã chốt: <strong className="text-emerald-600 font-bold">{formatVND(metrics.totalRevenue)}</strong>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
              <Package size={20} />
            </div>
          </div>

          {/* Card 2: Chờ xác nhận */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Chờ xác nhận </p>
              <p className="text-2xl font-black text-blue-700 mt-1 font-mono">{metrics.waitingConfirmation}</p>
              <span className="text-[10px] text-blue-500/80 mt-0.5 block">
                Cần gọi điện xác nhận
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Clock size={20} />
            </div>
          </div>

          {/* Card 3: Đang xử lý & Giao hàng */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">Đang xử lý & Giao</p>
              <p className="text-2xl font-black text-cyan-700 mt-1 font-mono">{metrics.inProcess}</p>
              <span className="text-[10px] text-cyan-500/80 mt-0.5 block">
                Đóng gói & Vận chuyển 
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
              <Truck size={20} />
            </div>
          </div>

          {/* Card 4: Hoàn thành */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đã hoàn thành</p>
              <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{metrics.completed}</p>
              <span className="text-[10px] text-emerald-500/80 mt-0.5 block">
                Giao TC • Đã chốt doanh thu thuần
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* THÔNG BÁO PHẢN HỒI THAO TÁC */}
      {bulkActionFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{bulkActionFeedback}</span>
        </div>
      )}

      {/* 3.2. BỘ LỌC VÀ THANH TÌM KIẾM CHUYÊN NGHIỆP */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3.5">
        
        {/* Hàng 1: Ô tìm kiếm đa năng + Dropdown bộ lọc trạng thái */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Ô tìm kiếm */}
          <div className="md:col-span-5 relative">
            <input
              type="text"
              placeholder="Tìm theo mã đơn, người nhận, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs focus:bg-white focus:outline-none focus:border-blue-500 font-medium transition"
            />
            <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Lọc Trạng thái đơn hàng */}
          <div className="md:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:bg-white focus:outline-none focus:border-blue-500 font-semibold transition text-slate-800 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái đơn ({orders.length})</option>
              {STATUS_PIPELINE.map(st => {
                const count = orders.filter(o => o.status === st.key).length;
                return (
                  <option key={st.key} value={st.key}>
                    {st.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Khoảng ngày đặt hàng */}
          <div className="md:col-span-4 flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-[11px] focus:bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-700"
                title="Từ ngày"
              />
            </div>
            <span className="text-slate-400 text-xs">→</span>
            <div className="relative flex-1">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-[11px] focus:bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-700"
                title="Đến ngày"
              />
            </div>
          </div>

        </div>

      </div>

      {/* FLOATING ACTION DOCK DUYỆT HÀNG LOẠT */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col md:flex-row items-center gap-4 text-xs animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-mono font-bold">
              {selectedOrderIds.length}
            </span>
            <span className="font-bold whitespace-nowrap">
              Đã chọn <span className="text-blue-400">{selectedOrderIds.length}</span> đơn hàng
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden md:block" />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkApprove('CONFIRMED', 'duyệt xác nhận ')}
              disabled={selectedWaitingCount === 0}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="Duyệt các đơn Chờ xác nhận được chọn sang Đã xác nhận "
            >
              <Check size={14} />
              <span>Duyệt đơn ({selectedWaitingCount})</span>
            </button>

            <button
              onClick={() => handleBulkApprove('SHIPPING', 'xuất kho bàn giao vận chuyển ')}
              disabled={selectedPreparingCount === 0}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="Xuất kho thực tế các đơn đã đóng gói hoàn tất"
            >
              <Truck size={14} />
              <span>Xuất kho ({selectedPreparingCount})</span>
            </button>

            <button
              onClick={handleBulkStepForward}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="Tự động duyệt bước kế tiếp hợp lệ cho từng đơn được chọn"
            >
              <Sparkles size={14} />
              <span>Duyệt bước kế tiếp</span>
            </button>

            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition text-[11px] font-semibold border border-slate-700"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* 3.3. BẢNG DANH SÁCH ĐƠN HÀNG CHUYÊN NGHIỆP */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200/80 tracking-wider">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentSelected}
                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={handleToggleSelectAllCurrent}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    title={isAllCurrentSelected? "Bỏ chọn tất cả trên trang này": "Chọn tất cả đơn trên trang này"}
                  />
                </th>
                <th className="p-3.5">Mã đơn & Ngày đặt</th>
                <th className="p-3.5">Khách hàng / Người nhận</th>
                <th className="p-3.5">Sản phẩm snapshot</th>
                <th className="p-3.5 text-right">Tổng thanh toán</th>
                <th className="p-3.5">Thanh toán</th>
                <th className="p-3.5 text-center">Trạng thái đơn</th>
                <th className="p-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Package size={36} className="mx-auto mb-2 opacity-40 text-slate-500" />
                    <p className="font-bold text-slate-700 text-sm">Không tìm thấy đơn hàng nào</p>
                    <p className="text-xs text-slate-400 mt-1">Vui lòng thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition inline-flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} />
                      <span>Đặt lại bộ lọc</span>
                    </button>
                  </td>
                </tr>
              ): (
                paginatedOrders.map(order => {
                  const effectiveStatus = getEffectiveOrderStatus(order);
                  const statusObj = STATUS_PIPELINE.find(s => s.key === effectiveStatus) || STATUS_PIPELINE[0];
                  const paymentObj = PAYMENT_STATUS_MAP[order.paymentStatus] || PAYMENT_STATUS_MAP.UNPAID;
                  const shipmentStatus = resolveShipmentStatus(order);
                  const shipmentObj = SHIPMENT_STATUS_MAP[shipmentStatus] || SHIPMENT_STATUS_MAP.PENDING;
                  const shipmentRecord = getShipmentForOrder(order);
                  const isChecked = selectedOrderIds.includes(order.orderId);

                  const primaryItem: OrderItemSnapshot | undefined = order.items[0];
                  const otherItemsCount = order.items.length - 1;

                  // Format ngày đặt
                  const formattedDate = new Date(order.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                  const formattedTime = new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr 
                      key={order.orderId} 
                      className={`transition-colors ${isChecked? 'bg-blue-50/50': 'hover:bg-slate-50/70'}`}
                    >
                      {/* 1. Checkbox chọn dòng */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(order.orderId)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </td>

                      {/* 2. Mã đơn & Ngày đặt */}
                      <td className="p-3.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setViewDetailModal(order);
                            setActiveDetailTab('OVERVIEW');
                          }}
                          className="font-mono text-blue-600 hover:text-blue-800 font-extrabold text-xs block text-left group flex items-center gap-1"
                          title="Nhấn để mở chi tiết đơn hàng"
                        >
                          <span>#{order.orderCode}</span>
                          <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                          {formattedTime} • {formattedDate}
                        </span>
                        {(order.trackingCode || shipmentRecord?.trackingCode) && (
                          <span className="text-[10px] text-blue-600 font-mono block font-semibold mt-0.5" title="Mã vận đơn bưu cục">
                            VĐ: {order.trackingCode || shipmentRecord?.trackingCode}
                          </span>
                        )}
                      </td>

                      {/* 3. Khách hàng / Người nhận */}
                      <td className="p-3.5">
                        <strong className="text-slate-900 block text-xs">{order.recipientName}</strong>
                        <span className="font-mono text-[11px] text-slate-500 block">{order.recipientPhone}</span>
                        <p className="text-[11px] text-slate-400 line-clamp-1 max-w-[180px] mt-0.5" title={order.shippingAddress}>
                          {order.shippingAddress}
                        </p>
                      </td>

                      {/* 4. Chi tiết sản phẩm snapshot */}
                      <td className="p-3.5 max-w-xs">
                        {primaryItem? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {primaryItem.imageUrl? (
                                <img 
                                  src={primaryItem.imageUrl} 
                                  alt={primaryItem.productNameSnapshot} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ): (
                                <Package size={16} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-800 truncate" title={primaryItem.productNameSnapshot}>
                                {primaryItem.productNameSnapshot}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                <span>{primaryItem.colorSnapshot}{primaryItem.romSnapshot ? ` - ${primaryItem.romSnapshot}` : ''}</span>
                                <span>•</span>
                                <span className="font-bold text-slate-700">SL: {primaryItem.quantity}</span>
                              </div>
                              {otherItemsCount > 0 && (
                                <span 
                                  onClick={() => {
                                    setViewDetailModal(order);
                                    setActiveDetailTab('ITEMS');
                                  }}
                                  className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer inline-block mt-0.5"
                                >
                                  +{otherItemsCount} sản phẩm khác
                                </span>
                              )}
                            </div>
                          </div>
                        ): (
                          <span className="text-slate-400 italic">Không có mặt hàng</span>
                        )}
                      </td>

                      {/* 5. Tổng thanh toán */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <strong className="font-extrabold text-slate-900 block tabular-nums text-xs">
                          {formatVND(order.totalAmount)}
                        </strong>
                        {order.voucherDiscount > 0? (
                          <span className="text-[10px] text-emerald-600 font-semibold block">
                            Voucher -{formatVND(order.voucherDiscount)}
                          </span>
                        ): (
                          <span className="text-[10px] text-slate-400 block">
                            Tạm tính: {formatVND(order.subtotal)}
                          </span>
                        )}
                      </td>

                      {/* 6. Thanh toán */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="block text-[11px] font-medium text-slate-700">
                          {order.paymentMethod === 'COD'? 'Tiền mặt (COD)': 'Chuyển khoản QR'}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mt-0.5 ${paymentObj.badgeClass}`}>
                          {paymentObj.label}
                        </span>
                      </td>

                      {/* 7. Trạng thái đơn hàng */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusObj.badgeClass}`}>
                          {statusObj.label}
                        </span>
                        {order.cancelReason && (
                          <span className="block text-[10px] text-rose-500 truncate max-w-[120px] mt-0.5" title={order.cancelReason}>
                            {order.cancelReason}
                          </span>
                        )}
                        {order.returnStatus === 'REJECTED' && (
                          <span className="block text-[10px] text-rose-600 font-semibold mt-0.5" title={order.returnRejectReason}>
                            Hoàn trả thất bại
                          </span>
                        )}
                        {order.returnStatus === 'APPROVED' && (
                          <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                            Đã duyệt đổi trả
                          </span>
                        )}
                        {(order.returnStatus === 'PENDING' || order.returnStatus === 'INSPECTING') && (
                          <span className="block text-[10px] text-purple-600 font-semibold mt-0.5">
                            Đang xử lý đổi trả
                          </span>
                        )}
                      </td>

                      {/* 8. Thao tác điều phối */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Nút Xem chi tiết A-G */}
                          <button
                            onClick={() => {
                              setViewDetailModal(order);
                              setActiveDetailTab('OVERVIEW');
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                            title="Xem chi tiết toàn bộ hồ sơ đơn hàng (A-G)"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Nút Xác nhận TT: CHỈ hiển thị khi khách ĐÃ bấm "Tôi đã chuyển khoản" (paymentStatus === 'PENDING') */}
                          {(order.paymentStatus === 'PENDING' && (order.status === 'PENDING_PAYMENT' || order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER')) && (
                            <button
                              onClick={() => handleAdminConfirmPayment(order)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition animate-pulse"
                              title="Khách hàng đã xác nhận chuyển khoản qua QR! Bấm để duyệt và ghi nhận đã nhận tiền."
                            >
                              <Check size={12} />
                              <span>Xác nhận TT</span>
                            </button>
                          )}
                          {/* Khi khách hàng CHƯA bấm chuyển khoản (paymentStatus === 'UNPAID') */}
                          {(order.paymentStatus === 'UNPAID' && (order.status === 'PENDING_PAYMENT' || order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER')) && (
                            <span 
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1 cursor-default"
                              title="Khách hàng đang quét mã QR và chưa nhấn 'Tôi đã chuyển khoản'"
                            >
                              <Clock size={10} className="text-amber-500" />
                              <span>Chờ khách CK</span>
                            </span>
                          )}
                          {order.status === 'PENDING_PAYMENT' && (
                            <button
                              onClick={() => {
                                setCancelModal(order);
                                setCancelReason('Hết hạn thanh toán / Khách hủy đơn');
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hủy đơn hàng"
                            >
                              <XCircle size={15} />
                            </button>
                          )}

                          {/* 2. WAITING_CONFIRMATION: Chờ xác nhận -> Xác nhận chuyển sang Đã xác nhận */}
                          {order.status === 'WAITING_CONFIRMATION' && (
                            <>
                              <button
                                onClick={() => handleTransition(order.orderId, 'CONFIRMED')}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                                title="Xác nhận đơn hàng, chuyển sang Đã xác nhận"
                              >
                                <Check size={12} />
                                <span>Xác nhận</span>
                              </button>
                              <button
                                onClick={() => {
                                  setCancelModal(order);
                                  setCancelReason('Khách hàng yêu cầu hủy đơn');
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Hủy đơn hàng"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}

                          {/* 3. CONFIRMED: Đã xác nhận -> Chuẩn bị hàng & Đẩy sang Bảng Vận đơn */}
                          {order.status === 'CONFIRMED' && (
                            <>
                              <button
                                onClick={() => handleTransition(order.orderId, 'PREPARING')}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                                title="Chuẩn bị hàng và tự động đẩy sang Bảng Vận đơn"
                              >
                                <Boxes size={12} />
                                <span>Chuẩn bị hàng</span>
                              </button>
                              <button
                                onClick={() => {
                                  setCancelModal(order);
                                  setCancelReason('Khách hàng yêu cầu hủy đơn');
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Hủy đơn hàng"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}

                          {/* 4. PREPARING: Đang chuẩn bị hàng -> Đã đẩy sang bảng vận đơn */}
                          {effectiveStatus === 'PREPARING' && (
                            <span 
                              className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs"
                              title={`Đang chuẩn bị hàng. Đã đẩy sang Bảng Vận đơn (${order.trackingCode || shipmentRecord?.trackingCode || 'Đã cấp VĐ'}).`}
                            >
                              <Boxes size={11} className="text-purple-600" />
                              <span>Đã đẩy Vận đơn</span>
                            </span>
                          )}

                          {/* 4.5. PICKED_UP: Đã lấy hàng -> Cập nhật từ Bảng Vận đơn */}
                          {effectiveStatus === 'PICKED_UP' && (
                            <span 
                              className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs"
                              title="Bưu tá đã lấy hàng từ kho, tiến trình do Quản lý Vận đơn xử lý"
                            >
                              <Truck size={11} className="text-blue-600" />
                              <span>Đã lấy hàng (VĐ)</span>
                            </span>
                          )}

                          {/* 5. SHIPPING: Đang giao -> Cập nhật từ Bảng Vận đơn */}
                          {order.status === 'SHIPPING' && (
                            <span 
                              className="px-2 py-0.5 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs"
                              title="Bưu tá đang giao hàng, tiến trình do Quản lý Vận đơn xử lý"
                            >
                              <Truck size={11} className="text-cyan-600" />
                              <span>Đang giao (VĐ)</span>
                            </span>
                          )}

                          {order.status === 'COMPLETED' && (
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Đã hoàn tất</span>
                            </span>
                          )}

                          {order.status === 'CANCELLED' && (
                            <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                              <XCircle size={11} className="text-slate-400" />
                              <span>Đã hủy</span>
                            </span>
                          )}

                          {/* Xem nhanh Biểu mẫu số hóa */}
                          <button
                            onClick={() => {
                              const formType = order.status === 'WAITING_CONFIRMATION'? 'ORDER':
                                               order.status === 'CONFIRMED' || order.status === 'PREPARING'? 'CONFIRM':
                                               order.status === 'SHIPPING'? 'EXPORT': 'RETURN';
                              setViewFormModal({ type: formType, order });
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Xem và in biểu mẫu MB số hóa"
                          >
                            <FileText size={14} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG VÀ LỰA CHỌN SỐ DÒNG MỖI TRANG */}
        <PortalPagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>

      {/* 4. DRAWER / MODAL CHI TIẾT ĐƠN HÀNG TOÀN DIỆN (KHU VỰC A ĐẾN G) */}
      {viewDetailModal && (() => {
        const order = viewDetailModal;
        const statusObj = STATUS_PIPELINE.find(s => s.key === order.status) || STATUS_PIPELINE[0];
        const paymentObj = PAYMENT_STATUS_MAP[order.paymentStatus] || PAYMENT_STATUS_MAP.UNPAID;
        const shipmentRecord = getShipmentForOrder(order);
        const returnRecord = getReturnRequestForOrder(order);
        const shipmentStatus = resolveShipmentStatus(order);
        const shipmentObj = SHIPMENT_STATUS_MAP[shipmentStatus] || SHIPMENT_STATUS_MAP.PENDING;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200/90 text-xs flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* HEADER MODAL */}
              <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        Đơn hàng #{order.orderCode}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.badgeClass}`}>
                        {statusObj.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Khởi tạo lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* Nút xem/in biểu mẫu & Đóng */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setViewFormModal({ type: 'ORDER', order })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1 transition shadow-xs"
                    title="Xem đơn đặt hàng trực tuyến"
                  >
                    <span>Đơn hàng</span>
                  </button>
                  <button
                    onClick={() => setViewFormModal({ type: 'CONFIRM', order })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1 transition shadow-xs"
                    title="Xem phiếu xác nhận đơn hàng"
                  >
                    <span>Xác nhận</span>
                  </button>
                  <button
                    onClick={() => setViewFormModal({ type: 'EXPORT', order })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1 transition shadow-xs"
                    title="Xem phiếu xuất kho"
                  >
                    <span>Xuất kho</span>
                  </button>
                  <button
                    onClick={() => setViewDetailModal(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition ml-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* TABS ĐIỀU HƯỚNG TRONG CHI TIẾT */}
              <div className="flex items-center gap-1 px-5 border-b border-slate-200 bg-white flex-shrink-0 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveDetailTab('OVERVIEW')}
                  className={`py-3 px-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeDetailTab === 'OVERVIEW'? 'border-blue-600 text-blue-600': 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Package size={14} />
                  <span>Khu vực A, C, D: Tổng quan</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('ITEMS')}
                  className={`py-3 px-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeDetailTab === 'ITEMS'? 'border-blue-600 text-blue-600': 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Boxes size={14} />
                  <span>Khu vực B: Sản phẩm snapshot ({order.items.length})</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('SHIPMENT')}
                  className={`py-3 px-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeDetailTab === 'SHIPMENT'? 'border-blue-600 text-blue-600': 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Truck size={14} />
                  <span>Khu vực F: Vận chuyển</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('LOGS')}
                  className={`py-3 px-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeDetailTab === 'LOGS'? 'border-blue-600 text-blue-600': 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Clock size={14} />
                  <span>Khu vực E: Lịch sử trạng thái</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('RETURNS')}
                  className={`py-3 px-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeDetailTab === 'RETURNS'? 'border-blue-600 text-blue-600': 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <RotateCcw size={14} />
                  <span>Khu vực G: Đổi trả & Hoàn kho</span>
                  {(returnRecord || order.cancelReason?.includes('RETURN')) && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  )}
                </button>
              </div>

              {/* NỘI DUNG CUỘN CHI TIẾT */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                
                {/* ================= KHU VỰC A: TỔNG QUAN ĐƠN HÀNG ================= */}
                {(activeDetailTab === 'OVERVIEW' || activeDetailTab === 'ITEMS') && (
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Khu vực A — Tổng quan vận hành</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <strong className="text-sm font-extrabold text-slate-900 font-mono">#{order.orderCode}</strong>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.badgeClass}`}>
                            {statusObj.label}
                          </span>
                        </div>
                      </div>

                      {/* Các thao tác hợp lệ theo từng tiến trình */}
                      <div className="flex items-center gap-2">
                        {/* Thao tác xác nhận tiền: Chỉ hiện khi khách đã xác nhận chuyển khoản (paymentStatus === 'PENDING') */}
                        {(order.paymentStatus === 'PENDING' && (order.status === 'PENDING_PAYMENT' || order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER')) && (
                          <button
                            onClick={() => handleAdminConfirmPayment(order)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition animate-pulse"
                            title="Khách hàng đã báo chuyển khoản thành công. Bấm để xác nhận tiền đã vào tài khoản!"
                          >
                            <Check size={14} />
                            <span>Xác nhận đã nhận tiền</span>
                          </button>
                        )}
                        {(order.paymentStatus === 'UNPAID' && (order.status === 'PENDING_PAYMENT' || order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER')) && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium border border-slate-200 flex items-center gap-1.5">
                            <Clock size={13} className="text-amber-500" />
                            <span>Chờ khách quét QR & báo CK</span>
                          </span>
                        )}
                        {order.status === 'PENDING_PAYMENT' && (
                          <button
                            onClick={() => {
                              setCancelModal(order);
                              setCancelReason('Khách hàng yêu cầu hủy đơn');
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition"
                          >
                            Hủy đơn
                          </button>
                        )}

                        {order.status === 'WAITING_CONFIRMATION' && (
                          <>
                            <button
                              onClick={() => handleTransition(order.orderId, 'CONFIRMED')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition"
                            >
                              <Check size={14} />
                              <span>Xác nhận đơn</span>
                            </button>
                            <button
                              onClick={() => {
                                setCancelModal(order);
                                setCancelReason('Khách hàng yêu cầu hủy đơn');
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition"
                            >
                              Hủy đơn
                            </button>
                          </>
                        )}

                        {order.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => handleTransition(order.orderId, 'PREPARING')}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition"
                            >
                              <Boxes size={14} />
                              <span>Chuẩn bị hàng & Đẩy VĐ</span>
                            </button>
                            <button
                              onClick={() => {
                                setCancelModal(order);
                                setCancelReason('Khách hàng yêu cầu hủy đơn');
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition"
                            >
                              Hủy đơn
                            </button>
                          </>
                        )}

                        {(order.status === 'PREPARING' || order.status === 'PICKED_UP' || order.status === 'SHIPPING') && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold">
                            <Truck size={13} className="text-blue-600" />
                            <span>
                              {order.status === 'PREPARING'? 'Đang chuẩn bị hàng (Đã đẩy Vận đơn)':
                               order.status === 'PICKED_UP'? 'Bưu tá đã lấy hàng từ kho':
                               'Bưu tá đang giao hàng'} ({order.trackingCode || shipmentRecord?.trackingCode || 'Đã cấp mã VĐ'})
                            </span>
                          </div>
                        )}

                        {order.status === 'COMPLETED' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Đơn hàng đã hoàn tất</span>
                          </div>
                        )}

                        {order.status === 'CANCELLED' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold">
                            <XCircle size={13} className="text-slate-400" />
                            <span>Đơn hàng đã hủy</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Thời gian tạo:</span>
                        <strong className="text-slate-800 font-mono">{new Date(order.createdAt).toLocaleString('vi-VN')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cập nhật gần nhất:</span>
                        <strong className="text-slate-800 font-mono">{new Date(order.updatedAt).toLocaleString('vi-VN')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tổng số lượng:</span>
                        <strong className="text-slate-800">{order.items.reduce((s, i) => s + i.quantity, 0)} thiết bị</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tổng tiền đơn:</span>
                        <strong className="text-blue-700 font-extrabold">{formatVND(order.totalAmount)}</strong>
                      </div>
                    </div>

                    {/* Banner lý do hủy nếu có */}
                    {order.cancelReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800">
                        <AlertTriangle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-xs">Đơn hàng đã bị hủy / giao thất bại:</strong>
                          <p className="text-[11px] text-rose-700 mt-0.5">{order.cancelReason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ================= KHU VỰC B: DANH SÁCH SẢN PHẨM SNAPSHOT ================= */}
                {(activeDetailTab === 'ITEMS' || activeDetailTab === 'OVERVIEW') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                        Khu vực B — Chi tiết sản phẩm snapshot (Order_Items)
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        Giá & cấu hình bất biến tại thời điểm đặt
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/80 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Sản phẩm</th>
                            <th className="p-2.5">Mã SKU</th>
                            <th className="p-2.5">Cấu hình</th>
                            <th className="p-2.5 text-center">SL</th>
                            <th className="p-2.5 text-right">Đơn giá snapshot</th>
                            <th className="p-2.5 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {order.items.map((it, idx) => (
                            <tr key={it.orderItemId || idx} className="hover:bg-slate-50/50">
                              <td className="p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {it.imageUrl? (
                                      <img src={it.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ): (
                                      <Package size={14} className="text-slate-400" />
                                    )}
                                  </div>
                                  <strong className="text-slate-900 text-xs">{it.productNameSnapshot}</strong>
                                </div>
                              </td>
                              <td className="p-2.5 font-mono text-slate-600 text-[11px]">{it.skuSnapshot}</td>
                              <td className="p-2.5 text-slate-600 text-[11px]">{it.colorSnapshot} - {it.romSnapshot}</td>
                              <td className="p-2.5 text-center font-bold text-slate-800">{it.quantity}</td>
                              <td className="p-2.5 text-right font-mono text-slate-700">{formatVND(it.unitPrice)}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatVND(it.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ================= KHU VỰC C & D: NGƯỜI NHẬN & TỔNG KẾT THANH TOÁN ================= */}
                {activeDetailTab === 'OVERVIEW' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* KHU VỰC C — THÔNG TIN NGƯỜI NHẬN */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-xs">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider pb-1.5 border-b border-slate-100">
                        <User size={14} className="text-blue-600" />
                        <span>Khu vực C — Người nhận & Địa chỉ</span>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Họ và tên người nhận:</span>
                          <strong className="text-slate-900 text-sm">{order.recipientName}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Số điện thoại liên hệ:</span>
                          <span className="font-mono font-bold text-slate-800 text-xs">{order.recipientPhone}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Địa chỉ giao hàng thực tế:</span>
                          <p className="text-slate-700 text-xs mt-0.5 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                            {order.shippingAddress}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* KHU VỰC D — TỔNG KẾT THANH TOÁN */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-xs">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider pb-1.5 border-b border-slate-100">
                        <CreditCard size={14} className="text-emerald-600" />
                        <span>Khu vực D — Tổng kết thanh toán</span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Tổng tiền hàng (Tạm tính):</span>
                          <strong className="text-slate-800 font-mono">{formatVND(order.subtotal)}</strong>
                        </div>
                        {order.voucherDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Voucher giảm giá đơn hàng:</span>
                            <span className="font-mono">-{formatVND(order.voucherDiscount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Phí vận chuyển:</span>
                          <span className="text-slate-700 font-medium">
                            {order.shippingFee === 0? 'Miễn phí giao hàng': formatVND(order.shippingFee)}
                          </span>
                        </div>

                        <div className="border-t border-slate-200/80 pt-2 flex justify-between items-center text-sm font-extrabold text-slate-900">
                          <span>Tổng thanh toán:</span>
                          <span className="text-blue-700 font-mono text-base">{formatVND(order.totalAmount)}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="text-slate-400 block">Phương thức:</span>
                            <strong className="text-slate-800">
                              {order.paymentMethod === 'COD'? 'Thu hộ tiền mặt (COD)': 'Chuyển khoản QR'}
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block">Trạng thái thanh toán:</span>
                            <span className={`inline-block px-2 py-0.5 rounded-md font-bold border ${paymentObj.badgeClass}`}>
                              {paymentObj.label}
                            </span>
                          </div>
                        </div>

                        {order.paymentDeadline && (
                          <p className="text-[10px] text-amber-600 font-medium mt-1">
                            Thời hạn giữ chỗ thanh toán: {new Date(order.paymentDeadline).toLocaleTimeString('vi-VN')}
                          </p>
                        )}

                        {order.paymentStatus === 'PENDING' && (order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER' || order.status === 'PENDING_PAYMENT') && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                              <Check size={13} className="text-emerald-600" /> Khách đã gửi xác nhận chuyển khoản
                            </span>
                            <button
                              onClick={() => handleAdminConfirmPayment(order)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
                            >
                              <Check size={12} />
                              <span>Xác nhận đã nhận tiền</span>
                            </button>
                          </div>
                        )}
                        {order.paymentStatus === 'UNPAID' && (order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'SIMULATED_TRANSFER' || order.status === 'PENDING_PAYMENT') && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-amber-500" /> Khách chưa bấm "Tôi đã chuyển khoản"
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* ================= KHU VỰC E: LỊCH SỬ TRẠNG THÁI (AUDIT TRAIL) ================= */}
                {activeDetailTab === 'LOGS' && (
                  <div className="space-y-3">
                    <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wider block">
                      Khu vực E — Lịch sử trạng thái & Nhật ký kiểm toán (Order_Status_History)
                    </span>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {order.statusHistory.map((h, i) => (
                          <div key={i} className="relative group">
                            <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                              <span className="font-extrabold text-slate-900 uppercase font-mono">{h.status}</span>
                              <span className="font-mono text-slate-400 text-[10px]">{h.time}</span>
                            </div>
                            <p className="text-slate-600 text-xs mt-0.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                              {cleanLogNote(h.note)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= KHU VỰC F: VẬN CHUYỂN (SHIPMENTS) ================= */}
                {activeDetailTab === 'SHIPMENT' && (
                  <div className="space-y-4">
                    {/* Hướng dẫn nghiệp vụ đồng bộ */}
                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-blue-900 text-xs flex items-start gap-2.5">
                      <Truck size={17} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="block text-[11px] uppercase tracking-wider text-blue-950 font-black">
                          Cơ chế đồng bộ Đơn hàng ⟷ Vận đơn
                        </strong>
                        <p className="text-[11px] leading-relaxed text-blue-800">
                          Tiến trình: <strong>Chờ thanh toán → Chờ xác nhận → Đã xác nhận → Đang chuẩn bị hàng (Đẩy sang Bảng Vận đơn)</strong>. Sau khi đơn được chuyển sang "Đang chuẩn bị hàng", hệ thống sẽ đẩy thông tin sang Bảng Vận đơn với trạng thái ban đầu là <strong>“Đã lấy hàng”</strong>. Mọi thay đổi trạng thái vận đơn (Đã lấy hàng → Đang giao → Giao thành công / Giao thất bại) đều tự động đồng bộ sang bảng Đơn hàng.
                        </p>
                      </div>
                    </div>

                    {/* TRƯỜNG HỢP 1: ĐƠN HÀNG CHƯA ĐẨY SANG BẢNG VẬN ĐƠN */}
                    {(order.status === 'PENDING_PAYMENT' || order.status === 'WAITING_CONFIRMATION' || order.status === 'CONFIRMED') &&!shipmentRecord? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <Package size={24} />
                        </div>
                        <div>
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 mb-1.5">
                            Trạng thái: Chưa đẩy sang Bảng Vận đơn
                          </span>
                          <h4 className="text-sm font-black text-slate-900">
                            {order.status === 'CONFIRMED'? 'Đơn hàng đã xác nhận — Sẵn sàng chuẩn bị hàng': 'Đơn hàng đang chờ duyệt'}
                          </h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                            {order.status === 'CONFIRMED'? 'Nhấn nút "Bắt đầu chuẩn bị hàng & Đẩy VĐ" để bộ phận kho tiếp nhận đóng gói và hệ thống sẽ tự động khởi tạo vận đơn sang Quản lý Vận đơn.': 'Đơn hàng cần được duyệt xác nhận trước khi tiếp nhận chuẩn bị và đẩy sang Bảng Vận đơn.'}
                          </p>
                        </div>
                        {order.status === 'CONFIRMED' && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => handleTransition(order.orderId, 'PREPARING')}
                              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 text-xs"
                            >
                              <Boxes size={14} />
                              <span>Bắt đầu chuẩn bị hàng & Đẩy sang Vận đơn ngay</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ): (
                      /* TRƯỜNG HỢP 2: ĐƠN ĐÃ CÓ VẬN ĐƠN */
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                        
                        {/* 4 Thẻ chỉ số tổng quan vận đơn */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Đơn vị vận chuyển</span>
                            <strong className="text-slate-900 text-xs block mt-1">
                              {order.carrier || shipmentRecord?.carrier || 'Giao Hàng Nhanh Express'}
                            </strong>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Tiêu chuẩn hỏa tốc</span>
                          </div>

                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Mã vận đơn bưu cục</span>
                            <strong className="text-blue-700 text-xs font-mono block mt-1">
                              {order.trackingCode || shipmentRecord?.trackingCode || 'GHN-89230192'}
                            </strong>
                            <span className="text-[10px] text-blue-500 font-mono block mt-0.5">Barcode bưu điện</span>
                          </div>

                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Trạng thái vận đơn</span>
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border mt-1 ${shipmentObj.badgeClass}`}>
                              {shipmentObj.label}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5 truncate" title={shipmentObj.desc}>
                              {shipmentObj.desc}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Đồng bộ Đơn hàng</span>
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border mt-1 ${
                              STATUS_PIPELINE.find(s => s.key === order.status)?.badgeClass || 'bg-slate-100 text-slate-700'
                            }`}>
                              {STATUS_PIPELINE.find(s => s.key === order.status)?.label || order.status}
                            </span>
                            <span className="text-[10px] text-emerald-600 block mt-0.5 font-semibold">
                              ✓ Đồng bộ 100% dữ liệu
                            </span>
                          </div>
                        </div>

                        {/* Thông tin người nhận và COD */}
                        <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Địa chỉ & Người nhận:</span>
                            <p className="font-bold text-slate-800">{order.recipientName} • <span className="font-mono">{order.recipientPhone}</span></p>
                            <p className="text-slate-600 text-[11px] leading-relaxed">{order.shippingAddress}</p>
                          </div>
                          <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-3">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Thu hộ COD & Đối soát:</span>
                            <p className="font-extrabold text-slate-900 text-sm font-mono">
                              {order.paymentMethod === 'COD'? formatVND(order.totalAmount): '0₫ (Đã thanh toán Online)'}
                            </p>
                            <p className="text-slate-500 text-[10px]">
                              Hình thức: {order.paymentMethod === 'COD'? 'Shipper thu tiền mặt khi giao': 'Không thu tiền mặt'}
                            </p>
                          </div>
                        </div>

                        {/* Lý do thất bại nếu có */}
                        {(shipmentRecord?.failReason || order.cancelReason) && (
                          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-1">
                            <strong className="block text-rose-900 font-bold flex items-center gap-1.5">
                              <AlertCircle size={14} className="text-rose-600" />
                              <span>Chi tiết nguyên nhân thất bại:</span>
                            </strong>
                            <p className="text-rose-800 leading-relaxed font-medium">
                              {shipmentRecord?.failReason || order.cancelReason}
                            </p>
                          </div>
                        )}

                        {/* THÔNG TIN BÀN GIAO QUẢN LÝ VẬN ĐƠN */}
                        {shipmentRecord && (
                          <div className="pt-3 border-t border-slate-200">
                            <div className="p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="space-y-1">
                                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                                  <Truck size={15} className="text-blue-600" />
                                  <span>Vận đơn do Phân hệ Quản lý Vận đơn phụ trách</span>
                                </span>
                                <p className="text-[11px] text-blue-700 leading-relaxed">
                                  Đơn hàng đã được cấp mã vận đơn <strong className="font-mono text-blue-900">{shipmentRecord.trackingCode}</strong>. Toàn bộ thao tác cập nhật tiến trình (Đã lấy hàng, Đang vận chuyển, Hoàn tất, Lấy/Giao thất bại) được thực hiện độc quyền tại <strong>Quản lý Vận đơn</strong> và tự động đồng bộ thời gian thực sang bảng Đơn hàng.
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-200 text-blue-700 font-bold text-[11px] rounded-lg shadow-2xs">
                                  <Sparkles size={12} className="text-blue-600" />
                                  <span>Đồng bộ tự động</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 text-[11px] text-slate-500 flex justify-between border-t border-slate-100">
                          <span>Cập nhật gần nhất bởi: <strong>{shipmentRecord?.updatedBy || 'Hệ thống điều phối'}</strong></span>
                          <span className="font-mono">{shipmentRecord?.updatedAt || order.updatedAt}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ================= KHU VỰC G: ĐỔI TRẢ & HOÀN KHO ================= */}
                {activeDetailTab === 'RETURNS' && (
                  <div className="space-y-3">
                    <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wider block">
                      Khu vực G — Yêu cầu đổi trả & Biên bản hoàn kho
                    </span>

                    {returnRecord? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono">Mã yêu cầu: #{returnRecord.returnId}</span>
                            <h4 className="text-xs font-extrabold text-slate-900 mt-0.5">
                              Người yêu cầu: {returnRecord.requestedBy} ({returnRecord.phone})
                            </h4>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Trạng thái: {returnRecord.status}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                          <strong className="text-slate-800 block">Lý do yêu cầu đổi trả:</strong>
                          <p className="text-slate-600">{returnRecord.reason}</p>
                        </div>

                        {returnRecord.inspectionResult && (
                          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-xs space-y-1 text-blue-900">
                            <strong className="block">Kết quả kiểm tra ngoại quan & Seal niêm phong:</strong>
                            <p>{returnRecord.inspectionResult}</p>
                            <span className="text-[10px] text-blue-700 block font-mono">
                              Kỹ thuật viên: {returnRecord.inspectedBy || 'Chưa phân công'} • Lúc: {returnRecord.inspectedAt}
                            </span>
                          </div>
                        )}

                        {returnRecord.refundAmount && (
                          <div className="flex justify-between items-center p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold">
                            <span>Số tiền hoàn trả khách hàng:</span>
                            <span className="font-mono text-sm">{formatVND(returnRecord.refundAmount)}</span>
                          </div>
                        )}
                      </div>
                    ): order.cancelReason?.includes('RETURN')? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-rose-700 font-bold text-xs pb-2 border-b border-slate-200">
                          <RotateCcw size={16} />
                          <span>Biên bản thẩm định nhập hoàn kho</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                          {order.cancelReason}
                        </p>
                      </div>
                    ): (
                      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                        <RotateCcw size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-bold text-slate-600 text-xs">Đơn hàng này chưa phát sinh khiếu nại hoặc yêu cầu đổi trả.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Mọi hồ sơ bảo hành 1-1 và hoàn kho sẽ xuất hiện tại đây khi được khởi tạo.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* FOOTER MODAL */}
              <div className="p-3.5 sm:p-4 border-t border-slate-200/80 bg-slate-50/80 flex justify-between items-center flex-shrink-0">
                <span className="text-[11px] text-slate-500 font-mono">
                  Mã tham chiếu hệ thống: DH-REF-{order.orderId}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewDetailModal(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 5. DIALOG XÁC NHẬN HỦY ĐƠN HÀNG AN TOÀN */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 text-rose-600">
              <AlertCircle size={20} />
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Xác nhận hủy đơn hàng #{cancelModal.orderCode}
              </h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <strong>Cảnh báo nghiệp vụ:</strong> Thao tác hủy đơn sẽ tự động giải phóng toàn bộ số lượng giữ chỗ (Reserved Qty) của các sản phẩm trong đơn trở về Tồn kho khả dụng (Available Qty).
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-700">Lý do hủy đơn hàng:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 font-medium text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="Khách hàng thay đổi nhu cầu mua sắm">Khách hàng thay đổi nhu cầu mua sắm</option>
                <option value="Khách không nghe máy sau nhiều lần gọi xác nhận">Khách không nghe máy sau nhiều lần gọi xác nhận</option>
                <option value="Khách đặt nhầm màu sắc/phiên bản ROM">Khách đặt nhầm màu sắc/phiên bản ROM</option>
                <option value="Sai thông tin số điện thoại hoặc địa chỉ nhận">Sai thông tin số điện thoại hoặc địa chỉ nhận</option>
                <option value="OTHER">Lý do khác (Nhập tùy chỉnh)...</option>
              </select>

              {cancelReason === 'OTHER' && (
                <textarea
                  rows={2}
                  placeholder="Nhập chi tiết lý do hủy đơn..."
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 font-medium mt-1"
                />
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setCancelModal(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmCancelOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                Xác nhận hủy đơn & Hoàn kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL KÝ DUYỆT HOÀN KHO  */}
      {mb04Modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-rose-600">
              <RotateCcw size={18} />
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Lập Phiếu hoàn kho — Đơn #{mb04Modal.orderCode}
              </h3>
            </div>

            <p className="text-slate-600 leading-relaxed text-[11px]">
              Kiện hàng được bưu tá hoàn về kho do phát không thành công. Thủ kho bắt buộc phải thẩm định thực tế tình trạng niêm phong (seal) trước khi ký duyệt nhập kho.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lý do giao hàng thất bại:</label>
                <select
                  value={mb04Reason}
                  onChange={(e) => setMb04Reason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 font-medium text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="Khách hàng từ chối nhận (Đổi ý, không lấy máy)">Khách hàng từ chối nhận (Đổi ý, không lấy máy)</option>
                  <option value="Không liên lạc được khách sau 3 lần phát">Không liên lạc được khách sau 3 lần phát</option>
                  <option value="Sai thông tin địa chỉ giao nhận">Sai thông tin địa chỉ giao nhận</option>
                  <option value="Khách yêu cầu hẹn lại ngày nhưng quá hạn lưu kho">Khách yêu cầu hẹn lại ngày nhưng quá hạn lưu kho</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thẩm định ngoại quan & Niêm phong (Seal):</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="seal"
                      checked={mb04SealCondition === 'INTACT'}
                      onChange={() => setMb04SealCondition('INTACT')}
                      className="accent-emerald-600 w-4 h-4"
                    />
                    <div>
                      <strong className="text-emerald-700 block text-xs">Máy nguyên seal 100% (Đủ điều kiện bán lẻ)</strong>
                      <span className="text-[10px] text-slate-400">Hệ thống sẽ tự động cộng lại vào Tồn kho khả dụng (Available Qty).</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="seal"
                      checked={mb04SealCondition === 'DAMAGED'}
                      onChange={() => setMb04SealCondition('DAMAGED')}
                      className="accent-rose-600 w-4 h-4"
                    />
                    <div>
                      <strong className="text-rose-700 block text-xs">Rách seal / Móp méo hộp (Không đủ điều kiện bán mới)</strong>
                      <span className="text-[10px] text-slate-400">Chuyển sang kho cách ly chờ thanh lý, không cộng vào kho bán lẻ.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setMb04Modal(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmMb04}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                Ký duyệt hoàn kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL XEM VÀ IN BIỂU MẪU SỐ HÓA ĐƠN HÀNG */}
      {viewFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 text-xs max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-blue-600">
                <FileText size={18} />
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  Biểu mẫu {viewFormModal.type} — Đơn hàng #{viewFormModal.order.orderCode}
                </h3>
              </div>
              <button 
                onClick={() => setViewFormModal(null)} 
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-300 rounded-xl space-y-4 text-slate-800">
              <div className="flex justify-between items-start text-[11px] pb-3 border-b border-slate-300">
                <div>
                  <div className="font-bold uppercase tracking-tight">HỆ THỐNG BÁN LẺ THIẾT BỊ DI ĐỘNG NEXTGEN SMART TECH</div>
                  <div className="text-slate-500">Bộ phận Điều phối & Quản trị Vận hành Bán lẻ</div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-blue-600">Mẫu: {viewFormModal.type}</div>
                  <div className="text-slate-400 font-mono">Ngày lập: {viewFormModal.order.createdAt.split('T')[0]}</div>
                </div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                  {viewFormModal.type === 'ORDER' && 'ĐƠN ĐẶT HÀNG TRỰC TUYẾN'}
                  {viewFormModal.type === 'CONFIRM' && 'PHIẾU XÁC NHẬN ĐƠN HÀNG'}
                  {viewFormModal.type === 'EXPORT' && 'PHIẾU XUẤT KHO VẬT LÝ'}
                  {viewFormModal.type === 'RETURN' && 'PHIẾU NHẬP LẠI / HOÀN KHO'}
                </h2>
                <span className="font-mono text-xs text-slate-500 font-bold">#{viewFormModal.order.orderCode}</span>
              </div>

              <div className="text-[11px] bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <div>Khách hàng: <strong>{viewFormModal.order.recipientName}</strong> • SĐT: <strong className="font-mono">{viewFormModal.order.recipientPhone}</strong></div>
                <div>Địa chỉ giao nhận: {viewFormModal.order.shippingAddress}</div>
                <div>Phương thức thanh toán: <strong>{viewFormModal.order.paymentMethod === 'COD'? 'Tiền mặt khi nhận hàng (COD)': 'Chuyển khoản QR'}</strong></div>
              </div>

              <table className="w-full text-left text-[11px] border border-slate-300 border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                    <th className="p-2 border-r border-slate-300">Mã SKU</th>
                    <th className="p-2 border-r border-slate-300">Tên sản phẩm snapshot</th>
                    <th className="p-2 border-r border-slate-300 text-center">SL</th>
                    <th className="p-2 text-right">Đơn giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {viewFormModal.order.items.map(it => (
                    <tr key={it.orderItemId}>
                      <td className="p-2 border-r border-slate-300 font-mono">{it.skuSnapshot}</td>
                      <td className="p-2 border-r border-slate-300 font-medium">{it.productNameSnapshot} ({it.colorSnapshot} - {it.romSnapshot})</td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{it.quantity}</td>
                      <td className="p-2 text-right font-mono">{formatVND(it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-right text-[11px] space-y-0.5">
                <div>Tạm tính: <strong>{formatVND(viewFormModal.order.subtotal)}</strong></div>
                {viewFormModal.order.voucherDiscount > 0 && (
                  <div className="text-emerald-600">Voucher giảm giá: -{formatVND(viewFormModal.order.voucherDiscount)}</div>
                )}
                <div className="pt-1 border-t border-slate-200">
                  Tổng thanh toán: <strong className="text-blue-700 font-extrabold text-xs">{formatVND(viewFormModal.order.totalAmount)}</strong>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-2 text-center text-[10px] text-slate-500">
                <div>
                  <span className="font-bold block text-slate-700">Người lập phiếu</span>
                  <span className="italic mt-6 block">Nguyễn Thanh Hùng</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-700">Phụ trách phê duyệt</span>
                  <span className="italic mt-6 block">Ban Giám Đốc NextGen</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 transition"
              >
                <Printer size={13} />
                <span>In biểu mẫu</span>
              </button>
              <button
                onClick={() => setViewFormModal(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
