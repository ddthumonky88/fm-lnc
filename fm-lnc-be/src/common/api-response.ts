import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Chi tiết lỗi trả về trong envelope khi `success = false`.
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  validationErrors: string | null;
}

/**
 * Dữ liệu phân trang chuẩn: nằm trong `data` của envelope.
 */
export interface PageData<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  first: boolean;
  last: boolean;
}

/**
 * Envelope chuẩn cho mọi response JSON của API.
 */
export interface ApiResponseBody<T = unknown> {
  status: number;
  success: boolean;
  message: string;
  data: T | null;
  error: ApiErrorBody | null;
  timestamp: number;
  path: string;
  correlationId: string;
}

export function buildPageData<T>(
  content: T[],
  page: number,
  size: number,
  totalElements: number,
): PageData<T> {
  const totalPages = Math.ceil(totalElements / size);
  const first = page === 0;
  const last = totalPages === 0 || page >= totalPages - 1;
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    hasPrevious: !first,
    hasNext: !last,
    first,
    last,
  };
}

export function isPageData(value: unknown): value is PageData<unknown> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.content) && typeof v.totalElements === 'number';
}

/**
 * Lấy correlationId từ header request (nếu client gửi), ngược lại sinh mới.
 * Đồng thời gắn lại vào response header để client truy vết.
 */
export function resolveCorrelationId(req: Request, res: Response): string {
  const fromRes = res.getHeader(CORRELATION_ID_HEADER);
  if (typeof fromRes === 'string' && fromRes) return fromRes;

  const fromReq = req.headers?.[CORRELATION_ID_HEADER];
  const id =
    (Array.isArray(fromReq) ? fromReq[0] : fromReq) || randomUUID();

  if (!res.headersSent) {
    res.setHeader(CORRELATION_ID_HEADER, id);
  }
  return id;
}
