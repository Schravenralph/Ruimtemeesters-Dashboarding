import dotenv from 'dotenv';
dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY must be set in production');
}

export const env = {
  port: parseInt(process.env.PORT || '5022', 10),
  // Default by environment:
  //   - production (Docker container): 0.0.0.0 — container needs to accept
  //     traffic from docker-proxy; the host is only reachable via the proxy
  //     and a reverse proxy in front does TLS / auth.
  //   - development (dev machine): 127.0.0.1 — the API serves authenticated
  //     routes and DEV_BYPASS_AUTH returns admin credentials, so wildcard
  //     binding on a public-facing dev box exposes both.
  // Override via SERVER_HOST in either direction (e.g. 0.0.0.0 on a private
  // dev LAN for a teammate; 127.0.0.1 in prod if running on the host).
  // Production runs inside a Docker container; the 0.0.0.0 literal is the
  // container's listen address, NOT the host's. docker-proxy forwards from
  // host:port to container:port, and a reverse proxy in front handles TLS +
  // Clerk auth before traffic ever reaches this listener.
  host: process.env.SERVER_HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'), // public-bind-ok
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
