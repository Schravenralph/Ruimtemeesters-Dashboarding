import { z } from 'zod';

// ── Chart Types ──────────────────────────────────────────────────────────────

export const ChartType = z.enum([
  'bar',
  'stacked-bar',
  'horizontal-bar',
  'line',
  'stacked-area',
  'pie',
  'donut',
  'radar',
  'table',
  'color-table',
  'number',
  'treemap',
  'heatmap',
  'waterfall',
  'choropleth',
  'pyramid',
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

// SPEC-C: per-theme KPI strip descriptors. Each entry → one NumberDisplay tile
// in the gemeente-drilldown KPI strip.
export const ThemeKpiEntry = z.object({
  label: z.string(),
  dataSource: z.string(),
  dimension: z.string().optional().nullable(),
  dimensionValue: z.string().optional().nullable(),
  // Multi-bin sum: fire one query per value and sum the result + references
  // element-wise. Used e.g. for "65+ jaar" = 65-74 + 75+.
  // Linear aggregates only — incompatible with percentiles/envelopes.
  dimensionValues: z.array(z.string()).optional().nullable(),
  format: z.enum(['number', 'compact', 'percent']).optional(),
  deltaDirection: z.enum(['higher-is-good', 'higher-is-bad', 'neutral']).optional(),
});
export type ThemeKpiEntry = z.infer<typeof ThemeKpiEntry>;

export const ThemeConfig = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  tiles: z.array(TileConfig),
  order: z.number().default(0),
  isSystem: z.boolean().default(true),
  supercategory: z.string().optional(),
  isOverview: z.boolean().optional(),
  kpiConfig: z.array(ThemeKpiEntry).optional().default([]),
  // ADR-003 per-theme cohort default. Wonen → woningmarktregio, others → populatiegrootte.
  // Set as a typed column on themes (migration 029), exposed here as a string to avoid
  // forward references; downstream code may parse via CohortType.parse() if needed.
  defaultCohortType: z.string().default('populatiegrootte'),
});
export type ThemeConfig = z.infer<typeof ThemeConfig>;

// ── Supercategory ─────────────────────────────────────────────────────────────

export const Supercategory = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  sortOrder: z.number(),
  themes: z.array(z.object({
    slug: z.string(),
    name: z.string(),
    isOverview: z.boolean().optional(),
  })).optional(),
});
export type Supercategory = z.infer<typeof Supercategory>;

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
  comparisonLevel: GeoLevel.nullable().default(null),
  comparisonGeoCode: z.string().nullable().default(null),
  showPrognose: z.boolean().default(true),
  comparedDimension: z.string().nullable().default(null),
  comparedDimensionValues: z.array(z.string()).default([]),
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
  source: z.string().optional(), // 'cbs_actuals' | 'cbs_prognose' | 'ruimtemeesters_prognose'
  confidenceLower: z.number().optional(),
  confidenceUpper: z.number().optional(),
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
  references: z.lazy(() => ReferencesBlock).optional(),
});
export type DataResponse = z.infer<typeof DataResponse>;

// ── Cohort + Referential Series (SPEC-A) ─────────────────────────────────────
// Implements ADR-003. See docs/superpowers/specs/2026-05-09-cohort-referential-data-design.md

export const CohortType = z.enum([
  'stedelijkheid',
  'populatiegrootte',
  'woningmarktregio',
  'krimp_anticipeer',
]);
export type CohortType = z.infer<typeof CohortType>;

export const CohortMembership = z.object({
  cohortType: CohortType,
  cohortKey: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  source: z.string(),
  sourceUrl: z.string().nullable(),
  sourceVintage: z.string(),       // ISO date
  members: z.array(z.string()),    // gemeente codes in this cohort
  memberCount: z.number(),
});
export type CohortMembership = z.infer<typeof CohortMembership>;

export const CohortMembershipsResponse = z.object({
  geoCode: z.string(),
  memberships: z.array(CohortMembership),
  defaultByTheme: z.record(z.string()),  // theme_slug → cohort_type
});
export type CohortMembershipsResponse = z.infer<typeof CohortMembershipsResponse>;

export const SeriesPoint = z.object({
  year: z.number(),
  value: z.number(),
});
export type SeriesPoint = z.infer<typeof SeriesPoint>;

export const ReferenceSeries = z.object({
  kind: z.enum(['cohort', 'provincie', 'land']),
  label: z.string(),
  series: z.array(SeriesPoint),
  envelope: z.object({
    p25: z.array(SeriesPoint),
    p50: z.array(SeriesPoint),
    p75: z.array(SeriesPoint),
  }).optional(),
});
export type ReferenceSeries = z.infer<typeof ReferenceSeries>;

export const ReferencesBlock = z.object({
  cohort: ReferenceSeries.optional(),
  provincie: ReferenceSeries.optional(),
  land: ReferenceSeries.optional(),
});
export type ReferencesBlock = z.infer<typeof ReferencesBlock>;

// ── Project Dashboard (SPEC-D) ───────────────────────────────────────────────
// project_dashboards row shape — cloned at bootstrap from the system theme's
// template. Tile list + layout are owned per-project from this point on.

export const ProjectDashboard = z.object({
  id: z.string(),
  projectId: z.string(),
  sourceThemeSlug: z.string(),
  sourceTemplateVersion: z.number(),
  name: z.string(),
  slug: z.string(),
  tiles: z.array(TileConfig),
  layout: z.array(LayoutItem),
  isDefault: z.boolean(),
});
export type ProjectDashboard = z.infer<typeof ProjectDashboard>;

// ── Theme Update Diff (cycle 11 / forge-2026-05-12-002) ──────────────────────
// Diff between a project_dashboards row and the latest dashboard_templates row
// for its source theme. Surfaced by GET /api/projects/.../theme-diff and
// consumed by POST /api/projects/.../theme-apply with selected tileIds.

export const ThemeDiffEntry = z.object({
  kind: z.enum(['added', 'removed', 'modified']),
  tileId: z.string(),
  before: TileConfig.optional(),
  after: TileConfig.optional(),
});
export type ThemeDiffEntry = z.infer<typeof ThemeDiffEntry>;

export const ThemeDiffResponse = z.object({
  projectVersion: z.number(),
  templateVersion: z.number(),
  diff: z.array(ThemeDiffEntry),
});
export type ThemeDiffResponse = z.infer<typeof ThemeDiffResponse>;

export const ThemeApplyResponse = z.object({
  appliedCount: z.number(),
  newProjectVersion: z.number(),
  fullyApplied: z.boolean(),
});
export type ThemeApplyResponse = z.infer<typeof ThemeApplyResponse>;

// ── Theme Readiness (cycle 4 / forge-2026-05-12-004) ─────────────────────────
// Per-theme view of the ADR-002 "shipped" bar, surfaced via the admin panel.

export const ThemeReadinessEntry = z.object({
  slug: z.string(),
  name: z.string(),
  supercategory: z.string().nullable(),
  tileCount: z.number(),
  kpiConfigCount: z.number(),
  templateSeeded: z.boolean(),
  templateVersion: z.number().nullable(),
  distinctDataSources: z.array(z.string()),
  shipped: z.boolean(),
});
export type ThemeReadinessEntry = z.infer<typeof ThemeReadinessEntry>;

export const ThemeReadinessResponse = z.object({
  themes: z.array(ThemeReadinessEntry),
});
export type ThemeReadinessResponse = z.infer<typeof ThemeReadinessResponse>;

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
  dataOrigin: z.string().optional(),    // 'cbs_actuals' | 'cbs_prognose' — filter by source column
  dimensionType: z.string().optional(), // 'samenstelling' | 'leeftijd_referentiepersoon' — for huishoudens
  // SPEC-A reference series — comma-separated subset of 'cohort,provincie,land'.
  // Absent → no references block (back-compat preserved).
  references: z.string().optional(),
  cohortType: CohortType.optional(),    // overrides the per-supercategory default cohort type
  // envelope: include p25/p50/p75 alongside cohort mean.
  // Cannot use z.coerce.boolean() — it calls JS Boolean() which treats both 'true' AND 'false' (any non-empty string)
  // as truthy. Query strings always arrive as strings, so we accept boolean | 'true' | 'false' | undefined and
  // collapse to boolean | undefined explicitly.
  envelope: z.preprocess(
    v => {
      if (v === undefined) return undefined;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const lower = v.toLowerCase();
        if (lower === 'true' || lower === '1') return true;
        if (lower === 'false' || lower === '0' || lower === '') return false;
      }
      return undefined;
    },
    z.boolean().optional(),
  ),
});
export type DataQueryParams = z.infer<typeof DataQueryParams>;

// ── Export ────────────────────────────────────────────────────────────────────

export const ExportFormat = z.enum(['pdf', 'excel', 'csv', 'png']);
export type ExportFormat = z.infer<typeof ExportFormat>;
