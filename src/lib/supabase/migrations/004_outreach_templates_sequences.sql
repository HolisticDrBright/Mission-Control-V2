-- Outreach email templates
CREATE TABLE mc_outreach_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cold_email',
  -- type: 'cold_email' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'breakup' | 'linkedin_connect' | 'linkedin_message'
  subject TEXT,
  body TEXT NOT NULL,
  notes TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach sequences (ordered sets of template + delay)
CREATE TABLE mc_outreach_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- 'draft' | 'active' | 'paused' | 'completed'
  steps JSONB DEFAULT '[]', -- Array of { template_id, delay_days, step_number }
  active_leads_count INTEGER DEFAULT 0,
  total_enrolled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
