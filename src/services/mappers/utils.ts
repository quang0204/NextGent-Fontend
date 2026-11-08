export type Rec = Record<string, unknown>;

export const asRec = (v: unknown): Rec | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : undefined;

export const num = (v: unknown, d = 0): number => {
  const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
};
export const optNum = (v: unknown): number | undefined => {
  const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v);
  return v === undefined || v === null || !Number.isFinite(n) ? undefined : n;
};
export const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v === undefined || v === null ? d : String(v));

/** Lay gia tri dau tien ton tai theo danh sach ten truong (backend co the dat ten khac nhau). */
export const pick = (o: Rec | undefined, ...keys: string[]): unknown => {
  if (!o) return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

/** data co the la mang hoac { items: [...] } (co phan trang). */
export function listOf(data: unknown): Rec[] {
  if (Array.isArray(data)) return data as Rec[];
  const r = asRec(data);
  if (r && Array.isArray(r.items)) return r.items as Rec[];
  if (r && Array.isArray(r.content)) return r.content as Rec[];
  return [];
}

export function totalPagesOf(data: unknown): number {
  const r = asRec(data);
  const p = asRec(r?.pagination);
  return Math.max(1, num(pick(p, 'totalPages') ?? pick(r, 'totalPages'), 1));
}

export const slugify = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** 0987654321 -> 098****321 */
export const maskPhone = (p: string): string => (/^\d{9,11}$/.test(p) ? `${p.slice(0, 3)}****${p.slice(-3)}` : p);
