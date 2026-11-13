import React from 'react';
import { useToastStore, ToastType } from '../../stores/toastStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />;
      case 'error':
        return <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />;
      case 'info':
      default:
        return <Info size={16} className="text-blue-600 flex-shrink-0" />;
    }
  };

  const getStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'error':
        return 'bg-rose-50 border-rose-200 text-rose-900';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full px-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-2.5 p-3 rounded-lg border shadow-lg text-xs font-medium transition-all transform translate-y-0 opacity-100 ${getStyle(
            toast.type
          )}`}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5">{getIcon(toast.type)}</span>
            <span className="leading-snug">{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
