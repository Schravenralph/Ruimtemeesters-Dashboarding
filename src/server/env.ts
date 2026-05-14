import dotenv from 'dotenv';
dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY must be set in production');
}

export const env = {
  port: parseInt(process.env.PORT || '5022', 10),
  // Bind address policy:
  //   - production (Docker container): '::' — IPv6 wildcard, dual-stacks
  //     to IPv4 on Linux. Matches Node's pre-fix default; required because
  //     the in-container HEALTHCHECK uses `localhost` which Alpine resolves
  //     to `::1`. Binding to plain 0.0.0.0 is IPv4-only and the healthcheck
  //     would never connect. The container is only reachable from the host
  //     via docker-proxy, with a reverse proxy in front doing TLS + Clerk.
  //     SERVER_HOST can override (e.g. for diagnostics) but in-container
  //     this is essentially fixed.
  //
  //   - development (dev machine): ALWAYS 127.0.0.1. The dev API exposes
  //     DEV_BYPASS_AUTH (admin credentials) and unauthenticated diagnostic
  //     routes; wildcard binding on a public-facing dev box exposes both.
  //     SERVER_HOST is intentionally ignored here — previous setups where
  //     an external shell did `SERVER_HOST=0.0.0.0 pnpm run dev:server`
  //     bound the dev server to the public interface and triggered the
  //     public-port-audit alert (2026-05-13/14). If you genuinely need
  //     LAN access for testing, run a reverse proxy on a loopback-binding
  //     dev server rather than re-introducing the override here.
  host: process.env.NODE_ENV === 'production'
    ? (process.env.SERVER_HOST || '::')
    : '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'dashboarding',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dashboarding',
  },
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY || '',
  },
  // Legacy JWT config — kept for backward compatibility with auth controller
  jwt: {
    secret: process.env.JWT_SECRET || 'unused-clerk-handles-auth',
    expiry: process.env.JWT_EXPIRY || '24h',
  },
} as const;
