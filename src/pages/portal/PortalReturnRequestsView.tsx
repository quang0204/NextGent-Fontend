import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { sharedStore } from '../../services/sharedStore';
import { returnService } from '../../services/returnService';
import { orderService } from '../../services/orderService';
import { PortalReturnRequest, ReturnRequestStatus } from '../../types/portal';
import { formatVND } from '../../components/common/PriceDisplay';
import { PortalPagination } from '../../components/portal/PortalPagination';
import { 
  RotateCcw, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  User, 
  Package, 
  Clock, 
  X,
  ShieldCheck
} from 'lucide-react';

export const PortalReturnRequestsView: React.FC = () => {
  const [returnRequests, setReturnRequests] = useState<PortalReturnRequest[]>(sharedStore.getReturnRequests());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReturnRequestStatus>('ALL');

  // Modals
  const [inspectingReq, setInspectingReq] = useState<PortalReturnRequest | null>(null);
  const [inspectionResult, setInspectionResult] = useState('');

  const [approvingReq, setApprovingReq] = useState<PortalReturnRequest | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);

  interface RestockItemSelection {
    variantId: number;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    maxQuantity: number;
    isSelected: boolean;
  }
  const [restockItemSelections, setRestockItemSelections] = useState<RestockItemSelection[]>([]);

  const [rejectingReq, setRejectingReq] = useState<PortalReturnRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // API 11.2: Quản lý danh sách yêu cầu đổi trả
  const loadAdminReturns = useCallback(async () => {
    try {
      const res = await returnService.getAdminReturns({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        orderCode: searchTerm.trim() || undefined,
      });
      if (res?.items) {
        setReturnRequests(res.items);
      }
    } catch {
      // fallback giữ nguyên state hiện có
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadAdminReturns();
  }, [loadAdminReturns]);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStartInspect = (req: PortalReturnRequest) => {
    setInspectingReq(req);
    setInspectionResult(req.inspectionResult || 'Kỹ thuật viên đã kiểm tra ngoại quan và chức năng phần cứng...');
  };

  const handleConfirmInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingReq || !inspectionResult.trim()) return;

    const note = inspectionResult.trim();
    setErrorBanner(null);
    const res = await returnService.inspectReturn(inspectingReq.returnId, {
      status: 'INSPECTING',
      inspectionResult: note,
    });
    const inspectedBy = res?.data?.inspectedBy || 'Nhân viên kỹ thuật';
    const inspectedAt = res?.data?.inspectedAt || new Date().toISOString();

    setReturnRequests(prev =>
      prev.map(r =>
        r.returnId === inspectingReq.returnId
          ? { ...r, status: 'INSPECTING', inspectionResult: note, inspectedBy, inspectedAt }
          : r
      )
    );
    showNotification(`Đã cập nhật biên bản thẩm định cho phiếu RMA-${inspectingReq.returnId}!`);
    setInspectingReq(null);
  };

  const handleStartApprove = async (req: PortalReturnRequest) => {
    setModalError(null);
    setApprovingReq(req);

    // Chuẩn bị danh sách sản phẩm để thẩm định nhập kho MB04
    let itemsToProcess = (req.items || []).filter(i => (i.quantity || 0) > 0);
    if (itemsToProcess.length === 0 && req.orderCode) {
      try {
        const origOrder = await orderService.getOrderByCode(req.orderCode);
        if (origOrder?.items) {
          itemsToProcess = origOrder.items.map(i => ({
            variantId: i.variantId,
            productName: i.productNameSnapshot || (i as any).productName || 'Sản phẩm',
            sku: i.skuSnapshot || (i as any).sku || '',
            quantity: i.quantity || 1,
            unitPrice: i.unitPrice || 0,
          }));
        }
      } catch (err) {
        console.warn('Cannot fetch original order items', err);
      }
    }

    const selections: RestockItemSelection[] = itemsToProcess.map(it => ({
      variantId: Number(it.variantId || 0),
      productName: it.productName,
      sku: it.sku,
      unitPrice: Number(it.unitPrice || 0),
      quantity: Number(it.quantity || 1),
      maxQuantity: Number(it.quantity || 1),
      isSelected: true,
    }));

    setRestockItemSelections(selections);
    const initialTotal = selections
      .filter(s => s.isSelected)
      .reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);
    setRefundAmount(initialTotal);
  };

  const handleToggleRestockItem = (index: number) => {
    setRestockItemSelections(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isSelected: !updated[index].isSelected };
      const newTotal = updated
        .filter(s => s.isSelected)
        .reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);
      setRefundAmount(newTotal);
      return updated;
    });
  };

  const handleRestockQuantityChange = (index: number, newQty: number) => {
    setRestockItemSelections(prev => {
      const updated = [...prev];
      const safeQty = Math.max(1, Math.min(newQty, updated[index].maxQuantity));
      updated[index] = { ...updated[index], quantity: safeQty };
      const newTotal = updated
        .filter(s => s.isSelected)
        .reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);
      setRefundAmount(newTotal);
      return updated;
    });
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingReq || isSubmitting) return;

    const activeRestock = restockItemSelections.filter(s => s.isSelected && s.variantId > 0 && s.quantity > 0);
    if (activeRestock.length === 0) {
      setModalError('Vui lòng chọn ít nhất 1 sản phẩm thực tế nhận lại để nhập hoàn kho MB04!');
      return;
    }

    // API 11.3: Biên bản kiểm định ngoại quan & Hoàn kho MB04 (APPROVED)
    setErrorBanner(null);
    setModalError(null);
    setIsSubmitting(true);
    try {
      const restockItems = activeRestock.map(i => ({ variantId: Number(i.variantId), quantity: i.quantity }));

      await returnService.inspectReturn(approvingReq.returnId, {
        status: 'APPROVED',
        inspectionResult: approvingReq.inspectionResult || 'Máy đủ điều kiện đổi trả theo chính sách 30 ngày.',
        refundAmount: refundAmount,
        restockItems,
      });

      setReturnRequests(prev =>
        prev.map(r =>
          r.returnId === approvingReq.returnId
            ? { ...r, status: 'APPROVED', refundAmount }
            : r
        )
      );
      showNotification(`Đã duyệt hoàn tiền ${formatVND(refundAmount)} & lập phiếu nhập kho MB04 cho RMA-${approvingReq.returnId}!`);
      setApprovingReq(null);
      loadAdminReturns();
    } catch (err: any) {
      const msg = err?.message || 'Không thể phê duyệt hoàn tiền cho phiếu đổi trả này.';
      setModalError(msg);
      setErrorBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReject = (req: PortalReturnRequest) => {
    setModalError(null);
    setRejectingReq(req);
    setRejectReason('Sản phẩm đã bị cấn móp hoặc mất tem niêm phong không đủ điều kiện đổi trả.');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq || !rejectReason.trim() || isSubmitting) return;

    // API 11.3: Biên bản kiểm định ngoại quan & Hoàn kho MB04 (REJECTED)
    setErrorBanner(null);
    setModalError(null);
    setIsSubmitting(true);
    try {
      await returnService.inspectReturn(rejectingReq.returnId, {
        status: 'REJECTED',
        inspectionResult: rejectingReq.inspectionResult || 'Biên bản kiểm tra ngoại quan từ chối bảo hành.',
        rejectReason: rejectReason.trim(),
      });

      setReturnRequests(prev =>
        prev.map(r =>
          r.returnId === rejectingReq.returnId
            ? { ...r, status: 'REJECTED', rejectReason: rejectReason.trim() }
            : r
        )
      );
      showNotification(`Đã từ chối yêu cầu đổi trả RMA-${rejectingReq.returnId}.`);
      setRejectingReq(null);
      loadAdminReturns();
    } catch (err: any) {
      const msg = err?.message || 'Không thể từ chối yêu cầu đổi trả này.';
      setModalError(msg);
      setErrorBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filtered = useMemo(() => {
    return returnRequests.filter((r) => {
      const matchSearch = 
        (r.orderCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.requestedBy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.phone || '').includes(searchTerm);
      if (!matchSearch) return false;
      if (statusFilter === 'ALL') return true;
      return r.status === statusFilter;
    });
  }, [returnRequests, searchTerm, statusFilter]);

  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const getStatusBadge = (status: ReturnRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="bg-attention/10 text-attention border border-attention/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Chờ tiếp nhận</span>;
      case 'INSPECTING':
        return <span className="bg-primary/10 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Đang giám định</span>;
      case 'APPROVED':
        return <span className="bg-success/10 text-success border border-success/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Đã duyệt hoàn tiền</span>;
      case 'REJECTED':
        return <span className="bg-critical/10 text-critical border border-critical/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Bác bỏ yêu cầu</span>;
      default:
        return <span className="bg-surface-soft text-steel px-2.5 py-0.5 rounded-full text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-deep flex items-center gap-2">
            <RotateCcw size={22} className="text-primary" />
            <span>Quản trị Yêu cầu Đổi trả & Hoàn hàng</span>
          </h2>
          <p className="text-xs text-steel mt-0.5">
            Quy trình tiếp nhận, kiểm định ngoại quan và phê duyệt hoàn tiền theo chính sách 30 ngày
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-success/10 border border-success/30 text-success rounded-xl text-xs flex items-center gap-2">
          <CheckCircle size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorBanner && (
        <div className="p-3 bg-critical/10 border border-critical/30 text-critical rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{errorBanner}</span>
          </div>
          <button type="button" onClick={() => setErrorBanner(null)} className="text-critical hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Tìm theo mã đơn (#DH...), tên khách, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-canvas border border-hairline-soft rounded-full text-xs text-ink placeholder:text-steel focus:border-2 focus:border-fb-blue focus:outline-none"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {(['ALL', 'PENDING', 'INSPECTING', 'APPROVED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                statusFilter === st? 'bg-ink-deep text-canvas': 'bg-canvas border border-hairline-soft text-charcoal hover:bg-surface-soft'
              }`}
            >
              {st === 'ALL' && 'Tất cả'}
              {st === 'PENDING' && 'Chờ xử lý'}
              {st === 'INSPECTING' && 'Đang giám định'}
              {st === 'APPROVED' && 'Đã duyệt'}
              {st === 'REJECTED' && 'Bác bỏ'}
            </button>
          ))}
        </div>
      </div>

      {/* Return Requests List */}
      <div className="space-y-4">
        {filtered.length === 0? (
          <div className="p-12 text-center text-xs text-steel bg-canvas border border-hairline-soft rounded-2xl">
            Không có yêu cầu đổi trả nào phù hợp điều kiện lọc.
          </div>
        ): (
          paginatedReturns.map((req) => (
            <div
              key={req.returnId}
              className="bg-canvas border border-hairline-soft rounded-2xl p-5 shadow-sticky space-y-4 text-xs"
            >
              {/* Row Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline-soft">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-ink-deep">
                    Phiếu RMA-#{req.returnId}
                  </span>
                  <span className="text-hairline">|</span>
                  <span className="text-steel">
                    Đơn hàng: <strong className="font-mono text-primary font-bold">#{req.orderCode}</strong>
                  </span>
                  {getStatusBadge(req.status)}
                  {req.isPartial && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                      Hoàn trả 1 phần
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-steel flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Gửi lúc: {new Date(req.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Customer & Reason (6 cols) */}
                <div className="md:col-span-6 space-y-2 bg-surface-soft/40 p-3.5 rounded-xl border border-hairline-soft/60">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-steel" />
                    <strong className="text-ink-deep">{req.requestedBy}</strong>
                    <span className="text-steel font-mono">({req.phone})</span>
                  </div>

                  <div className="text-charcoal leading-relaxed">
                    <strong className="text-ink-deep">Lý do đổi trả: </strong>
                    <span className="text-steel">{req.reason}</span>
                  </div>
                  {req.bankInfo?.bankName && (
                    <div className="text-[11px] bg-canvas p-2 rounded-lg border border-hairline-soft text-charcoal">
                      <strong className="text-ink-deep">TK hoàn tiền COD: </strong>
                      <span>{req.bankInfo.bankName} - <span className="font-mono font-semibold">{req.bankInfo.accountNumber}</span> ({req.bankInfo.accountHolder})</span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="pt-2 border-t border-hairline-soft/60 space-y-1">
                    <div className="text-[11px] font-bold text-charcoal">Sản phẩm yêu cầu đổi trả:</div>
                    {req.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span>{it.productName} ({it.sku}) x{it.quantity}</span>
                        <strong className="font-bold text-ink-deep">{formatVND(it.unitPrice * it.quantity)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Inspection & Outcome (6 cols) */}
                <div className="md:col-span-6 space-y-2.5 bg-surface-soft/40 p-3.5 rounded-xl border border-hairline-soft/60">
                  <div className="text-[11px] font-bold text-ink-deep flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-primary" />
                    <span>Biên bản thẩm định kỹ thuật (Inspection_Result):</span>
                  </div>

                  <div className="text-steel bg-canvas p-2.5 rounded-lg border border-hairline-soft leading-relaxed min-h-[60px]">
                    {req.inspectionResult? (
                      <div>
                        <p>{req.inspectionResult}</p>
                        <div className="text-[10px] text-steel/70 mt-1 pt-1 border-t border-hairline-soft">
                          Giám định bởi: <strong>{req.inspectedBy}</strong> lúc {req.inspectedAt? new Date(req.inspectedAt).toLocaleString('vi-VN'): '—'}
                        </div>
                      </div>
                    ): (
                      <span className="italic text-steel/70">Chưa có biên bản thẩm định ngoại quan / chức năng.</span>
                    )}
                  </div>

                  {(req.status === 'APPROVED' || (req.refundAmount !== undefined && req.refundAmount > 0)) && (
                    <div className="flex items-center justify-between text-xs font-bold text-success bg-success/5 p-2 rounded-lg border border-success/20">
                      <span>Số tiền hoàn trả khách hàng:</span>
                      <span className="text-sm font-mono">{formatVND(req.refundAmount || 0)}</span>
                    </div>
                  )}
                  {req.status !== 'APPROVED' && req.status !== 'REJECTED' && (req.orderTotalAmount !== undefined && req.orderTotalAmount > 0) && (
                    <div className="flex items-center justify-between text-xs font-bold text-primary bg-primary/5 p-2 rounded-lg border border-primary/20">
                      <span>{req.isPartial ? 'Giá trị sản phẩm yêu cầu hoàn tối đa:' : 'Giá trị đơn hàng có thể hoàn tối đa:'}</span>
                      <span className="text-sm font-mono">{formatVND(req.orderTotalAmount)}</span>
                    </div>
                  )}

                  {req.rejectReason && (
                    <div className="text-xs text-critical bg-critical/5 p-2 rounded-lg border border-critical/20">
                      <strong>Lý do từ chối: </strong> {req.rejectReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-hairline-soft">
                {req.status === 'PENDING' && (
                  <button
                    onClick={() => handleStartInspect(req)}
                    className="btn-secondary py-1.5 px-4 text-xs font-bold rounded-full text-primary border-primary/30 flex items-center gap-1.5"
                  >
                    <FileText size={14} />
                    <span>Lập biên bản thẩm định</span>
                  </button>
                )}

                {req.status === 'INSPECTING' && (
                  <>
                    <button
                      onClick={() => handleStartReject(req)}
                      className="btn-ghost py-1.5 px-4 text-xs font-bold text-critical hover:bg-critical/10 rounded-full"
                    >
                      Bác bỏ yêu cầu
                    </button>
                    <button
                      onClick={() => handleStartApprove(req)}
                      className="btn-marketing py-1.5 px-4 text-xs font-bold rounded-full flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      <span>Chấp thuận & Hoàn tiền </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {/* Phân trang danh sách yêu cầu đổi trả */}
        {filtered.length > 0 && (
          <div className="bg-canvas border border-hairline-soft rounded-2xl overflow-hidden shadow-sticky">
            <PortalPagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20]}
            />
          </div>
        )}
      </div>

      {/* Modal 1: Inspect */}
      {inspectingReq && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmInspect} className="max-w-md w-full bg-canvas border border-hairline-soft rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <h4 className="font-bold text-ink-deep text-sm">Ghi nhận biên bản thẩm định RMA-#{inspectingReq.returnId}</h4>
              <button type="button" onClick={() => setInspectingReq(null)} className="p-1 text-steel hover:text-ink">
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-steel font-medium mb-1">Kết quả giám định ngoại quan & tem seal:</label>
              <textarea
                required
                rows={4}
                value={inspectionResult}
                onChange={(e) => setInspectionResult(e.target.value)}
                className="w-full p-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-hairline-soft">
              <button type="button" onClick={() => setInspectingReq(null)} className="btn-ghost px-4 py-2 text-xs font-bold">
                Hủy
              </button>
              <button type="submit" className="btn-marketing px-5 py-2 text-xs font-bold rounded-full">
                Lưu kết quả giám định
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Approve & Refund */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmApprove} className="max-w-lg w-full bg-canvas border border-hairline-soft rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <h4 className="font-bold text-ink-deep text-sm">Chấp thuận đổi trả & Hoàn tiền</h4>
              <button type="button" onClick={() => setApprovingReq(null)} className="p-1 text-steel hover:text-ink">
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-critical/10 border border-critical/30 text-critical rounded-lg text-[11px] flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
            <p className="text-steel">
              Hệ thống sẽ hoàn tiền cho khách hàng và tự động sinh <strong>Biên bản nhập kho MB04</strong> cho các sản phẩm được tích chọn dưới đây.
            </p>

            {/* Danh sách sản phẩm thực tế nhận hoàn kho MB04 */}
            <div className="space-y-2 border border-hairline-soft rounded-xl p-3 bg-surface-soft/40">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-ink-deep">Sản phẩm thực tế nhận lại vào kho (MB04):</label>
                <span className="text-[10px] text-steel">Chọn đúng sản phẩm khách trả</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {restockItemSelections.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border transition-all ${
                      item.isSelected ? 'border-primary/50 bg-canvas shadow-xs' : 'border-hairline-soft opacity-60 bg-surface-soft/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={() => handleToggleRestockItem(idx)}
                          className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink-deep truncate">{item.productName}</div>
                          <div className="text-[11px] text-steel font-mono">
                            {item.sku} • {formatVND(item.unitPrice)}
                          </div>
                        </div>
                      </label>

                      {item.isSelected && item.maxQuantity > 1 ? (
                        <div className="flex items-center gap-1 shrink-0 bg-surface-soft border border-hairline-soft rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleRestockQuantityChange(idx, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-6 h-6 rounded bg-canvas hover:bg-hairline flex items-center justify-center font-bold text-xs disabled:opacity-40"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleRestockQuantityChange(idx, item.quantity + 1)}
                            disabled={item.quantity >= item.maxQuantity}
                            className="w-6 h-6 rounded bg-canvas hover:bg-hairline flex items-center justify-center font-bold text-xs disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        item.isSelected && <span className="text-xs font-mono font-bold text-ink-deep shrink-0">x1</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-steel font-medium">Số tiền hoàn trả (VNĐ):</label>
                <span className="text-[10px] text-steel">Tự động tính theo sản phẩm đã chọn</span>
              </div>
              <input
                type="number"
                min={0}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs font-mono font-bold focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-hairline-soft">
              <button type="button" onClick={() => setApprovingReq(null)} className="btn-ghost px-4 py-2 text-xs font-bold">
                Hủy
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-marketing px-5 py-2 text-xs font-bold rounded-full disabled:opacity-50">
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận hoàn tiền & Nhập kho'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Reject */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReject} className="max-w-md w-full bg-canvas border border-hairline-soft rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <h4 className="font-bold text-ink-deep text-sm">Từ chối yêu cầu đổi trả</h4>
              <button type="button" onClick={() => setRejectingReq(null)} className="p-1 text-steel hover:text-ink">
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-critical/10 border border-critical/30 text-critical rounded-lg text-[11px] flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
            <div>
              <label className="block text-steel font-medium mb-1">Lý do bác bỏ yêu cầu (*):</label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-hairline-soft">
              <button type="button" onClick={() => setRejectingReq(null)} className="btn-ghost px-4 py-2 text-xs font-bold">
                Đóng
              </button>
              <button type="submit" className="btn-danger px-5 py-2 text-xs font-bold rounded-full bg-critical text-on-primary">
                Bác bỏ yêu cầu
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
