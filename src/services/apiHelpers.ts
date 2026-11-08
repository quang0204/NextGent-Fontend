// Tien ich dung chung cho cac service goi API that. Khong phu thuoc giao dien.

/** Co phien dang nhap (apiClient luu token o localStorage voi khoa access_token). */
export const hasSession = (): boolean => {
  try { return !!localStorage.getItem('access_token'); } catch { return false; }
};

/**
 * Cho phep dung du lieu mau (sharedStore) khi goi API loi. Mac dinh BAT de giu nguyen hanh vi cu cua giao dien.
 * Dat VITE_ENABLE_MOCK_FALLBACK=false trong .env de tat va nhin thay loi that tu backend.
 */
export const mockFallbackEnabled = (): boolean =>
  String(import.meta.env?.VITE_ENABLE_MOCK_FALLBACK ?? 'true') !== 'false';

/** Lay phan `data` cua phan hoi { success, statusCode, message, data }; neu khong co phong bi thi tra ve nguyen body. */
export function unwrapData<T = unknown>(body: unknown): T {
  if (body && typeof body === 'object' && 'success' in (body as object) && 'data' in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export const httpStatus = (e: unknown): number =>
  (e as { response?: { status?: number } } | null)?.response?.status ?? 0;

/** Mat ket noi (status 0) hoac loi may chu (5xx): coi la backend chua san sang. */
export const isBackendDown = (e: unknown): boolean => {
  const s = httpStatus(e);
  return s === 0 || s >= 500;
};

/** Thong bao tieng Viet do backend tra ve (neu co). */
export const serverMessage = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } } | null)?.response?.data?.message || fallback;

export function warnFallback(scope: string, e: unknown): void {
  if (import.meta.env?.DEV) console.warn(`[API] ${scope} loi (HTTP ${httpStatus(e)}) - dung du lieu mau`, e);
}

/** Ket qua cua cac thao tac ghi: khong nem loi, tra ve thong bao tieng Viet cua backend de giao dien hien thi. */
export interface ServiceResult<T = undefined> {
  success: boolean;
  message: string;
  /** Ten ma loi cua backend (ErrorCode.name(), vd DUPLICATE_PHONE) - de giao dien phan nhanh neu can. */
  code?: string;
  data?: T;
}

/** Ten ma loi backend tra ve trong truong `error` cua phan hoi that bai. */
export const errorCodeOf = (e: unknown): string | undefined =>
  (e as { response?: { data?: { error?: string } } } | null)?.response?.data?.error;
