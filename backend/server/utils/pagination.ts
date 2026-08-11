import { Request } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Parse page / limit from query string with safe defaults.
 * - page  : default 1,  min 1
 * - limit : default 20, min 1, max 100
 */
export function parsePagination(req: Request): { page: number; limit: number; from: number; to: number } {
  const page  = Math.max(1, parseInt(String(req.query.page  || '1'),  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;
  return { page, limit, from, to };
}

/**
 * Build a standardised paginated response envelope.
 */
export function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
