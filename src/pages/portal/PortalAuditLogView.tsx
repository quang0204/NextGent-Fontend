import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Clock, 
  User, 
  FileText, 
  ArrowRight,
  Database,
  Lock
} from 'lucide-react';
import { sharedStore } from '../../services/sharedStore';
import { auditService } from '../../services/auditService';
import { PortalAuditLog } from '../../types/portal';
import { PortalPagination } from '../../components/portal/PortalPagination';

export const PortalAuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<PortalAuditLog[]>(sharedStore.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  useEffect(() => {
    auditService.getAdminAuditLogs({
      action: actionFilter !== 'ALL' ? actionFilter : undefined,
    }).then(res => {
      if (res?.items && res.items.length > 0) {
        setLogs(res.items);
      }
    }).catch(() => {});
  }, [actionFilter]);

  useEffect(() => {
    const unsubscribe = sharedStore.subscribe(() => {
      setLogs([...sharedStore.getAuditLogs()]);
    });
    return () => unsubscribe();
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = (log.performedBy || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.entityName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.entityId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchAction = actionFilter === 'ALL' || log.action === actionFilter || log.action.startsWith(actionFilter);
      return matchSearch && matchAction;
    });
  }, [logs, searchQuery, actionFilter]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter]);

  const formatActionLabel = (action: string) => {
    return action
      .replace('_MB01', '')
      .replace('_MB02', '')
      .replace('_MB03', '')
      .replace('_MB04', '')
      .replace('_MB05', '');
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'LOCK_USER':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RESTOCK':
      case 'RESTOCK_MB04':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'UPDATE_PRICE_POLICY':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'TRANSITION_ORDER':
      case 'TRANSITION_ORDER_MB03':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'STOCK_ADJUSTMENT':
      case 'STOCK_ADJUSTMENT_MB05':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'CREATE_ORDER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCEL_ORDER':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="text-blue-600" size={22} />
            Nhật ký Kiểm toán Hệ thống
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ghi vết bất biến toàn bộ hành vi tác động dữ liệu kho, đơn hàng, phân quyền và điều chỉnh giá (Không cho phép sửa/xóa)
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 text-xs">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span className="font-semibold">Chuẩn kiểm toán toàn vẹn dữ liệu</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, đối tượng hoặc mã phiếu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-medium">Hành vi (Action):</span>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả hành vi</option>
            <option value="CREATE_ORDER">CREATE_ORDER (Tạo đơn hàng & Giữ chỗ)</option>
            <option value="CANCEL_ORDER">CANCEL_ORDER (Hủy đơn & Hoàn giữ chỗ)</option>
            <option value="TRANSITION_ORDER">TRANSITION_ORDER (Xuất kho giao hàng)</option>
            <option value="RESTOCK">RESTOCK_ORDER (Nhập hoàn kho)</option>
            <option value="STOCK_ADJUSTMENT">STOCK_ADJUSTMENT (Phiếu kiểm kê)</option>
            <option value="UPDATE_PRICE_POLICY">UPDATE_PRICE_POLICY (Đổi giá / Khuyến mãi)</option>
            <option value="LOCK_USER">LOCK_USER (Khóa người dùng)</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Tài khoản thực hiện</th>
                <th className="py-3 px-4">Hành vi (Action)</th>
                <th className="py-3 px-4">Đối tượng</th>
                <th className="py-3 px-4">Giá trị trước</th>
                <th className="py-3 px-4">Giá trị mới / Diễn giải</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Không tìm thấy bản ghi kiểm toán phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr key={log.logId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {log.createdAt}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <User size={13} className="text-slate-400" />
                        <span>{log.performedBy}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${getActionBadgeColor(log.action)}`}>
                        {formatActionLabel(log.action)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                        <Database size={12} className="text-slate-400" />
                        <span>{log.entityName} #{log.entityId}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-[160px] truncate text-slate-500 font-mono text-[11px]" title={log.oldValue}>
                      {log.oldValue}
                    </td>

                    <td className="py-3 px-4 max-w-xs font-medium text-slate-800">
                      {log.newValue}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang nhật ký kiểm toán */}
        <PortalPagination
          currentPage={currentPage}
          totalItems={filteredLogs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};
