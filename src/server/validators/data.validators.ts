import { z } from 'zod';

/**
 * Validation schemas for data-related operations.
 * Used by controllers and import services to ensure data integrity.
 */

export const BevolkingRow = z.object({
  geo_code: z.string().min(1),
  year: z.coerce.number().int().min(1900).max(2100),
  age_group: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  value: z.coerce.number().int().min(0),
});

export const HuishoudensRow = z.object({
  geo_code: z.string().min(1),
  year: z.coerce.number().int().min(1900).max(2100),
  household_type: z.string().nullable().optional(),
  value: z.coerce.number().int().min(0),
});

export const WoningenRow = z.object({
  geo_code: z.string().min(1),
  year: z.coerce.number().int().min(1900).max(2100),
  tenure_type: z.string().nullable().optional(),
  dwelling_type: z.string().nullable().optional(),
  value: z.coerce.number().int().min(0),
});

export const WoningtekortRow = z.object({
  geo_code: z.string().min(1),
  year: z.coerce.number().int().min(1900).max(2100),
  metric: z.string().min(1),
  value: z.coerce.number(),
});

export const GeoAreaInput = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  level: z.enum(['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt']),
  parentCode: z.string().nullable().optional(),
});

export const DataRowSchemas: Record<string, z.ZodSchema> = {
  bevolking: BevolkingRow,
  huishoudens: HuishoudensRow,
  woningen: WoningenRow,
  woningtekort: WoningtekortRow,
};
