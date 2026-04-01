-- Fix mc_outreach_templates: remove NOT NULL on campaign, add defaults
ALTER TABLE mc_outreach_templates ALTER COLUMN campaign DROP NOT NULL;
ALTER TABLE mc_outreach_templates ALTER COLUMN name SET DEFAULT '';
ALTER TABLE mc_outreach_templates ALTER COLUMN type SET DEFAULT 'cold_email';
ALTER TABLE mc_outreach_templates ALTER COLUMN body SET DEFAULT '';

-- Ensure all columns exist with safe defaults
ALTER TABLE mc_outreach_templates ADD COLUMN IF NOT EXISTS campaign TEXT;
ALTER TABLE mc_outreach_templates ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE mc_outreach_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE mc_outreach_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
