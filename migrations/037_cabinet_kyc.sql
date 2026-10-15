-- KYC / верификация кабинета: статусы на пользователе, заявки, аудит просмотров документов.

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS kyc_birth_date DATE;

CREATE TABLE IF NOT EXISTS cabinet_kyc_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cabinet_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  patronymic TEXT,
  phone TEXT,
  passport_series TEXT,
  passport_number TEXT,
  passport_masked TEXT,
  birth_date DATE NOT NULL,
  document_storage_key TEXT,
  document_mime TEXT,
  document_size INTEGER,
  document_sha256 TEXT,
  consent_kyc_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_admin TEXT,
  rejection_reason TEXT,
  document_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cabinet_kyc_applications_user_id
  ON cabinet_kyc_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_kyc_applications_status_submitted
  ON cabinet_kyc_applications(status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS cabinet_kyc_audit_log (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES cabinet_kyc_applications(id) ON DELETE CASCADE,
  admin_label TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cabinet_kyc_audit_log_application_id
  ON cabinet_kyc_audit_log(application_id);

-- Уже работающие артисты (активный тариф / Fix / есть треки) не блокируем сразу.
-- Новых пользователей верифицируем через заявку.
UPDATE cabinet_users u
SET kyc_status = 'verified',
    kyc_verified_at = COALESCE(u.kyc_verified_at, NOW())
WHERE u.kyc_status = 'unverified'
  AND (
    (u.subscription_expires_at IS NOT NULL AND u.subscription_expires_at > NOW())
    OR COALESCE(u.purchased_tracks_balance, 0) > 0
    OR EXISTS (
      SELECT 1 FROM tracks t
      WHERE LOWER(t.user_id) = LOWER(u.email)
      LIMIT 1
    )
  );
