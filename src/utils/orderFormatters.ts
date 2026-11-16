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
