-- Slowed / Reverb / Nightcore в Tools: 1 бесплатный download навсегда + платные кредиты.

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS tools_slowed_reverb_free_used BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS tools_slowed_reverb_credits INTEGER NOT NULL DEFAULT 0;
