import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import themeRoutes from './routes/theme.routes.js';
import dataRoutes from './routes/data.routes.js';
import geoRoutes from './routes/geo.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import policyRoutes from './routes/policy.routes.js';
import userRoutes from './routes/user.routes.js';
import statsRoutes from './routes/stats.routes.js';
import exportRoutes from './routes/export.routes.js';
import auditRoutes from './routes/audit.routes.js';
import datasourceRoutes from './routes/datasource.routes.js';
import savedFiltersRoutes from './routes/saved-filters.routes.js';
import importRoutes from './routes/import.routes.js';
import docsRoutes from './routes/docs.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import trendsRoutes from './routes/trends.routes.js';
import qualityRoutes from './routes/quality.routes.js';
import searchRoutes from './routes/search.routes.js';
import themeAdminRoutes from './routes/theme-admin.routes.js';
import reportRoutes from './routes/report.routes.js';
import templateRoutes from './routes/template.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import preferencesRoutes from './routes/preferences.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import apiKeyRoutes from './routes/api-key.routes.js';
import supercategoryRoutes from './routes/supercategory.routes.js';
import { requestLogger } from './middleware/request-logger.js';
import { rateLimit } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authenticate, requireRole } from './middleware/auth.js';

const app: Express = express();

// Logging
app.use(requestLogger);

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 60000, max: 20 })); // Stricter for auth
app.use('/api', rateLimit({ windowMs: 60000, max: 200 }));

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',')
    : true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Health checks
import { detailedHealth } from './controllers/health.controller.js';
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health/detailed', authenticate, requireRole('admin'), detailedHealth);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/datasources', datasourceRoutes);
app.use('/api/saved-filters', savedFiltersRoutes);
app.use('/api/import', importRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin/themes', themeAdminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/supercategories', supercategoryRoutes);

// Error handling (must be last)
app.use('/api', notFoundHandler);
app.use(errorHandler);

export default app;
