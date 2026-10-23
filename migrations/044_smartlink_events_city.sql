-- Глубже гео: город из CDN-заголовков (если прокси отдаёт).

ALTER TABLE smartlink_events
  ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX IF NOT EXISTS idx_smartlink_events_country
  ON smartlink_events (smartlink_key, country)
  WHERE country IS NOT NULL;
