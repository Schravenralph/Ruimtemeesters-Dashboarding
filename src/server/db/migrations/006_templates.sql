-- Dashboard templates for quick creation
CREATE TABLE IF NOT EXISTS dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'general',
  tiles JSONB NOT NULL DEFAULT '[]',
  layout JSONB NOT NULL DEFAULT '[]',
  preview_config JSONB DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  usage_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON dashboard_templates(category);
CREATE INDEX idx_templates_featured ON dashboard_templates(is_featured) WHERE is_featured;
