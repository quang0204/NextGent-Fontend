import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { sharedStore } from '../../services/sharedStore';
import { apiClient } from '../../services/apiClient';
import { PortalShipment, ShipmentStatus } from '../../types/portal';
import { OrderDetail } from '../../types/order';
import { formatVND } from '../../components/common/PriceDisplay';
import { PortalPagination } from '../../components/portal/PortalPagination';
import { 
  Truck, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Edit, 
  X,
  ExternalLink,
  Boxes,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  PackageCheck
} from 'lucide-react';

export const PortalShipmentsView: React.FC = () => {
  const [shipments, setShipments] = useState<PortalShipment[]>(sharedStore.getShipments());
  const [orders, setOrders] = useState<OrderDetail[]>(sharedStore.getOrders());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ShipmentStatus>('ALL');
  const [carrierFilter, setCarrierFilter] = useState<string>('ALL');

  // Modal Update Status
  const [editingShipment, setEditingShipment] = useState<PortalShipment | null>(null);
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('IN_TRANSIT');
  const [failReason, setFailReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // API 9.2: Tải danh sách vận đơn thực tế từ Backend
  const loadBackendShipments = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>('/admin/shipments', {
        params: { page: 1, size: 50, status: 'ALL' }
      });
      if (res.data?.data?.content) {
        const backendItems: PortalShipment[] = res.data.data.content.map((b: any) => ({
          shipmentId: b.shipmentId,
          orderId: b.orderId,
          orderCode: b.orderCode,
          carrier: b.carrier,
          trackingCode: b.trackingCode,
          status: (b.status === 'READY_TO_PICK' ? 'PREPARING' :
                   b.status === 'PICKED' ? 'PICKED_UP' :
                   b.status === 'FAILED_DELIVERY' ? 'DELIVERY_FAILED' :
                   b.status) as ShipmentStatus,
          failReason: b.failReason,
          recipientName: b.recipientName,
          recipientPhone: b.recipientPhone,
          shippingAddress: b.shippingAddress,
          codAmount: b.paymentMethod === 'COD' ? b.orderTotalAmount : 0,
          updatedBy: b.updatedBy,
          updatedAt: b.updatedAt
        }));
        setShipments(backendItems);
        sharedStore.syncExternalShipments(backendItems);
      }
    } catch {
      // Giữ dữ liệu sharedStore mặc định nếu chưa đăng nhập hoặc mạng offline
    }
  }, []);

  useEffect(() => {
    loadBackendShipments();
    const unsub = sharedStore.subscribe(() => {
      setShipments([...sharedStore.getShipments()]);
      setOrders([...sharedStore.getOrders()]);
    });
    return () => unsub();
  }, [loadBackendShipments]);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleStartUpdate = (s: PortalShipment) => {
    setEditingShipment(s);
    setNewStatus(s.status);
    setFailReason(s.failReason || '');
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;

    const isFailStatus = newStatus === 'PICKUP_FAILED' || newStatus === 'DELIVERY_FAILED' || newStatus === 'FAILED';
    if (isFailStatus && !failReason.trim()) {
      alert('Vui lòng chọn hoặc nhập lý do thất bại để hệ thống ghi nhận đối soát!');
      return;
    }

    try {
      if (isFailStatus) {
        // API 9.4: POST /api/v1/admin/shipments/{id}/fail-delivery
        const res = await apiClient.post(`/admin/shipments/${editingShipment.shipmentId}/fail-delivery`, {
          failReason: failReason.trim(),
          note: 'Điều phối viên giao vận ghi nhận giao thất bại'
        });
        showNotification(res.data?.message || `✓ Đã ghi nhận giao hàng thất bại và hoàn kho vận đơn ${editingShipment.trackingCode}!`);
      } else {
        // API 9.3: PUT /api/v1/admin/shipments/{id}/status
        const apiStatus = 
          newStatus === 'PREPARING' || newStatus === 'WAITING_PICKUP' || newStatus === 'PENDING' ? 'READY_TO_PICK' :
          newStatus === 'PICKED_UP' ? 'PICKED' :
          newStatus;

        const res = await apiClient.put(`/admin/shipments/${editingShipment.shipmentId}/status`, {
          status: apiStatus,
          note: 'Điều phối viên giao vận cập nhật tiến trình'
        });
        showNotification(res.data?.message || `✓ Đã cập nhật vận đơn ${editingShipment.trackingCode} và tự động đồng bộ trạng thái sang Đơn hàng #${editingShipment.orderCode}!`);
      }

      // Đồng bộ local store
      sharedStore.updateShipmentStatus(
        editingShipment.shipmentId,
        newStatus,
        isFailStatus ? failReason : undefined,
        'Điều phối viên giao vận',
        editingShipment
      );
      setShipments([...sharedStore.getShipments()]);
      setOrders([...sharedStore.getOrders()]);
      loadBackendShipments();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Lỗi khi cập nhật trạng thái vận đơn';
      showNotification(`Lỗi: ${msg}`);
    }

      setShipments([...sharedStore.getShipments()]);
      setOrders([...sharedStore.getOrders()]);
    setEditingShipment(null);
  };

  const carriers = Array.from(new Set(shipments.map(s => s.carrier)));

  // Thống kê nhanh KPI vận đơn (Tiến trình: Đang chuẩn bị hàng -> Đã lấy hàng -> Đang giao hàng -> Giao thành công / Giao thất bại)
  const totalCount = shipments.length;
  const preparingCount = shipments.filter(s => s.status === 'PREPARING' || s.status === 'WAITING_PICKUP' || s.status === 'PENDING').length;
  const pickedUpCount = shipments.filter(s => s.status === 'PICKED_UP').length;
  const inTransitCount = shipments.filter(s => s.status === 'IN_TRANSIT').length;
  const deliveredCount = shipments.filter(s => s.status === 'DELIVERED').length;
  const failedCount = shipments.filter(s => s.status === 'DELIVERY_FAILED' || s.status === 'FAILED' || s.status === 'PICKUP_FAILED').length;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    return shipments.filter(s => {
      const matchSearch = 
        (s.orderCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.trackingCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.recipientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.recipientPhone || '').includes(searchTerm);
      if (!matchSearch) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PREPARING') {
          if (s.status !== 'PREPARING' && s.status !== 'WAITING_PICKUP' && s.status !== 'PENDING') return false;
        } else if (statusFilter === 'DELIVERY_FAILED') {
          if (s.status !== 'DELIVERY_FAILED' && s.status !== 'FAILED' && s.status !== 'PICKUP_FAILED') return false;
        } else if (s.status !== statusFilter) {
          return false;
        }
      }
      if (carrierFilter !== 'ALL' && s.carrier !== carrierFilter) return false;
      return true;
    });
  }, [shipments, searchTerm, statusFilter, carrierFilter]);

  const paginatedShipments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, carrierFilter]);

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'PREPARING':
      case 'WAITING_PICKUP':
      case 'PENDING':
        return (
          <span className="bg-purple-50 text-purple-700 border border-purple-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <Boxes size={11} className="text-purple-600" />
            <span>Đang chuẩn bị hàng</span>
          </span>
        );
      case 'PICKED_UP':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <Boxes size={11} className="text-blue-600" />
            <span>Đã lấy hàng</span>
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <Truck size={11} className="text-indigo-600" />
            <span>Đang giao hàng</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-600" />
            <span>Giao thành công</span>
          </span>
        );
      case 'DELIVERY_FAILED':
      case 'FAILED':
      case 'PICKUP_FAILED':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <AlertTriangle size={11} className="text-rose-600" />
            <span>Giao thất bại</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            {status}
          </span>
        );
    }
  };

  const getOrderStatusBadge = (orderCode: string) => {
    const ord = orders.find(o => o.orderCode === orderCode);
    if (!ord) return <span className="text-slate-400 text-[10px] italic">Không xác định</span>;

    switch (ord.status) {
      case 'WAITING_CONFIRMATION':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">Chờ xác nhận</span>;
      case 'CONFIRMED':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold">Đã xác nhận</span>;
      case 'PREPARING':
        return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-bold">Đang chuẩn bị</span>;
      case 'PICKED_UP':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold">Đã lấy hàng</span>;
      case 'SHIPPING':
        return <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-md text-[10px] font-bold">Đang giao hàng</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">Hoàn tất</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold">Đã hủy</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold">{ord.status}</span>;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Truck size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                Quản lý Vận đơn & Giao nhận
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật tiến trình giao nhận và tự động đồng bộ thời gian thực sang Đơn hàng & Kho vận
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Thông báo Toast */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-in slide-in-from-top-2">
          <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Thẻ chỉ số tổng quan KPI vận đơn (Tiến trình: Đang chuẩn bị -> Đã lấy hàng -> Đang giao -> Giao thành công -> Giao thất bại) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'ALL' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng vận đơn</span>
          <strong className="text-lg font-black text-slate-900 mt-0.5 block">{totalCount}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Tất cả kiện hàng</span>
        </div>

        <div 
          onClick={() => setStatusFilter('PREPARING')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'PREPARING' ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Đang chuẩn bị</span>
          <strong className="text-lg font-black text-purple-700 mt-0.5 block">{preparingCount}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Kho đang đóng gói</span>
        </div>

        <div 
          onClick={() => setStatusFilter('PICKED_UP')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'PICKED_UP' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Đã lấy hàng</span>
          <strong className="text-lg font-black text-blue-700 mt-0.5 block">{pickedUpCount}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Đã tiếp nhận từ kho</span>
        </div>

        <div 
          onClick={() => setStatusFilter('IN_TRANSIT')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'IN_TRANSIT' ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Đang giao</span>
          <strong className="text-lg font-black text-indigo-700 mt-0.5 block">{inTransitCount}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Đang luân chuyển</span>
        </div>

        <div 
          onClick={() => setStatusFilter('DELIVERED')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'DELIVERED' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Giao thành công</span>
          <strong className="text-lg font-black text-emerald-700 mt-0.5 block">{deliveredCount}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Hoàn tất & Ghi nhận DT</span>
        </div>

        <div 
          onClick={() => setStatusFilter('DELIVERY_FAILED')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'DELIVERY_FAILED' ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Giao thất bại</span>
          <strong className="text-lg font-black text-rose-700 mt-0.5 block">{failedCount}</strong>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Tự động hủy đơn hàng</span>
        </div>
      </div>

      {/* 3. Thanh tìm kiếm và bộ lọc */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Tìm theo mã vận đơn, mã đơn (#DH...), tên khách, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tất cả đối tác vận chuyển</option>
            {carriers.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tất cả trạng thái vận đơn</option>
            <option value="PREPARING">1. Đang chuẩn bị hàng</option>
            <option value="PICKED_UP">2. Đã lấy hàng</option>
            <option value="IN_TRANSIT">3. Đang giao hàng</option>
            <option value="DELIVERED">4. Giao thành công</option>
            <option value="DELIVERY_FAILED">5. Giao thất bại</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || carrierFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setCarrierFilter('ALL');
              }}
              className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* 4. Bảng danh sách vận đơn */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Mã VĐ & Đơn hàng</th>
                <th className="py-3.5 px-4">Hãng vận chuyển</th>
                <th className="py-3.5 px-4">Người nhận & Địa chỉ</th>
                <th className="py-3.5 px-4">Tiền thu COD</th>
                <th className="py-3.5 px-4 text-center">Trạng thái Vận đơn</th>
                <th className="py-3.5 px-4 text-center">Đồng bộ Đơn hàng</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <Truck size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-xs">Không tìm thấy bưu kiện vận đơn nào phù hợp với bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                paginatedShipments.map((ship) => (
                  <tr key={ship.shipmentId} className="hover:bg-slate-50/60 transition">
                    
                    {/* Cột 1: Mã vận đơn & Mã đơn hàng */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="font-mono font-black text-blue-700 text-xs flex items-center gap-1.5">
                          <span>{ship.trackingCode}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Đơn: <strong className="font-mono text-slate-800 font-bold">#{ship.orderCode}</strong>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Hãng vận chuyển */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-slate-800 block">{ship.carrier}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {new Date(ship.updatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </td>

                    {/* Cột 3: Người nhận & Địa chỉ */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">
                          {ship.recipientName} • <span className="font-mono text-slate-600">{ship.recipientPhone}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={ship.shippingAddress}>
                          {ship.shippingAddress}
                        </div>
                      </div>
                    </td>

                    {/* Cột 4: Thu hộ COD */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {ship.codAmount > 0 ? (
                        <div>
                          <strong className="font-mono font-bold text-slate-900 text-xs">
                            {formatVND(ship.codAmount)}
                          </strong>
                          <span className="text-[10px] text-slate-400 block">Thu tiền mặt</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                          Đã thanh toán Online
                        </span>
                      )}
                    </td>

                    {/* Cột 5: Trạng thái Vận đơn */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="space-y-1 inline-block">
                        {getStatusBadge(ship.status)}
                        {ship.failReason && (
                          <div className="text-[10px] text-rose-600 max-w-[170px] truncate mx-auto font-medium" title={ship.failReason}>
                            Lý do: {ship.failReason}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cột 6: Đơn hàng đồng bộ */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="space-y-0.5 inline-block">
                        {getOrderStatusBadge(ship.orderCode)}
                        <span className="text-[9px] text-emerald-600 font-semibold block">
                          ✓ Đồng bộ 100%
                        </span>
                      </div>
                    </td>

                    {/* Cột 7: Thao tác cập nhật */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleStartUpdate(ship)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition shadow-2xs"
                        title="Cập nhật tiến trình giao nhận và tự động đồng bộ sang Đơn hàng"
                      >
                        <Edit size={13} />
                        <span>Cập nhật tiến trình</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang vận đơn */}
        <PortalPagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* 5. Modal Cập nhật tiến trình vận đơn */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveStatus} 
            className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Truck size={17} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Cập nhật tiến trình vận đơn
                  </h4>
                  <span className="text-[11px] font-mono text-blue-600 font-bold">
                    {editingShipment.trackingCode} (Đơn #{editingShipment.orderCode})
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingShipment(null)} 
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={17} />
              </button>
            </div>

            {/* Thông tin nhanh đơn hàng & bưu kiện */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Người nhận:</span>
                <strong className="text-slate-800">{editingShipment.recipientName} ({editingShipment.recipientPhone})</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Hãng vận chuyển:</span>
                <strong className="text-slate-800">{editingShipment.carrier}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Địa chỉ giao:</span>
                <span className="text-slate-700 truncate block">{editingShipment.shippingAddress}</span>
              </div>
            </div>

            {/* Chọn trạng thái vận đơn */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold">
                Chọn trạng thái vận đơn mới:
              </label>
              <select
                value={newStatus}
                onChange={(e) => {
                  const s = e.target.value as ShipmentStatus;
                  setNewStatus(s);
                  if ((s === 'DELIVERY_FAILED' || s === 'FAILED' || s === 'PICKUP_FAILED') && !failReason) {
                    setFailReason('Shipper đã liên hệ 3 lần trong 2 ngày nhưng số thuê bao không liên lạc được');
                  }
                }}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:border-blue-600 focus:outline-none"
              >
                <option value="PREPARING">1. Đang chuẩn bị hàng (⚡ Đồng bộ Đơn hàng: Đang chuẩn bị hàng)</option>
                <option value="PICKED_UP">2. Đã lấy hàng (⚡ Đồng bộ Đơn hàng: Đã lấy hàng)</option>
                <option value="IN_TRANSIT">3. Đang giao hàng (⚡ Đồng bộ Đơn hàng: Đang giao hàng)</option>
                <option value="DELIVERED">4. Giao thành công (⚡ Đồng bộ Đơn hàng: Hoàn tất & Thu COD)</option>
                <option value="DELIVERY_FAILED">5. Giao thất bại (⚡ Đồng bộ Đơn hàng: Đã hủy & Hoàn kho)</option>
              </select>
            </div>

            {/* Nhập lý do thất bại nếu chọn trạng thái fail */}
            {(newStatus === 'DELIVERY_FAILED' || newStatus === 'FAILED' || newStatus === 'PICKUP_FAILED') && (
              <div className="space-y-2 bg-rose-50/60 p-3.5 rounded-xl border border-rose-200">
                <label className="block text-rose-900 font-bold">
                  Lý do giao thất bại (fail_reason) (*):
                </label>
                
                {/* Gợi ý lý do nhanh */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <button
                    type="button"
                    onClick={() => setFailReason('Shipper đã liên hệ 3 lần trong 2 ngày nhưng số thuê bao không liên lạc được')}
                    className="px-2 py-1 bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 rounded-lg text-[10px] font-medium transition"
                  >
                    Không liên lạc được (3 lần)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFailReason('Khách hàng từ chối nhận máy khi shipper giao tới (Đổi ý không mua)')}
                    className="px-2 py-1 bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 rounded-lg text-[10px] font-medium transition"
                  >
                    Khách từ chối nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => setFailReason('Địa chỉ người nhận không chính xác, shipper không tìm thấy nhà')}
                    className="px-2 py-1 bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 rounded-lg text-[10px] font-medium transition"
                  >
                    Sai địa chỉ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFailReason('Khách hàng không chuẩn bị đủ tiền mặt thanh toán COD')}
                    className="px-2 py-1 bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 rounded-lg text-[10px] font-medium transition"
                  >
                    Không đủ tiền mặt
                  </button>
                </div>

                <textarea
                  required
                  rows={2}
                  placeholder="Nhập hoặc chỉnh sửa chi tiết nguyên nhân bưu tá ghi nhận..."
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-slate-800 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>
            )}

            {/* Banner cơ chế tự động đồng bộ */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed space-y-1">
              <strong className="flex items-center gap-1 font-bold text-blue-950">
                <Sparkles size={13} className="text-blue-600" />
                <span>Quy tắc đồng bộ hệ thống tự động:</span>
              </strong>
              <p>
                Trạng thái mới của vận đơn sẽ tự động cập nhật ngay lập tức sang <strong>Đơn hàng</strong>. Nếu chọn Lấy/Giao thất bại, đơn hàng tương ứng sẽ được tự động chuyển sang <strong>Đơn hàng bị hủy</strong> và giải phóng kho theo chuẩn nghiệp vụ.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-200">
              <button 
                type="button" 
                onClick={() => setEditingShipment(null)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                Lưu & Tự động đồng bộ
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
