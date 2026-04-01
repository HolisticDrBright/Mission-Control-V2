-- Backfill top-level name/email/company from contacts array + company_name
-- This ensures both old and new code paths work
UPDATE mc_outreach_leads
SET
  name = contacts->0->>'name',
  email = contacts->0->>'email',
  company = company_name,
  title = contacts->0->>'title'
WHERE
  (name IS NULL OR name = '')
  AND contacts IS NOT NULL
  AND contacts::text != '[]'
  AND jsonb_array_length(contacts) > 0;
