-- User preferences for dashboard customization
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL DEFAULT 'nl',
  default_theme VARCHAR(255) DEFAULT 'overzicht',
  default_year INT DEFAULT 2024,
  compact_numbers BOOLEAN NOT NULL DEFAULT true,
  chart_animations BOOLEAN NOT NULL DEFAULT true,
  auto_refresh BOOLEAN NOT NULL DEFAULT false,
  auto_refresh_interval INT DEFAULT 300, -- seconds
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
  color_scheme VARCHAR(50) DEFAULT 'default',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorite themes per user
CREATE TABLE IF NOT EXISTS favorite_themes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, theme_id)
);

-- Dashboard view history for "recently viewed"
CREATE TABLE IF NOT EXISTS view_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme_slug VARCHAR(255),
  dashboard_id UUID,
  geo_code VARCHAR(50),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_view_history_user ON view_history(user_id, viewed_at DESC);
