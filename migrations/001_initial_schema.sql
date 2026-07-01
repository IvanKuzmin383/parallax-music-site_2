-- Parallax Music - initial PostgreSQL schema (from SQLite lib/db.ts)
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cabinet_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  artist_name TEXT,
  telegram TEXT,
  last_name TEXT,
  first_name TEXT,
  patronymic TEXT,
  phone TEXT,
  registration_address TEXT,
  bank_account_number TEXT,
  bank_bic TEXT,
  bank_name TEXT,
  subscription_name TEXT,
  subscription_expires_at TIMESTAMPTZ,
  subscription_track_limit INTEGER,
  purchased_tracks_balance INTEGER,
  streaming_balance DOUBLE PRECISION,
  counterparty_type TEXT NOT NULL DEFAULT 'individual',
  company_full_name TEXT,
  company_short_name TEXT,
  inn TEXT,
  kpp TEXT,
  ogrn TEXT,
  ogrnip TEXT,
  legal_address TEXT,
  postal_address TEXT,
  bank_correspondent_account TEXT,
  ip_full_name TEXT,
  signatory_full_name TEXT,
  signatory_position TEXT,
  signatory_authority_basis TEXT,
  documents_email TEXT,
  vat_payer BOOLEAN,
  tax_system TEXT,
  edo_required BOOLEAN NOT NULL DEFAULT FALSE,
  edo_identifier TEXT,
  yookassa_payment_method_id TEXT,
  tbank_rebill_id TEXT,
  autopay_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  autopay_plan_id TEXT,
  autopay_period TEXT,
  autopay_periods_count INTEGER,
  autopay_next_charge_at TIMESTAMPTZ,
  autopay_last_reminder_sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cabinet_users_email ON cabinet_users(email);

CREATE TABLE IF NOT EXISTS cabinet_user_deletions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cabinet_user_deletions_email_deleted_at
  ON cabinet_user_deletions(email, deleted_at);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  album_id TEXT,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  genre TEXT NOT NULL,
  mood TEXT,
  short_description TEXT,
  lyrics_text TEXT,
  music_author TEXT,
  lyrics_author TEXT,
  is_ai_made BOOLEAN NOT NULL DEFAULT FALSE,
  music_rights TEXT,
  music_ai_service TEXT,
  lyrics_rights TEXT,
  performance_rights TEXT,
  is_instrumental BOOLEAN NOT NULL DEFAULT FALSE,
  backing_author TEXT,
  cover_path TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  status TEXT NOT NULL,
  release_date TEXT,
  upc TEXT,
  smartlink_slug TEXT UNIQUE,
  platform_links TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  moderation_note TEXT,
  needs_ai_cover BOOLEAN NOT NULL DEFAULT FALSE,
  label_name TEXT NOT NULL DEFAULT 'Parallax Music',
  isrc TEXT,
  transfer_from_other_distributor BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
CREATE INDEX IF NOT EXISTS idx_tracks_smartlink_slug ON tracks(smartlink_slug);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  meta_description TEXT,
  keywords TEXT,
  og_image TEXT,
  category TEXT,
  tags TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  cover_path TEXT NOT NULL,
  release_date TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  label_name TEXT NOT NULL DEFAULT 'Parallax Music'
);
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  user_email TEXT,
  telegram TEXT,
  plan_id TEXT,
  period TEXT,
  periods_count INTEGER,
  total_amount TEXT NOT NULL,
  user_id TEXT,
  tracks_count INTEGER,
  upload_addon_bundle_payload_json TEXT,
  is_recurring_renewal BOOLEAN NOT NULL DEFAULT FALSE,
  draft_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);

CREATE TABLE IF NOT EXISTS upload_drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  audio_rel_path TEXT,
  cover_rel_path TEXT,
  album_id TEXT,
  bundle_order_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_upload_drafts_user_id ON upload_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_drafts_status ON upload_drafts(status);
CREATE INDEX IF NOT EXISTS idx_upload_drafts_expires_at ON upload_drafts(expires_at);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  type TEXT NOT NULL,
  phone TEXT,
  card_number TEXT,
  bank TEXT,
  recipient_name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);

CREATE TABLE IF NOT EXISTS streaming_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_streaming_reports_user_id ON streaming_reports(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_is_published_created_at
  ON reviews(is_published, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_unique
  ON reviews(user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS service_fulfillments (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  fulfillment_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_service_fulfillments_status ON service_fulfillments(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_service_fulfillments_updated_at ON service_fulfillments(updated_at);

CREATE TABLE IF NOT EXISTS pending_subscription_autopay (
  email CITEXT PRIMARY KEY,
  yookassa_payment_method_id TEXT,
  tbank_rebill_id TEXT,
  plan_id TEXT NOT NULL,
  period TEXT NOT NULL,
  periods_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS autopay_disable_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_autopay_disable_tokens_expires_at ON autopay_disable_tokens(expires_at);

CREATE TABLE IF NOT EXISTS pending_fix_credits (
  id SERIAL PRIMARY KEY,
  email CITEXT NOT NULL,
  tracks_count INTEGER NOT NULL,
  order_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pending_fix_credits_email ON pending_fix_credits(email);

CREATE TABLE IF NOT EXISTS subscription_billing_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  users_considered INTEGER NOT NULL DEFAULT 0,
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  charges_initiated INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT,
  trigger_ip TEXT,
  trigger_user_agent TEXT,
  trigger_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_runs_started_at
  ON subscription_billing_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS cabinet_user_artist_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  artist_name TEXT,
  subscription_name TEXT NOT NULL,
  subscription_expires_at TIMESTAMPTZ,
  subscription_track_limit INTEGER,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cuas_user_id ON cabinet_user_artist_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_cuas_user_artist ON cabinet_user_artist_subscriptions(user_id, artist_name);

CREATE TABLE IF NOT EXISTS music_stat_imports (
  id TEXT PRIMARY KEY,
  platform_key TEXT NOT NULL,
  platform_label TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  source TEXT,
  exported_at TIMESTAMPTZ,
  total_rows INTEGER NOT NULL DEFAULT 0,
  total_tracks_in_file INTEGER NOT NULL DEFAULT 0,
  total_plays INTEGER NOT NULL DEFAULT 0,
  days_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(platform_key, file_hash)
);
CREATE INDEX IF NOT EXISTS idx_music_stat_imports_platform_key_created_at
  ON music_stat_imports(platform_key, created_at);

CREATE TABLE IF NOT EXISTS music_platform_tracks (
  platform_key TEXT NOT NULL,
  track_key TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  PRIMARY KEY (platform_key, track_key)
);

CREATE TABLE IF NOT EXISTS music_platform_track_daily_plays (
  platform_key TEXT NOT NULL,
  track_key TEXT NOT NULL,
  stat_date TEXT NOT NULL,
  plays INTEGER NOT NULL,
  PRIMARY KEY (platform_key, track_key, stat_date)
);

CREATE TABLE IF NOT EXISTS music_platform_daily_stats (
  platform_key TEXT NOT NULL,
  stat_date TEXT NOT NULL,
  total_plays INTEGER NOT NULL,
  tracks_with_plays INTEGER NOT NULL,
  PRIMARY KEY (platform_key, stat_date)
);

CREATE TABLE IF NOT EXISTS music_platform_top_tracks (
  platform_key TEXT NOT NULL,
  track_key TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  plays INTEGER NOT NULL,
  PRIMARY KEY (platform_key, track_key)
);

CREATE INDEX IF NOT EXISTS idx_music_platform_track_daily_plays_platform_date
  ON music_platform_track_daily_plays(platform_key, stat_date);

CREATE TABLE IF NOT EXISTS music_platform_track_daily_plays_by_country (
  platform_key TEXT NOT NULL,
  track_key TEXT NOT NULL,
  stat_date TEXT NOT NULL,
  country TEXT NOT NULL,
  plays INTEGER NOT NULL,
  PRIMARY KEY (platform_key, track_key, stat_date, country)
);

CREATE INDEX IF NOT EXISTS idx_mptdpbc_platform_date
  ON music_platform_track_daily_plays_by_country(platform_key, stat_date);

CREATE TABLE IF NOT EXISTS cabinet_music_track_map (
  user_id TEXT NOT NULL,
  platform_key TEXT NOT NULL,
  track_key TEXT NOT NULL,
  cabinet_track_id TEXT NOT NULL,
  matched_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, platform_key, track_key)
);

CREATE INDEX IF NOT EXISTS idx_cmtm_platform_track
  ON cabinet_music_track_map(platform_key, track_key);

CREATE INDEX IF NOT EXISTS idx_cmtm_user_platform_track
  ON cabinet_music_track_map(user_id, platform_key, cabinet_track_id);

CREATE TABLE IF NOT EXISTS cabinet_announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cabinet_announcements_active_created
  ON cabinet_announcements (active, created_at);

CREATE TABLE IF NOT EXISTS cabinet_announcement_dismissals (
  user_id TEXT NOT NULL,
  announcement_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, announcement_id)
);
CREATE INDEX IF NOT EXISTS idx_cabinet_announcement_dismissals_user
  ON cabinet_announcement_dismissals (user_id);

CREATE TABLE IF NOT EXISTS legal_document_versions (
  id TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  revision_label TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  source_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(document_key, content_sha256)
);
CREATE INDEX IF NOT EXISTS idx_legal_document_versions_key ON legal_document_versions(document_key);

CREATE TABLE IF NOT EXISTS legal_acceptance_events (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  document_version_id TEXT NOT NULL REFERENCES legal_document_versions(id),
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  client_ip TEXT,
  user_agent TEXT,
  metadata_json TEXT,
  UNIQUE(resource_type, resource_id, event_type)
);
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_user_email ON legal_acceptance_events(user_email);
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_occurred ON legal_acceptance_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_resource ON legal_acceptance_events(resource_type, resource_id);

CREATE TABLE IF NOT EXISTS tbank_recurrent_test_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  customer_key TEXT NOT NULL,
  parent_order_id TEXT,
  parent_payment_id TEXT,
  rebill_id TEXT,
  parent_status TEXT,
  child_order_id TEXT,
  child_payment_id TEXT,
  child_status TEXT,
  last_charge_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tbank_receipt_test_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  order_id TEXT,
  payment_id TEXT,
  receipt_email TEXT,
  payment_status TEXT,
  refund_status TEXT,
  last_refund_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);
