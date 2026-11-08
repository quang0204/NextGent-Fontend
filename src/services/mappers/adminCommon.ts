// Tiện ích dùng chung cho các mapper/service quản trị của AI-3 (không phụ thuộc giao diện).
import { asRec, listOf, num, pick, type Rec } from './utils';

/** Kết quả thao tác ghi: giữ cùng dạng { success, message } mà sharedStore đang trả về. */
export interface ServiceResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

/** Trang dữ liệu đã quy về dạng dùng trong giao diện (page bắt đầu từ 1). */
export interface AdminPage<T> {
  items: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}

/**
 * Backend trả PageResponse { content, page, size, totalPages, totalElements, hasNext }.
 * Vẫn chấp nhận dạng { items, pagination } trong đặc tả.
 */
export function mapPage<T>(data: unknown, mapItem: (r: Rec) => T): AdminPage<T> {
  const r = asRec(data);
  const p = asRec(r?.pagination);
  const items = listOf(data).map(mapItem);
  const page = Math.max(1, num(pick(p, 'page') ?? pick(r, 'page'), 1));
  const totalPages = Math.max(1, num(pick(p, 'totalPages') ?? pick(r, 'totalPages'), 1));
  const hasNextRaw = pick(p, 'hasNext') ?? pick(r, 'hasNext');
  return {
    items,
    page,
    size: num(pick(p, 'size') ?? pick(r, 'size'), items.length),
    totalPages,
    totalElements: num(pick(p, 'totalElements', 'totalItems') ?? pick(r, 'totalElements', 'totalItems'), items.length),
    hasNext: typeof hasNextRaw === 'boolean' ? hasNextRaw : page < totalPages,
  };
}

/** Lấy hết các trang (backend giới hạn size tối đa 100) để thay cho hàm sharedStore.getXxx() trả về mảng. */
export async function fetchAllPages<T>(
  loadPage: (page: number, size: number) => Promise<AdminPage<T>>,
  size = 100,
  maxPages = 20
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await loadPage(page, size);
    rows.push(...res.items);
    if (!res.hasNext || page >= res.totalPages) break;
  }
  return rows;
}

/** Thông báo thành công do backend trả về (nếu có). */
export const bodyMessage = (body: unknown, fallback: string): string =>
  asRec(body)?.message && typeof asRec(body)?.message === 'string' ? (asRec(body)!.message as string) : fallback;

// ---------------------------------------------------------------------------
// Ngày giờ
// ---------------------------------------------------------------------------
const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Backend trả thời điểm dạng ISO instant (…Z). Giao diện đang hiển thị chuỗi thô, nên đổi sang giờ địa phương:
 *  - sep ' ' => "2026-10-23 12:00" (giống dữ liệu mẫu của kho)
 *  - sep 'T' => "2026-10-23T12:00" (giao diện khuyến mãi tự thay 'T' bằng khoảng trắng khi hiển thị)
 */
export function formatLocalDateTime(v: unknown, sep: ' ' | 'T' = ' '): string {
  if (typeof v !== 'string' || v.trim() === '') return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${sep}${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO instant -> "2026-12-31" theo giờ địa phương (dùng cho voucher, giao diện nhập bằng ô ngày). */
export function formatLocalDate(v: unknown): string {
  const s = formatLocalDateTime(v, 'T');
  return s.includes('T') ? s.split('T')[0] : s;
}

/**
 * Chuẩn hóa chuỗi ngày giờ gửi lên backend (chấp nhận Instant có 'Z' hoặc ISO_LOCAL_DATE_TIME):
 *  "2026-12-31" -> "2026-12-31T00:00:00" (hoặc T23:59:59 nếu là mốc kết thúc)
 *  "2026-12-31T08:30" -> "2026-12-31T08:30:00"
 */
export function toBackendDateTime(v: string, endOfDay = false): string {
  const s = (v ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}${endOfDay ? 'T23:59:59' : 'T00:00:00'}`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) return toBackendDateTime(s.replace(' ', 'T'), endOfDay);
  return s;
}

/** Ngày YYYY-MM-DD dùng làm bộ lọc (backend yêu cầu đúng định dạng này). */
export const toDateOnly = (v: string): string => (v ?? '').trim().slice(0, 10);
