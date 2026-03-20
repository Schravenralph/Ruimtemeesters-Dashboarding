import { z } from 'zod';

// ── Chart Types ──────────────────────────────────────────────────────────────

export const ChartType = z.enum([
  'bar',
  'stacked-bar',
  'line',
  'pie',
  'radar',
  'table',
  'choropleth',
]);
export type ChartType = z.infer<typeof ChartType>;

// ── Geographic Levels ────────────────────────────────────────────────────────

export const GeoLevel = z.enum(['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt']);
export type GeoLevel = z.infer<typeof GeoLevel>;

export const GeoArea = z.object({
  code: z.string(),
  name: z.string(),
  level: GeoLevel,
  parentCode: z.string().nullable(),
  geometry: z.any().optional(), // GeoJSON geometry
});
export type GeoArea = z.infer<typeof GeoArea>;

// ── Data Dimensions ──────────────────────────────────────────────────────────

export const Dimension = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  values: z.array(z.object({
    key: z.string(),
    label: z.string(),
  })),
});
export type Dimension = z.infer<typeof Dimension>;

// ── Tile Configuration ───────────────────────────────────────────────────────

export const TileConfig = z.object({
  id: z.string(),
  title: z.string(),
  chartType: ChartType,
  dataSource: z.string(), // references a data endpoint or query key
  dimensions: z.array(z.string()).default([]),
  defaultGeoLevel: GeoLevel.default('gemeente'),
  description: z.string().optional(),
  config: z.record(z.unknown()).default({}), // chart-specific config
});
export type TileConfig = z.infer<typeof TileConfig>;

// ── Dashboard Theme ──────────────────────────────────────────────────────────

export const ThemeConfig = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  tiles: z.array(TileConfig),
  order: z.number().default(0),
  isSystem: z.boolean().default(true), // false = user-created
});
export type ThemeConfig = z.infer<typeof ThemeConfig>;

// ── Dashboard Layout ─────────────────────────────────────────────────────────

export const LayoutItem = z.object({
  i: z.string(), // tile id
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
});
export type LayoutItem = z.infer<typeof LayoutItem>;

export const DashboardLayout = z.object({
  id: z.string(),
  themeId: z.string(),
  userId: z.string().nullable(), // null = default layout
  items: z.array(LayoutItem),
});
export type DashboardLayout = z.infer<typeof DashboardLayout>;

// ── Period / Time Selection ──────────────────────────────────────────────────

export const PeriodSelection = z.object({
  year: z.number(),
  compareYear: z.number().nullable().default(null),
});
export type PeriodSelection = z.infer<typeof PeriodSelection>;

// ── Filter State ─────────────────────────────────────────────────────────────

export const FilterState = z.object({
  geoLevel: GeoLevel.default('land'),
  geoCode: z.string().default('NL'),
  period: PeriodSelection.default({ year: 2024, compareYear: null }),
  dimensions: z.record(z.string()).default({}),
  comparisonEnabled: z.boolean().default(false),
});
export type FilterState = z.infer<typeof FilterState>;

// ── Data Point ───────────────────────────────────────────────────────────────

export const DataPoint = z.object({
  geoCode: z.string(),
  geoName: z.string(),
  year: z.number(),
  dimension: z.string().optional(),
  dimensionValue: z.string().optional(),
  value: z.number(),
  label: z.string().optional(),
});
export type DataPoint = z.infer<typeof DataPoint>;

export const DataResponse = z.object({
  data: z.array(DataPoint),
  metadata: z.object({
    source: z.string(),
    unit: z.string().optional(),
    lastUpdated: z.string().optional(),
    totalRecords: z.number(),
  }),
});
export type DataResponse = z.infer<typeof DataResponse>;

// ── RBAC ─────────────────────────────────────────────────────────────────────

export const Role = z.enum(['admin', 'editor', 'viewer', 'guest']);
export type Role = z.infer<typeof Role>;

export const User = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: Role,
  organizationId: z.string().nullable(),
  attributes: z.record(z.string()).default({}), // for ABAC
  createdAt: z.string(),
});
export type User = z.infer<typeof User>;

// ── ABAC Policy ──────────────────────────────────────────────────────────────

export const PolicyEffect = z.enum(['allow', 'deny']);

export const PolicyCondition = z.object({
  field: z.string(),       // e.g. 'user.role', 'user.attributes.region', 'resource.themeId'
  operator: z.enum(['eq', 'neq', 'in', 'not_in', 'contains', 'gte', 'lte']),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});
export type PolicyCondition = z.infer<typeof PolicyCondition>;

export const AccessPolicy = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  effect: PolicyEffect,
  resource: z.string(),     // e.g. 'theme:*', 'dashboard:create', 'data:bevolking'
  conditions: z.array(PolicyCondition),
  priority: z.number().default(0), // higher = evaluated first
});
export type AccessPolicy = z.infer<typeof AccessPolicy>;

// ── Custom Dashboard ─────────────────────────────────────────────────────────

export const CustomDashboard = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tiles: z.array(TileConfig),
  layout: z.array(LayoutItem),
  shareToken: z.string().nullable().default(null),
  shareExpiresAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomDashboard = z.infer<typeof CustomDashboard>;

// ── API Request/Response Types ───────────────────────────────────────────────

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthResponse = z.object({
  token: z.string(),
  user: User,
});
export type AuthResponse = z.infer<typeof AuthResponse>;

export const DataQueryParams = z.object({
  source: z.string(),
  geoLevel: GeoLevel.optional(),
  geoCode: z.string().optional(),
  year: z.coerce.number().optional(),
  compareYear: z.coerce.number().optional(),
  dimension: z.string().optional(),
  dimensionValue: z.string().optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});
export type DataQueryParams = z.infer<typeof DataQueryParams>;

// ── Export ────────────────────────────────────────────────────────────────────

export const ExportFormat = z.enum(['pdf', 'excel', 'csv', 'png']);
export type ExportFormat = z.infer<typeof ExportFormat>;
