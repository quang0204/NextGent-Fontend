import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { sharedStore } from '../../services/sharedStore';
import { inventoryService } from '../../services/inventoryService';
import { 
  PortalInventoryItem, 
  StockAdjustmentRecord, 
  StockMovementRecord 
} from '../../types/portal';
import { PortalPagination } from '../../components/portal/PortalPagination';
import { 
  Package, 
  AlertTriangle, 
  PlusCircle, 
  FileText, 
  Search, 
  CheckCircle, 
  History,
  TrendingDown,
  ShieldAlert,
  Printer,
  Eye
} from 'lucide-react';

export const PortalInventoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'adjustment' | 'movements'>('stock');

  const [inventories, setInventories] = useState<PortalInventoryItem[]>(sharedStore.getInventories());
  const [adjustments, setAdjustments] = useState<StockAdjustmentRecord[]>(sharedStore.getAdjustments());
  const [movements, setMovements] = useState<StockMovementRecord[]>(sharedStore.getMovements());

  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form kiểm kê state
  const [selectedSkuForAdj, setSelectedSkuForAdj] = useState(inventories[0]?.sku || '');
  const [actualCount, setActualCount] = useState<number>(15);
  const [adjReason, setAdjReason] = useState('Đếm nhầm / nhập liệu sai trong kỳ kiểm kê');
  const [adjDetailedReason, setAdjDetailedReason] = useState('');

  // Modal xem phiếu kiểm kê
  const [viewMb05Record, setViewMb05Record] = useState<StockAdjustmentRecord | null>(null);

  // API 5.1 & 5.5: Tải danh sách tồn kho biến thể từ Backend
  const loadInventories = useCallback(async () => {
    try {
      const res = await inventoryService.getInventories({
        page: 1,
        size: 100,
        keyword: searchTerm,
        lowStockOnly: filterLowStockOnly,
      });
      if (res?.content && res.content.length > 0) {
        setInventories(res.content);
      }
    } catch (err) {
      console.warn('[PortalInventoryView] loadInventories error', err);
    }
  }, [searchTerm, filterLowStockOnly]);

  // API 5.4: Tải sổ cái biến động kho từ Backend
  const loadTransactions = useCallback(async () => {
    try {
      const res = await inventoryService.getTransactions({ page: 1, size: 100 });
      if (res?.content && res.content.length > 0) {
        setMovements(res.content);
      }
    } catch (err) {
      console.warn('[PortalInventoryView] loadTransactions error', err);
    }
  }, []);

  useEffect(() => {
    loadInventories();
  }, [loadInventories]);

  useEffect(() => {
    if (activeTab === 'movements') {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  useEffect(() => {
    const unsubscribe = sharedStore.subscribe(() => {
      setInventories([...sharedStore.getInventories()]);
      setAdjustments([...sharedStore.getAdjustments()]);
      setMovements([...sharedStore.getMovements()]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (inventories.length > 0 && (!selectedSkuForAdj || !inventories.some(i => i.sku === selectedSkuForAdj))) {
      setSelectedSkuForAdj(inventories[0].sku);
      setActualCount(inventories[0].onHandQty);
    }
  }, [inventories, selectedSkuForAdj]);

  const currentInventoryItem = inventories.find(i => i.sku === selectedSkuForAdj) || inventories[0];
  const calculatedDiff = currentInventoryItem? actualCount - currentInventoryItem.onHandQty: 0;

  // Phân trang bảng tồn kho
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(10);

  // Phân trang nhật ký biến động kho
  const [movementPage, setMovementPage] = useState(1);
  const [movementPageSize, setMovementPageSize] = useState(10);

  // Lọc danh sách tồn kho
  const filteredInventories = useMemo(() => {
    return inventories.filter(item => {
      const matchSearch = (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchLowStock = filterLowStockOnly? (item.availableQty <= item.minThreshold): true;
      return matchSearch && matchLowStock;
    });
  }, [inventories, searchTerm, filterLowStockOnly]);

  const paginatedInventories = useMemo(() => {
    const start = (stockPage - 1) * stockPageSize;
    return filteredInventories.slice(start, start + stockPageSize);
  }, [filteredInventories, stockPage, stockPageSize]);

  const paginatedMovements = useMemo(() => {
    const start = (movementPage - 1) * movementPageSize;
    return movements.slice(start, start + movementPageSize);
  }, [movements, movementPage, movementPageSize]);

  useEffect(() => {
    setStockPage(1);
  }, [searchTerm, filterLowStockOnly]);

  // Xử lý tạo Phiếu điều chỉnh tồn kho kiểm kê (API 5.3: POST /api/v1/admin/inventories/adjustments)
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInventoryItem) return;

    const fullReason = `${adjReason}${adjDetailedReason? `: ${adjDetailedReason}`: ''}`;
    const res = await inventoryService.createStockAdjustment({
      variantId: currentInventoryItem.variantId,
      actualCount,
      reason: fullReason,
    });

    if (!res.success) {
      alert(res.message);
    } else {
      alert(res.message);
      setAdjDetailedReason('');
      setActiveTab('adjustment');
      setAdjustments([...sharedStore.getAdjustments()]);
      loadInventories();
      loadTransactions();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header Clean SaaS Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Quản trị Kho & Kiểm kê Tồn kho
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 font-mono">Kiểm kê</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm soát tồn khả dụng A = Q - R, chống bán vượt tồn và quản lý vết xuất nhập kho.
          </p>
        </div>

        {/* Formula Pill Badge */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white shadow-xs text-xs font-mono text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>A (Khả dụng) = Q (Thực tế) - R (Đã giữ)</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher Modern Pills */}
      <div className="flex bg-slate-200/60 p-1 rounded-2xl text-xs font-bold text-slate-600 max-w-lg shadow-inner">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'stock'? 'bg-white text-slate-900 shadow-xs': 'hover:text-slate-900'
          }`}
        >
          <span>Tồn kho SKU</span>
          <span className="px-1.5 py-0.2 rounded-md font-mono text-[10px] bg-slate-100 text-slate-600">
            {inventories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('adjustment')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'adjustment'? 'bg-white text-slate-900 shadow-xs': 'hover:text-slate-900'
          }`}
        >
          <span>Phiếu kiểm kê</span>
          <span className="px-1.5 py-0.2 rounded-md font-mono text-[10px] bg-slate-100 text-slate-600">
            {adjustments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'movements'? 'bg-white text-slate-900 shadow-xs': 'hover:text-slate-900'
          }`}
        >
          <span>Lịch sử biến động</span>
          <span className="px-1.5 py-0.2 rounded-md font-mono text-[10px] bg-slate-100 text-slate-600">
            {movements.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DANH SÁCH TỒN KHO THEO MÃ BIẾN THỂ SKU             */}
      {/* ========================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          
          {/* Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80 relative">
              <input
                type="text"
                placeholder="Tìm theo mã SKU, tên máy, màu sắc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs focus:bg-white focus:outline-none focus:border-blue-500 font-medium transition"
              />
              <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterLowStockOnly}
                  onChange={(e) => setFilterLowStockOnly(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                />
                <span className="flex items-center gap-1.5 text-amber-700 text-xs">
                  <AlertTriangle size={13} />
                  <span>Chỉ hiện SKU thấp hơn ngưỡng</span>
                </span>
              </label>

              <button
                onClick={() => setActiveTab('adjustment')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle size={14} />
                <span>Lập phiếu kiểm kê</span>
              </button>
            </div>
          </div>

          {/* Inventory Matrix Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200/80 tracking-wider">
                  <tr>
                    <th className="p-3.5">Mã SKU</th>
                    <th className="p-3.5">Tên sản phẩm & Cấu hình</th>
                    <th className="p-3.5 text-center">Tồn vật lý (Q)</th>
                    <th className="p-3.5 text-center">Đang giữ chỗ (R)</th>
                    <th className="p-3.5 text-center">Tồn khả dụng (A)</th>
                    <th className="p-3.5 text-center">Ngưỡng tối thiểu</th>
                    <th className="p-3.5 text-center">Tình trạng kho</th>
                    <th className="p-3.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInventories.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Không tìm thấy biến thể sản phẩm nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedInventories.map((item) => {
                      const isLowStock = item.availableQty <= item.minThreshold;
                      const isOutOfStock = item.availableQty <= 0;

                      return (
                        <tr key={item.sku} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-900 text-xs">
                            {item.sku}
                          </td>
                          <td className="p-3.5">
                            <strong className="text-slate-900 block text-xs">{item.productName}</strong>
                            <span className="text-[11px] text-slate-500">{item.color} • {item.romGb >= 1024? '1TB': `${item.romGb}GB`}</span>
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-700 tabular-nums text-xs">
                            {item.onHandQty}
                          </td>
                          <td className="p-3.5 text-center font-semibold text-amber-700 tabular-nums">
                            {item.reservedQty > 0? (
                              <span className="bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md font-mono text-[11px]">
                                {item.reservedQty}
                              </span>
                            ): <span className="text-slate-300">0</span>}
                          </td>
                          <td className="p-3.5 text-center font-black tabular-nums text-xs">
                            <span className={isOutOfStock? 'text-rose-600': isLowStock? 'text-amber-600': 'text-emerald-600'}>
                              {item.availableQty}
                            </span>
                          </td>
                          <td className="p-3.5 text-center text-slate-400 font-mono">
                            {item.minThreshold}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {isOutOfStock? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                HẾT HÀNG KHẢ DỤNG
                              </span>
                            ): isLowStock? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                <AlertTriangle size={11} />
                                SẮP HẾT HÀNG
                              </span>
                            ): (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                CÒN HÀNG
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedSkuForAdj(item.sku);
                                setActualCount(item.onHandQty);
                                setActiveTab('adjustment');
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg font-semibold text-[11px] transition border border-slate-200/80"
                              title="Lập phiếu kiểm kê điều chỉnh tồn cho SKU này"
                            >
                              Kiểm kê
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang danh sách tồn kho */}
            <PortalPagination
              currentPage={stockPage}
              totalItems={filteredInventories.length}
              pageSize={stockPageSize}
              onPageChange={setStockPage}
              onPageSizeChange={setStockPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: QUẢN LÝ PHIẾU ĐIỀU CHỈNH TỒN KHO KIỂM KÊ kiểm kê       */}
      {/* ========================================================= */}
      {activeTab === 'adjustment' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Form lập phiếu kiểm kê (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="text-blue-600" size={18} />
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Lập Phiếu điều chỉnh tồn kho
              </h3>
            </div>
            
            <p className="text-slate-500 text-xs">
              Sử dụng khi có chênh lệch giữa số lượng trên hệ thống và kết quả kiểm kê thực tế tại kho vật lý.
            </p>

            <form onSubmit={handleCreateAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn biến thể SKU cần điều chỉnh:</label>
                <select
                  value={selectedSkuForAdj}
                  onChange={(e) => {
                    setSelectedSkuForAdj(e.target.value);
                    const it = inventories.find(i => i.sku === e.target.value);
                    if (it) setActualCount(it.onHandQty);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800 font-mono"
                >
                  {inventories.map(inv => (
                    <option key={inv.sku} value={inv.sku}>
                      {inv.sku} - {inv.productName} ({inv.color})
                    </option>
                  ))}
                </select>
              </div>

              {currentInventoryItem && (
                <div className="p-3 bg-slate-50 rounded border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tồn hệ thống</span>
                    <strong className="text-slate-800 text-sm font-bold">{currentInventoryItem.onHandQty}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 block">Đang giữ chỗ</span>
                    <strong className="text-amber-700 text-sm font-bold">{currentInventoryItem.reservedQty}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Chênh lệch</span>
                    <strong className={`text-sm font-bold ${calculatedDiff > 0? 'text-blue-600': calculatedDiff < 0? 'text-rose-600': 'text-slate-600'}`}>
                      {calculatedDiff > 0? `+${calculatedDiff}`: calculatedDiff}
                    </strong>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số lượng đếm thực tế kiểm kê (Actual Qty):</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={actualCount}
                  onChange={(e) => setActualCount(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhóm lý do điều chỉnh (Bắt buộc):</label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800"
                >
                  <option value="Đếm nhầm / nhập liệu sai trong kỳ kiểm kê">Đếm nhầm / nhập liệu sai trong kỳ kiểm kê</option>
                  <option value="Hàng rơi vỡ, hư hỏng trong quá trình lưu kho">Hàng rơi vỡ, hư hỏng trong quá trình lưu kho</option>
                  <option value="Nhầm lẫn biến thể màu sắc / dung lượng khi nhập">Nhầm lẫn biến thể màu sắc / dung lượng khi nhập</option>
                  <option value="Hàng hoàn trả về kho trước đó chưa cập nhật kịp">Hàng hoàn trả về kho trước đó chưa cập nhật kịp</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diễn giải chi tiết đợt kiểm kê:</label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ số biên bản kiểm kê, khu vực kho..."
                  value={adjDetailedReason}
                  onChange={(e) => setAdjDetailedReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-sm transition"
              >
                Xác nhận & Cập nhật tồn kho (Ký duyệt)
              </button>
            </form>
          </div>

          {/* Danh sách các phiếu kiểm kê đã lập (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Danh sách Phiếu điều chỉnh kho đã ký duyệt</span>
              <span className="text-[11px] font-normal text-slate-400">({adjustments.length} phiếu)</span>
            </h3>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {adjustments.map((adj) => (
                <div key={adj.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="font-mono text-blue-700 font-black">{adj.formCode}</strong>
                      <span className="text-[10px] text-slate-400">{adj.createdAt}</span>
                    </div>
                    <div className="font-bold text-slate-800">{adj.productName}</div>
                    <div className="text-[11px] text-slate-500">
                      Lý do: <span className="text-slate-700">{adj.reason}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Thủ kho: {adj.performedBy}</div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                      adj.qtyDiff > 0? 'bg-blue-50 text-blue-700': 'bg-rose-50 text-rose-700'
                    }`}>
                      {adj.qtyDiff > 0? `+${adj.qtyDiff}`: adj.qtyDiff} máy
                    </span>
                    <button
                      onClick={() => setViewMb05Record(adj)}
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Eye size={12} />
                      <span>Xem phiếu kiểm kê</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LỊCH SỬ BIẾN ĐỘNG KHO BẤT BIẾN     */}
      {/* ========================================================= */}
      {activeTab === 'movements' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-xs text-slate-900 uppercase">
                Nhật ký Biến động kho bất biến
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ghi nhận mọi giao tác Xuất bán, Nhập hoàn  và Điều chỉnh kiểm kê. Không cho phép sửa hoặc xóa.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Mã biểu mẫu</th>
                  <th className="p-3">Mã SKU & Sản phẩm</th>
                  <th className="p-3">Loại nghiệp vụ</th>
                  <th className="p-3 text-center">Biến động</th>
                  <th className="p-3 text-center">Trước &rarr; Sau</th>
                  <th className="p-3">Lý do & Thủ kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {paginatedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                      Chưa có ghi nhận biến động kho nào.
                    </td>
                  </tr>
                ) : (
                  paginatedMovements.map((m) => (
                    <tr key={m.txnId} className="hover:bg-slate-50 font-sans">
                      <td className="p-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {m.performedAt}
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {m.formCode}
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-900 block font-mono">{m.sku}</strong>
                        <span className="text-[10px] text-slate-500">{m.productName}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.txnType === 'EXPORT'? 'bg-cyan-50 text-cyan-800 border border-cyan-200':
                          m.txnType === 'RETURN'? 'bg-emerald-50 text-emerald-800 border border-emerald-200':
                          m.txnType === 'ADJUST'? 'bg-purple-50 text-purple-800 border border-purple-200':
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {m.txnType}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span className={m.quantityChange > 0? 'text-emerald-600': 'text-rose-600'}>
                          {m.quantityChange > 0? `+${m.quantityChange}`: m.quantityChange}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono">
                        {m.qtyBefore} &rarr; {m.qtyAfter}
                      </td>
                      <td className="p-3 text-[11px] text-slate-600">
                        <div>{m.reason}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Thực hiện: {m.performedBy}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang lịch sử biến động kho */}
          <PortalPagination
            currentPage={movementPage}
            totalItems={movements.length}
            pageSize={movementPageSize}
            onPageChange={setMovementPage}
            onPageSizeChange={setMovementPageSize}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>
      )}

      {/* MODAL XEM CHI TIẾT PHIẾU kiểm kê */}
      {viewMb05Record && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={18} />
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  PHIẾU ĐIỀU CHỈNH TỒN KHO
                </h3>
              </div>
              <button onClick={() => setViewMb05Record(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-300 rounded-lg space-y-3 text-slate-800">
              <div className="flex justify-between items-start text-[11px] pb-2 border-b border-slate-300">
                <div>
                  <div className="font-bold uppercase">HỆ THỐNG BÁN LẺ THIẾT BỊ DI ĐỘNG NEXTGEN SMART TECH</div>
                  <div>Bộ phận: Quản lý Kho hàng</div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono">Mã phiếu: {viewMb05Record.formCode}</div>
                  <div>Thời điểm: {viewMb05Record.createdAt}</div>
                </div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-base font-bold uppercase">PHIẾU ĐIỀU CHỈNH TỒN KHO</h2>
                <span className="text-[11px] italic">(Cân đối số lượng kiểm kê thực tế)</span>
              </div>

              <table className="w-full text-left text-[11px] border border-slate-300 border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300">Mã SKU</th>
                    <th className="p-2 border-r border-slate-300">Tên sản phẩm</th>
                    <th className="p-2 border-r border-slate-300 text-center">SL hệ thống</th>
                    <th className="p-2 border-r border-slate-300 text-center">SL đếm thực tế</th>
                    <th className="p-2 text-center">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-r border-slate-300 font-mono font-bold">{viewMb05Record.sku}</td>
                    <td className="p-2 border-r border-slate-300">{viewMb05Record.productName}</td>
                    <td className="p-2 border-r border-slate-300 text-center">{viewMb05Record.qtySystem}</td>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">{viewMb05Record.qtyActual}</td>
                    <td className="p-2 text-center font-bold text-blue-700">
                      {viewMb05Record.qtyDiff > 0? `+${viewMb05Record.qtyDiff}`: viewMb05Record.qtyDiff}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-[11px] bg-white p-3 rounded border border-slate-200">
                <strong>Lý do điều chỉnh kiểm kê:</strong>
                <p className="mt-0.5 text-slate-700">{viewMb05Record.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center text-[10px] pt-4 border-t border-slate-200">
                <div>
                  <div className="font-bold uppercase">NGƯỜI LẬP PHIẾU</div>
                  <div className="text-slate-600 font-medium pt-6">{viewMb05Record.performedBy}</div>
                </div>
                <div>
                  <div className="font-bold uppercase">QUẢN TRỊ VIÊN PHÊ DUYỆT</div>
                  <div className="text-slate-600 font-medium pt-6">Nguyễn Thế Minh (Đã ký duyệt)</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>In phiếu kiểm kê</span>
              </button>
              <button
                onClick={() => setViewMb05Record(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded"
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
