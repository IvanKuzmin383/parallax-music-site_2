-- Аналитика смартлинков: свои события (view / click / audio_unlock), без сторонних пикселей.

CREATE TABLE IF NOT EXISTS smartlink_events (
  id BIGSERIAL PRIMARY KEY,
  smartlink_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_key TEXT,
  target_url TEXT,
  session_id TEXT,
  visitor_hash TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device TEXT,
  os TEXT,
  browser TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT smartlink_events_type_check CHECK (
    event_type IN ('view', 'click', 'audio_unlock')
  )
);

CREATE INDEX IF NOT EXISTS idx_smartlink_events_key_created
  ON smartlink_events (smartlink_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_smartlink_events_slug_created
  ON smartlink_events (slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_smartlink_events_type_created
  ON smartlink_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_smartlink_events_session_view
  ON smartlink_events (smartlink_key, session_id, event_type, created_at DESC)
  WHERE event_type = 'view' AND session_id IS NOT NULL;
