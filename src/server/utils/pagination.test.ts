import { describe, it, expect } from 'vitest';
import { PaginationParams, buildPaginationClause, buildPaginatedResponse } from './pagination';

describe('pagination', () => {
  describe('PaginationParams', () => {
    it('uses defaults', () => {
      const result = PaginationParams.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.sortDir).toBe('asc');
    });

    it('coerces strings', () => {
      const result = PaginationParams.parse({ page: '3', pageSize: '25' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
    });

    it('rejects page < 1', () => {
      expect(PaginationParams.safeParse({ page: 0 }).success).toBe(false);
    });

    it('caps pageSize at 500', () => {
      expect(PaginationParams.safeParse({ pageSize: 501 }).success).toBe(false);
    });
  });

  describe('buildPaginationClause', () => {
    it('calculates offset correctly', () => {
      const result = buildPaginationClause({ page: 3, pageSize: 25, sortDir: 'asc' });
      expect(result.offset).toBe(50);
      expect(result.limit).toBe(25);
    });

    it('builds order clause when sortBy provided', () => {
      const result = buildPaginationClause({ page: 1, pageSize: 50, sortBy: 'name', sortDir: 'desc' });
      expect(result.orderBy).toBe('ORDER BY name desc');
    });

    it('returns empty orderBy without sortBy', () => {
      const result = buildPaginationClause({ page: 1, pageSize: 50, sortDir: 'asc' });
      expect(result.orderBy).toBe('');
    });
  });

  describe('buildPaginatedResponse', () => {
    it('calculates pagination correctly', () => {
      const result = buildPaginatedResponse(['a', 'b', 'c'], 100, { page: 2, pageSize: 10, sortDir: 'asc' });
      expect(result.pagination.totalPages).toBe(10);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('first page has no prev', () => {
      const result = buildPaginatedResponse([], 50, { page: 1, pageSize: 10, sortDir: 'asc' });
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('last page has no next', () => {
      const result = buildPaginatedResponse([], 50, { page: 5, pageSize: 10, sortDir: 'asc' });
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('handles empty result', () => {
      const result = buildPaginatedResponse([], 0, { page: 1, pageSize: 10, sortDir: 'asc' });
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });
  });
});
