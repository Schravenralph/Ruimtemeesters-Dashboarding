import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Ruimtemeesters Dashboard API',
    version: '0.1.0',
    description: 'Interactive configurable dashboarding platform with RBAC/ABAC',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Authenticate user',
        'POST /api/auth/register': 'Register new user',
        'GET /api/auth/me': 'Get current user (requires auth)',
      },
      themes: {
        'GET /api/themes': 'List all dashboard themes',
        'GET /api/themes/:slug': 'Get theme by slug',
      },
      data: {
        'GET /api/data/query': 'Query data with filters (source, geoCode, year, dimension)',
        'GET /api/data/years/:source': 'Get available years for a data source',
        'GET /api/data/dimensions/:source': 'Get available dimensions for a data source',
      },
      geo: {
        'GET /api/geo': 'List geographic areas (filter by level, parentCode, q)',
        'GET /api/geo/:code': 'Get area by code',
        'GET /api/geo/:code/children': 'Get child areas',
      },
      dashboards: {
        'GET /api/dashboards/custom': 'List user custom dashboards (requires auth)',
        'POST /api/dashboards/custom': 'Create custom dashboard (requires auth)',
        'PUT /api/dashboards/custom/:id': 'Update custom dashboard (requires auth)',
        'DELETE /api/dashboards/custom/:id': 'Delete custom dashboard (requires auth)',
        'POST /api/dashboards/custom/:id/share': 'Generate share link (requires auth)',
        'GET /api/dashboards/shared/:token': 'View shared dashboard',
        'GET /api/dashboards/layout/:themeId': 'Get dashboard layout',
        'PUT /api/dashboards/layout/:themeId': 'Save dashboard layout (requires auth)',
      },
      stats: {
        'GET /api/stats/overview': 'Get overview statistics',
        'GET /api/stats/timeseries/:source': 'Get time series aggregation',
      },
      export: {
        'GET /api/export': 'Export data (format: csv/json, source, geoCode, year)',
      },
      import: {
        'POST /api/import': 'Import data from JSON (requires admin/editor)',
        'GET /api/import/history': 'Get import history (requires admin)',
      },
      admin: {
        'GET /api/policies': 'List ABAC policies (requires admin)',
        'POST /api/policies': 'Create ABAC policy (requires admin)',
        'PUT /api/policies/:id': 'Update ABAC policy (requires admin)',
        'DELETE /api/policies/:id': 'Delete ABAC policy (requires admin)',
        'GET /api/users': 'List users (requires admin)',
        'PUT /api/users/:id': 'Update user (requires admin)',
        'DELETE /api/users/:id': 'Delete user (requires admin)',
        'GET /api/audit': 'Get audit log (requires admin)',
        'GET /api/datasources/stats': 'Get data source statistics (requires admin)',
      },
      savedFilters: {
        'GET /api/saved-filters': 'List saved filter presets (requires auth)',
        'POST /api/saved-filters': 'Save filter preset (requires auth)',
        'DELETE /api/saved-filters/:id': 'Delete saved filter (requires auth)',
      },
      health: {
        'GET /api/health': 'Health check',
      },
    },
  });
});

export default router;
