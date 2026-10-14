-- AI studio: attempts balance, generation jobs, results, attempt ops ledger.

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS ai_tracks_attempts INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ai_tracks_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cabinet_users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL,
  mode TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  cost_attempts INTEGER NOT NULL DEFAULT 1,
  external_task_id TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  CONSTRAINT ai_tracks_jobs_user_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_tracks_jobs_user_created
  ON ai_tracks_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_tracks_jobs_status
  ON ai_tracks_jobs (status, updated_at);

CREATE TABLE IF NOT EXISTS ai_tracks_results (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES ai_tracks_jobs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES cabinet_users(id) ON DELETE CASCADE,
  variant_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  duration_sec DOUBLE PRECISION,
  audio_storage_key TEXT,
  cover_storage_key TEXT,
  audio_format TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_tracks_results_job_variant UNIQUE (job_id, variant_index)
);

CREATE INDEX IF NOT EXISTS idx_ai_tracks_results_user_created
  ON ai_tracks_results (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_tracks_results_user_favorite
  ON ai_tracks_results (user_id, is_favorite)
  WHERE is_favorite = TRUE;

CREATE TABLE IF NOT EXISTS ai_tracks_attempt_ops (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cabinet_users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES ai_tracks_jobs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_tracks_attempt_ops_job_kind UNIQUE (job_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_ai_tracks_attempt_ops_user
  ON ai_tracks_attempt_ops (user_id, created_at DESC);
