import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  showToast: (message, type = 'success', duration) => {
    // Chống spam: Nếu thông báo giống hệt đang hiển thị thì không tạo toast trùng lặp
    const existing = get().toasts.find((t) => t.message === message);
    if (existing) {
      return;
    }

    const defaultDuration = (type === 'error' || type === 'warning') ? 4000 : 2500;
    const finalDuration = duration !== undefined ? duration : defaultDuration;
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, type, message, duration: finalDuration };

    // Giới hạn tối đa 2 toast hiển thị đồng thời để không che màn hình hoặc giật layout
    set((state) => {
      const trimmed = state.toasts.length >= 2 ? state.toasts.slice(-1) : state.toasts;
      return { toasts: [...trimmed, newToast] };
    });

    if (finalDuration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, finalDuration);
    }
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
