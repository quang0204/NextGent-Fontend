import React, { useState, useEffect } from 'react';
import { formatVND } from '../../components/common/PriceDisplay';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  ArrowUpRight,
  Package,
  Clock,
  Truck,
  HelpCircle,
  BarChart3,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { sharedStore } from '../../services/sharedStore';
import { paymentService, PaymentSummaryResponse } from '../../services/paymentService';

export const PortalDashboardView: React.FC = () => {
  const [orders, setOrders] = useState(sharedStore.getOrders());
  const [inventories, setInventories] = useState(sharedStore.getInventories());
  const [showAccountingRuleHelp, setShowAccountingRuleHelp] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryResponse | null>(null);

  useEffect(() => {
    paymentService.getPaymentSummary().then(res => {
      if (res) setPaymentSummary(res);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = sharedStore.subscribe(() => {
      setOrders([...sharedStore.getOrders()]);
      setInventories([...sharedStore.getInventories()]);
    });
    return () => unsubscribe();
  }, []);

  // NGUYÊN TẮC HẠCH TOÁN DOANH THU CHUẨN KHOÁ LUẬN:
  // 1. Doanh thu bán hàng chỉ được ghi nhận khi đơn đạt trạng thái HOÀN TẤT (Giao thành công & đã thu tiền).
  // 2. Khi phát sinh đổi trả/hoàn tiền -> ghi nhận một khoản GIẢM TRỪ DOANH THU.
  // 3. Doanh thu thuần = Doanh thu bán hàng - Giảm trừ đổi trả.
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');
  const grossRevenue = paymentSummary?.totalCollected ?? completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Giảm trừ do đổi trả (từ API 10.4)
  const returnDeduction = paymentSummary?.totalRefunded ?? 0; 
  const netRevenue = Math.max(0, grossRevenue - returnDeduction);

  const lowStockItems = inventories.filter(i => i.availableQty <= i.minThreshold);
  const outOfStockItems = inventories.filter(i => i.availableQty <= 0);

  // Thống kê phân loại đơn hàng
  const totalOrdersCount = orders.length;
  const completedCount = completedOrders.length;
  const shippingCount = orders.filter(o => o.status === 'SHIPPING').length;
  const processingCount = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'WAITING_CONFIRMATION').length;
  const cancelledCount = orders.filter(o => o.status === 'CANCELLED').length;

  const completedRate = totalOrdersCount > 0? Math.round((completedCount / totalOrdersCount) * 100): 0;
  const shippingRate = totalOrdersCount > 0? Math.round((shippingCount / totalOrdersCount) * 100): 0;
  const processingRate = totalOrdersCount > 0? Math.round((processingCount / totalOrdersCount) * 100): 0;
  const cancelRate = totalOrdersCount > 0? Math.round((cancelledCount / totalOrdersCount) * 100): 0;

  return (
    <div className="space-y-6">
      
      {/* Page Header Clean SaaS Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Tổng quan Doanh thu & Vận hành
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100/80 text-blue-700 font-mono">
              REAL-TIME
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chỉ số tài chính hạch toán theo đơn hoàn tất, trừ hàng đổi trả và giám sát vận hành thời gian thực.
          </p>
        </div>

        {/* Accounting Rule Pill / Modal Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAccountingRuleHelp(!showAccountingRuleHelp)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-xs transition"
          >
            <HelpCircle size={14} className="text-blue-600" />
            <span>Quy chuẩn hạch toán</span>
          </button>
        </div>
      </div>

      {/* Accounting Rule Detail Drawer / Card (Collapsible) */}
      {showAccountingRuleHelp && (
        <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 rounded-2xl text-xs text-slate-700 animate-in fade-in duration-200 shadow-xs relative">
          <button 
            onClick={() => setShowAccountingRuleHelp(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            ✕ Đóng
          </button>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <BarChart3 size={16} />
            </div>
            <div className="space-y-1">
              <strong className="text-slate-900 font-bold text-xs block">
                Nguyên tắc hạch toán doanh thu bán lẻ:
              </strong>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                • <strong>Doanh thu bán hàng (Gross):</strong> Chỉ ghi nhận khi đơn đạt mốc <em>Hoàn tất</em> (giao thành công & đã thu tiền). Các đơn đang chờ hoặc đang giao không tính vào doanh thu thực.<br />
                • <strong>Giảm trừ doanh thu:</strong> Khi phát sinh trả hàng hoàn tiền (biên bản hoàn tiền) trong hạn 7 ngày, hệ thống hạch toán giảm trừ tương ứng.<br />
                • <strong>Doanh thu thuần (Net):</strong> = <em>Doanh thu hoàn tất - Giảm trừ đổi trả</em> (Phương án được 66.7% chuyên gia đồng thuận trong khảo sát đề tài).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Doanh thu thuần */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-emerald-100 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 relative">
            <span className="font-semibold">Doanh thu thuần (Net)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight relative tabular-nums">
            {formatVND(netRevenue)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-2 relative">
            <span className="inline-flex items-center gap-0.5 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px]">
              <ArrowUpRight size={11} /> +12.5%
            </span>
            <span className="text-slate-400 font-normal">so với tháng trước</span>
          </div>
        </div>

        {/* Tổng doanh thu bán hàng */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-100 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 relative">
            <span className="font-semibold">Doanh thu Hoàn tất (Gross)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 tracking-tight relative tabular-nums">
            {formatVND(grossRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 relative flex items-center gap-1">
            <span className="font-bold text-slate-700">{completedCount}</span> đơn hàng giao thành công
          </div>
        </div>

        {/* Giảm trừ do Đổi trả */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-rose-100 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 relative">
            <span className="font-semibold">Giảm trừ đổi trả </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <RotateCcw size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight relative tabular-nums">
            -{formatVND(returnDeduction)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 relative">
            Hoàn tiền bảo hành máy lỗi 7 ngày
          </div>
        </div>

        {/* Cảnh báo tồn an toàn */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-amber-100 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 relative">
            <span className="font-semibold">Cảnh báo tồn an toàn</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight relative tabular-nums flex items-baseline gap-1.5">
            <span>{lowStockItems.length}</span>
            <span className="text-xs font-semibold text-slate-400">SKU dưới ngưỡng</span>
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-2 relative flex items-center gap-1">
            <ShieldAlert size={12} />
            <span>{outOfStockItems.length} SKU đã hết sạch tồn</span>
          </div>
        </div>

      </div>

      {/* Grid: Order Pipeline Performance & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Vận hành đơn hàng */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                Tiến trình Xử lý & Tỷ lệ Vận hành Đơn
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Giám sát tuần tự theo quy trình khép kín đặt hàng &rarr; giao vận hoàn tất
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg tabular-nums">
              Tổng {totalOrdersCount} đơn
            </span>
          </div>

          {/* Multi-segment Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${completedRate}%` }} 
                className="bg-emerald-500 h-full transition-all" 
                title={`Hoàn tất: ${completedRate}%`}
              />
              <div 
                style={{ width: `${shippingRate}%` }} 
                className="bg-blue-500 h-full transition-all" 
                title={`Đang giao: ${shippingRate}%`}
              />
              <div 
                style={{ width: `${processingRate}%` }} 
                className="bg-amber-400 h-full transition-all" 
                title={`Đang xử lý: ${processingRate}%`}
              />
              <div 
                style={{ width: `${cancelRate}%` }} 
                className="bg-rose-400 h-full transition-all" 
                title={`Đã hủy: ${cancelRate}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
              <span>0%</span>
              <span>Tỷ lệ hoàn thành mục tiêu vận hành: {completedRate}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Detailed Pipeline Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100/80">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Hoàn tất</span>
              <span className="text-xl font-black text-emerald-700 mt-0.5 block tabular-nums">{completedCount}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">{completedRate}% tổng số</span>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100/80">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Đang giao vận</span>
              <span className="text-xl font-black text-blue-700 mt-0.5 block tabular-nums">{shippingCount}</span>
              <span className="text-[10px] text-blue-600 font-semibold">Đã xuất kho</span>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100/80">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Đang xử lý</span>
              <span className="text-xl font-black text-amber-700 mt-0.5 block tabular-nums">{processingCount}</span>
              <span className="text-[10px] text-amber-600 font-semibold">Đơn mới</span>
            </div>

            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100/80">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Đã hủy / Hoàn</span>
              <span className="text-xl font-black text-rose-700 mt-0.5 block tabular-nums">{cancelledCount}</span>
              <span className="text-[10px] text-rose-600 font-semibold">{cancelRate}% tỷ lệ hủy</span>
            </div>

          </div>

          {/* Stepper Reference */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs space-y-2">
            <span className="font-bold text-slate-800 block text-[11px]">Nguyên tắc kiểm soát luồng:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                <span>Không được bỏ cóc bước (Strict sequence)</span>
              </div>
              <div className="flex items-center gap-2">
                <Package size={13} className="text-blue-600 flex-shrink-0" />
                <span>Giữ chỗ kho ngay khi đặt hàng thành công</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={13} className="text-cyan-600 flex-shrink-0" />
                <span>Xuất kho mới trừ tồn thực tế</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw size={13} className="text-rose-600 flex-shrink-0" />
                <span>Phiếu hoàn kho phân loại hoàn kho hoặc thanh lý</span>
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách cảnh báo tồn kho thấp */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle size={15} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                  Tồn kho dưới ngưỡng
                </h3>
                <p className="text-[10px] text-slate-400">Tự động cảnh báo khi A ≤ Min</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {lowStockItems.length} SKU
            </span>
          </div>

          <div className="space-y-2 max-h-84 overflow-y-auto pr-1">
            {lowStockItems.length === 0? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">Tất cả sản phẩm đều an toàn</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tồn khả dụng (A) đạt trên ngưỡng tối thiểu.</p>
              </div>
            ): (
              lowStockItems.map((item) => {
                const isZero = item.availableQty <= 0;
                return (
                  <div 
                    key={item.sku} 
                    className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                      isZero? 'bg-rose-50/40 border-rose-200': 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <strong className="text-slate-900 block font-bold text-xs truncate">{item.productName}</strong>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        SKU: <span className="font-semibold text-slate-700">{item.sku}</span> • {item.color}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-black block font-mono ${isZero? 'text-rose-600': 'text-amber-600'}`}>
                        {isZero? 'CẠN TỒN (0)': `Còn ${item.availableQty} máy`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Ngưỡng: {item.minThreshold}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
