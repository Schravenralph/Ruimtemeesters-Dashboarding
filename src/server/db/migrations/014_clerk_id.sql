-- Add Clerk SSO user linking
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);
