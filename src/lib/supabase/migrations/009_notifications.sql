-- Notifications table
CREATE TABLE IF NOT EXISTS mc_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient TEXT NOT NULL DEFAULT 'brandon',  -- 'brandon', 'openclaw', 'cowork'
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'info',                    -- 'chat', 'task', 'lead', 'template', 'alert', 'info'
  link TEXT,                                   -- URL to navigate to on click
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON mc_notifications(recipient, read, created_at DESC);
