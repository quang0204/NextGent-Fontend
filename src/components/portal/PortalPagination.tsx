import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PortalPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const PortalPagination: React.FC<PortalPaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 8, 10, 20, 50],
  className = ''
}) => {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Tính danh sách các số trang hiển thị
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 ${className}`}>
      {/* Thông tin số lượng & Chọn kích thước trang */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-slate-500 font-medium">
          Hiển thị <strong className="text-slate-900 font-bold">{startItem}</strong> – <strong className="text-slate-900 font-bold">{endItem}</strong> trên <strong className="text-slate-900 font-bold">{totalItems}</strong> kết quả
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg py-1 px-2 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}/trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Điều khiển chuyển trang */}
      {totalPages >= 1 && (
        <div className="flex items-center gap-1">
          {/* Về trang đầu */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Trang đầu"
          >
            <ChevronsLeft size={14} />
          </button>

          {/* Trang trước */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Trang trước"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Danh sách trang */}
          <div className="flex items-center gap-1 px-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none">
                    ...
                  </span>
                );
              }
              const pageNum = Number(p);
              const isActive = pageNum === safeCurrentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Trang sau */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Trang sau"
          >
            <ChevronRight size={14} />
          </button>

          {/* Đến trang cuối */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safeCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Trang cuối"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
