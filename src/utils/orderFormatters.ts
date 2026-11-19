/**
 * Utilities for formatting order-related data across customer & portal views
 */

export const cleanLogNote = (note?: string): string => {
  if (!note) return '';
  return note
    .replace(/\{"success":\s*true,\s*"data":\s*\{"status":\s*"INSPECTING"[^}]*\}\}/gi, 'Đang thẩm định ngoại quan & chức năng')
    .replace(/\{"success":\s*true[^}]*\}/gi, '')
    .replace(/\{"status":\s*"INSPECTING"[^}]*\}/gi, 'Đang thẩm định ngoại quan & chức năng')
    .replace(/\[Yêu cầu hoàn trả một phần:[^\]]*\]/gi, '')
    .trim();
};

export const normalizeOrderCode = (orderCode?: string): string => {
  if (!orderCode) return '';
  return orderCode.trim().replace(/^#/, '');
};

export const formatOrderRom = (it: any): string => {
  if (it?.romSnapshot && it.romSnapshot !== 'undefinedGB' && it.romSnapshot !== '0GB') {
    return String(it.romSnapshot);
  }
  const romVal = Number(it?.romGb || 0);
  return romVal > 0 ? `${romVal}GB` : '';
};

export const RETURN_POLICY_DAYS = 30; // Chính sách đổi trả sản phẩm trong vòng 30 ngày kể từ khi nhận hàng

export interface ReturnTimeEligibility {
  isEligible: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  expired: boolean;
  completedTimeFormatted?: string;
}

export const getOrderReturnTimeEligibility = (order: any): ReturnTimeEligibility => {
  if (!order || order.status !== 'COMPLETED') {
    return { isEligible: false, daysRemaining: 0, hoursRemaining: 0, expired: false };
  }

  let completedMs: number | null = null;
  if (order.completedAt) {
    const t = new Date(order.completedAt).getTime();
    if (!isNaN(t)) completedMs = t;
  }
  if (!completedMs && order.statusHistory) {
    const compEvent = order.statusHistory.find((h: { status?: string }) => h.status === 'COMPLETED');
    if (compEvent && compEvent.time) {
      const timeStr = String(compEvent.time);
      const match = timeStr.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, h, m, s, d, mo, y] = match;
        const parsed = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(m), Number(s)).getTime();
        if (!isNaN(parsed)) completedMs = parsed;
      } else {
        const parsed = new Date(timeStr).getTime();
        if (!isNaN(parsed)) completedMs = parsed;
      }
    }
  }
  if (!completedMs) {
    const parsed = order.updatedAt ? new Date(order.updatedAt).getTime() : (order.createdAt ? new Date(order.createdAt).getTime() : Date.now());
    completedMs = isNaN(parsed) ? Date.now() : parsed;
  }

  const deadlineMs = completedMs + RETURN_POLICY_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diffMs = deadlineMs - now;

  if (diffMs <= 0) {
    return { isEligible: false, daysRemaining: 0, hoursRemaining: 0, expired: true };
  }

  const daysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  const hoursRemaining = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return {
    isEligible: true,
    daysRemaining,
    hoursRemaining,
    expired: false,
    completedTimeFormatted: new Date(completedMs).toLocaleDateString('vi-VN'),
  };
};
