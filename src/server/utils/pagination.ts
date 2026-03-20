import { z } from 'zod';

export const PaginationParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationParams = z.infer<typeof PaginationParams>;

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function buildPaginationClause(params: PaginationParams): {
  limit: number;
  offset: number;
  orderBy: string;
} {
  const limit = params.pageSize;
  const offset = (params.page - 1) * params.pageSize;
  const orderBy = params.sortBy
    ? `ORDER BY ${params.sortBy} ${params.sortDir}`
    : '';

  return { limit, offset, orderBy };
}

export function buildPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalItems / params.pageSize);

  return {
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      totalItems,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
