import { hasSession, httpStatus, isBackendDown, mockFallbackEnabled, serverMessage, warnFallback } from '../apiHelpers';
import { asRec, listOf, num, pick, type Rec } from './utils';

/** Trang du lieu quan tri (phan trang 1-based theo backend). */
export interface AdminPage<T> {
  rows: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}

/** Backend tra PageResponse { content, ... } hoac { items, ... }; ca hai deu duoc doc o day. */
export function mapAdminPage<T>(data: unknown, mapRow: (r: Rec) => T): AdminPage<T> {
  const r = asRec(data);
  const rows = listOf(data).map(mapRow);
  const page = Math.max(1, num(pick(r, 'page'), 1));
  const totalPages = Math.max(1, num(pick(r, 'totalPages'), 1));
  return {
    rows,
    page,
    size: num(pick(r, 'size'), rows.length),
    totalPages,
    totalElements: num(pick(r, 'totalElements', 'total'), rows.length),
    hasNext: pick(r, 'hasNext') === true || page < totalPages,
  };
}

/** Bo cac tham so rong / undefined truoc khi gui len query string. */
export function cleanParams(p: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/** Dung cho endpoint CHUA co backend: 404/405/501 coi nhu endpoint chua trien khai. */
export const isMissingEndpoint = (e: unknown): boolean => {
  const s = httpStatus(e);
  return s === 404 || s === 405 || s === 501;
};

/**
 * Chay API that; neu khong co phien dang nhap hoac backend chua san sang thi dung du lieu mau (khi
 * VITE_ENABLE_MOCK_FALLBACK != false). Loi nghiep vu (4xx) duoc nem lai kem thong bao tieng Viet cua backend.
 * missingEndpoint = true cho API chua co backend (404/405/501 cung roi ve du lieu mau).
 */
export async function withMock<T>(
  scope: string,
  real: () => Promise<T>,
  mock: () => T,
  opts?: { missingEndpoint?: boolean; errorMessage?: string },
): Promise<T> {
  if (!hasSession() && mockFallbackEnabled()) return mock();
  try {
    return await real();
  } catch (e) {
    if (mockFallbackEnabled() && (isBackendDown(e) || (opts?.missingEndpoint && isMissingEndpoint(e)))) {
      warnFallback(scope, e);
      return mock();
    }
    throw new Error(serverMessage(e, opts?.errorMessage ?? 'Thao tac that bai, vui long thu lai.'));
  }
}

/** Phan trang phia client cho du lieu mau (page 1-based). */
export function paginateRows<T>(all: T[], page = 1, size = 10): AdminPage<T> {
  const p = Math.max(1, page);
  const s = Math.max(1, size);
  const totalPages = Math.max(1, Math.ceil(all.length / s));
  return { rows: all.slice((p - 1) * s, p * s), page: p, size: s, totalPages, totalElements: all.length, hasNext: p < totalPages };
}

/** Thong bao `message` trong phan hoi { success, message, data }. */
export const bodyMessage = (body: unknown, fallback: string): string => {
  const m = (body as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m.trim() ? m : fallback;
};
