import { describe, it, expect } from 'vitest';
import { PaginationParams, buildPaginationClause, buildPaginatedResponse } from './pagination';

describe('pagination - extended', () => {
  it('handles large page numbers', () => {
    const result = buildPaginatedResponse([], 100, { page: 100, pageSize: 10, sortDir: 'asc' });
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(true);
    expect(result.pagination.totalPages).toBe(10);
  });

  it('handles page size of 1', () => {
    const result = buildPaginatedResponse(['a'], 5, { page: 3, pageSize: 1, sortDir: 'asc' });
    expect(result.pagination.totalPages).toBe(5);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(true);
  });

  it('calculates offset for page 1', () => {
    const { offset } = buildPaginationClause({ page: 1, pageSize: 50, sortDir: 'asc' });
    expect(offset).toBe(0);
  });

  it('calculates offset for page 10', () => {
    const { offset } = buildPaginationClause({ page: 10, pageSize: 25, sortDir: 'asc' });
    expect(offset).toBe(225);
  });

  it('validates page size upper bound', () => {
    expect(PaginationParams.safeParse({ pageSize: 500 }).success).toBe(true);
    expect(PaginationParams.safeParse({ pageSize: 501 }).success).toBe(false);
  });

  it('validates page lower bound', () => {
    expect(PaginationParams.safeParse({ page: 1 }).success).toBe(true);
    expect(PaginationParams.safeParse({ page: 0 }).success).toBe(false);
    expect(PaginationParams.safeParse({ page: -1 }).success).toBe(false);
  });

  it('builds desc order clause', () => {
    const { orderBy } = buildPaginationClause({ page: 1, pageSize: 50, sortBy: 'value', sortDir: 'desc' });
    expect(orderBy.toLowerCase()).toContain('desc');
  });

  it('single page has no navigation', () => {
    const result = buildPaginatedResponse(['a', 'b', 'c'], 3, { page: 1, pageSize: 10, sortDir: 'asc' });
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(false);
    expect(result.pagination.totalPages).toBe(1);
  });
});
