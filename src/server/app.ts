import express from 'express';
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
import { requestLogger } from './middleware/request-logger.js';
import { rateLimit } from './middleware/rate-limit.js';

const app = express();

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

export default app;
