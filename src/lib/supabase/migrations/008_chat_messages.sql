-- Chat / Comms table for Mission Control
CREATE TABLE IF NOT EXISTS mc_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL,           -- 'brandon', 'openclaw', 'cowork'
  message TEXT NOT NULL,
  channel TEXT DEFAULT 'general', -- 'general', 'outreach', 'seo', 'cashclaw', etc.
  metadata JSONB DEFAULT '{}',    -- attachments, task refs, links
  read_by JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_channel ON mc_chat_messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_created ON mc_chat_messages(created_at DESC);
