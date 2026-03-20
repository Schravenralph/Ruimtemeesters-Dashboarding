import { env } from '../env.js';

/**
 * Application configuration.
 * Centralized config for all server components.
 */
export const appConfig = {
  // General
  name: 'Ruimtemeesters Dashboard',
  version: '0.1.0',
  environment: env.nodeEnv,

  // Server
  server: {
    port: env.port,
    corsOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [],
    requestSizeLimit: '10mb',
  },

  // Auth
  auth: {
    jwtSecret: env.jwt.secret,
    jwtExpiry: env.jwt.expiry,
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },

  // Rate limiting
  rateLimiting: {
    global: { windowMs: 60000, max: 200 },
    auth: { windowMs: 60000, max: 20 },
    export: { windowMs: 60000, max: 10 },
    import: { windowMs: 300000, max: 5 },
  },

  // Data
  data: {
    maxExportRows: 50000,
    maxImportRows: 50000,
    maxQueryLimit: 10000,
    defaultQueryLimit: 1000,
    cacheTtlMs: 300000, // 5 minutes
  },

  // Dashboards
  dashboards: {
    maxCustomPerUser: 5,
    shareLinkExpiryDays: 30,
    maxTilesPerDashboard: 20,
  },

  // Geographic
  geo: {
    levels: ['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt'] as const,
    defaultLevel: 'land' as const,
    defaultCode: 'NL',
    maxSearchResults: 500,
  },

  // Charts
  charts: {
    types: [
      'bar', 'stacked-bar', 'line', 'pie', 'radar',
      'table', 'choropleth', 'pyramid', 'gauge',
    ] as const,
    defaultColors: [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    ],
  },

  // Feature flags
  features: {
    enableNotifications: true,
    enableDataImport: true,
    enableTemplates: true,
    enableTrends: true,
    enableDataQuality: true,
    enableSearch: true,
    enableAuditLog: true,
  },
} as const;

export type AppConfig = typeof appConfig;
