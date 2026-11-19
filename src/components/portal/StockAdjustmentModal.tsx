import React, { useState } from 'react';
import { Package, X, Loader2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

interface StockAdjustmentModalProps {
  variant: any | null;
  onClose: () => void;
  onSuccess: (variantId: number, actualCount: number) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  variant,
  onClose,
  onSuccess,
}) => {
  if (!variant) return null;

  const currentStock = variant.inventory?.onHandQty ?? variant.onHandQty ?? 0;
  const [actualCount, setActualCount] = useState<number>(currentStock);
  const [reason, setReason] = useState<string>('Kiểm kê định kỳ cân đối số lượng');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const diff = actualCount - currentStock;

  const handleSubmit = async () => {
    if (actualCount < 0) {
      alert('Số lượng tồn thực tế không được âm!');
      return;
    }
    const finalReason = reason === 'Lý do khác' ? customReason.trim() : reason.trim();
    if (!finalReason) {
      alert('Vui lòng nhập lý do điều chỉnh tồn kho!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await inventoryService.createStockAdjustment({
        variantId: variant.variantId,
        actualCount: actualCount,
        reason: finalReason,
      });

      if (res.success) {
        onSuccess(variant.variantId, actualCount);
        onClose();
      } else {
        alert(res.message || 'Lỗi khi cập nhật số lượng tồn kho!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Không thể kết nối đến máy chủ kho');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                Điều chỉnh tồn kho SKU
              </h3>
              <span className="text-[11px] font-mono text-indigo-600 font-bold">
                {variant.sku}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-[11px] text-slate-500 block">Biến thể:</span>
            <strong className="text-slate-800 text-xs block">
              {variant.variantName || variant.sku}
            </strong>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 block">Tồn kho hiện tại:</span>
              <strong className="text-base font-mono text-slate-900">
                {currentStock}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Chênh lệch:</span>
              <strong
                className={`text-base font-mono ${
                  diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500'
                }`}
              >
                {diff > 0 ? `+${diff}` : diff}
              </strong>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Số lượng tồn thực tế sau kiểm kê *:
            </label>
            <input
              type="number"
              min={0}
              value={actualCount}
              onChange={(e) => setActualCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Lý do điều chỉnh *:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-600 mb-2"
            >
              <option value="Kiểm kê định kỳ cân đối số lượng">Kiểm kê định kỳ cân đối số lượng</option>
              <option value="Hàng hỏng vỡ/lỗi linh kiện">Hàng hỏng vỡ/lỗi linh kiện</option>
              <option value="Sai lệch trong quá trình nhập kho">Sai lệch trong quá trình nhập kho</option>
              <option value="Trả hàng đối tác/nhà cung cấp">Trả hàng đối tác/nhà cung cấp</option>
              <option value="Lý do khác">Lý do khác...</option>
            </select>
            {reason === 'Lý do khác' && (
              <input
                type="text"
                placeholder="Nhập lý do cụ thể..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-600"
              />
            )}
          </div>
        </div>

        <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Đang cập nhật...</span>
              </>
            ) : (
              <span>Xác nhận điều chỉnh</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
