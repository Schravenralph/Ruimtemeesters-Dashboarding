import dotenv from 'dotenv';
dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY must be set in production');
}

export const env = {
  port: parseInt(process.env.PORT || '5022', 10),
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
