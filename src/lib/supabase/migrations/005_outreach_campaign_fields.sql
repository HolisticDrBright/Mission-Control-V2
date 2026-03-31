-- Add campaign column to outreach templates (if not already present)
ALTER TABLE mc_outreach_templates ADD COLUMN IF NOT EXISTS campaign TEXT;

-- Add campaign column to outreach leads (as a searchable field)
ALTER TABLE mc_outreach_leads ADD COLUMN IF NOT EXISTS campaign TEXT;

-- Add tags array to outreach leads
ALTER TABLE mc_outreach_leads ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add source field alias (signal_type serves this purpose but adding for clarity)
ALTER TABLE mc_outreach_leads ADD COLUMN IF NOT EXISTS source TEXT;
