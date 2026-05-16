import Database from "better-sqlite3"
import fs from "fs"
import path from "path"
import { backfillTrackAcceptancesWithCurrentOffer } from "./legal-acceptance"

const DB_FILE_NAME = "app.db"
let dbInstance: Database.Database | null = null

/**
 * Путь к файлу БД. На Amvera — /data/app.db, локально — data/app.db.
 */
export function getDbPath(): string {
  if (process.env.AMVERA_DATA_PATH === "true" || process.env.USE_AMVERA_DATA === "true") {
    return path.posix.join("/data", DB_FILE_NAME)
  }
  try {
    if (fs.existsSync("/data")) {
      return path.posix.join("/data", DB_FILE_NAME)
    }
  } catch {
    // ignore
  }
  return path.join(process.cwd(), "data", DB_FILE_NAME)
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definitionSql: string
): void {
  const rows = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[]
  const hasColumn = rows.some((row) => row.name === column)
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definitionSql}`)
  }
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cabinet_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
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
      subscription_expires_at TEXT,
      subscription_track_limit INTEGER,
      purchased_tracks_balance INTEGER,
      streaming_balance REAL
    );
    CREATE INDEX IF NOT EXISTS idx_cabinet_users_email ON cabinet_users(email);
    
    CREATE TABLE IF NOT EXISTS cabinet_user_deletions (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      deleted_at TEXT NOT NULL
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
      is_ai_made INTEGER NOT NULL DEFAULT 0,
      music_rights TEXT,
      music_ai_service TEXT,
      lyrics_rights TEXT,
      performance_rights TEXT,
      is_instrumental INTEGER NOT NULL DEFAULT 0,
      backing_author TEXT,
      cover_path TEXT NOT NULL,
      audio_path TEXT NOT NULL,
      status TEXT NOT NULL,
      release_date TEXT,
      upc TEXT,
      smartlink_slug TEXT UNIQUE,
      platform_links TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON tracks(user_id);
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
      published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_type TEXT NOT NULL,
      status TEXT NOT NULL,
      payment_id TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT,
      user_email TEXT,
      telegram TEXT,
      plan_id TEXT,
      period TEXT,
      periods_count INTEGER,
      total_amount TEXT NOT NULL,
      user_id TEXT,
      tracks_count INTEGER,
      upload_addon_bundle_payload_json TEXT
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
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_upload_drafts_user_id ON upload_drafts(user_id);
    CREATE INDEX IF NOT EXISTS idx_upload_drafts_status ON upload_drafts(status);
    CREATE INDEX IF NOT EXISTS idx_upload_drafts_expires_at ON upload_drafts(expires_at);

    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      phone TEXT,
      card_number TEXT,
      bank TEXT,
      recipient_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);

    CREATE TABLE IF NOT EXISTS streaming_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_streaming_reports_user_id ON streaming_reports(user_id);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      text TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 0,
      created_by_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_is_published_created_at
      ON reviews(is_published, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_unique
      ON reviews(user_id)
      WHERE user_id IS NOT NULL;
  `)

  // Миграция: добавляем колонку moderation_note в tracks, если её ещё нет
  ensureColumn(db, "tracks", "moderation_note", "moderation_note TEXT")
  // Миграция: флаг, что трек сделан с помощью ИИ
  ensureColumn(db, "tracks", "is_ai_made", "is_ai_made INTEGER NOT NULL DEFAULT 0")
  // Миграции: права на музыку/текст/исполнение и флаг инструментала
  ensureColumn(db, "tracks", "music_rights", "music_rights TEXT")
  ensureColumn(db, "tracks", "music_ai_service", "music_ai_service TEXT")
  ensureColumn(db, "tracks", "lyrics_rights", "lyrics_rights TEXT")
  ensureColumn(db, "tracks", "performance_rights", "performance_rights TEXT")
  ensureColumn(db, "tracks", "mood", "mood TEXT")
  ensureColumn(db, "tracks", "is_instrumental", "is_instrumental INTEGER NOT NULL DEFAULT 0")
  ensureColumn(db, "tracks", "needs_ai_cover", "needs_ai_cover INTEGER NOT NULL DEFAULT 0")
  ensureColumn(db, "tracks", "label_name", "label_name TEXT NOT NULL DEFAULT 'Parallax Music'")
  ensureColumn(db, "tracks", "isrc", "isrc TEXT")
  ensureColumn(
    db,
    "tracks",
    "transfer_from_other_distributor",
    "transfer_from_other_distributor INTEGER NOT NULL DEFAULT 0"
  )
  ensureColumn(db, "albums", "label_name", "label_name TEXT NOT NULL DEFAULT 'Parallax Music'")
  // Миграции: профиль в кабинете (ФИО, телефон, telegram, адрес регистрации)
  ensureColumn(db, "cabinet_users", "is_disabled", "is_disabled INTEGER NOT NULL DEFAULT 0")
  ensureColumn(db, "cabinet_users", "last_name", "last_name TEXT")
  ensureColumn(db, "cabinet_users", "first_name", "first_name TEXT")
  ensureColumn(db, "cabinet_users", "patronymic", "patronymic TEXT")
  ensureColumn(db, "cabinet_users", "phone", "phone TEXT")
  ensureColumn(db, "cabinet_users", "registration_address", "registration_address TEXT")
  ensureColumn(db, "cabinet_users", "bank_account_number", "bank_account_number TEXT")
  ensureColumn(db, "cabinet_users", "bank_bic", "bank_bic TEXT")
  ensureColumn(db, "cabinet_users", "bank_name", "bank_name TEXT")
  ensureColumn(db, "cabinet_users", "counterparty_type", "counterparty_type TEXT NOT NULL DEFAULT 'individual'")
  ensureColumn(db, "cabinet_users", "company_full_name", "company_full_name TEXT")
  ensureColumn(db, "cabinet_users", "company_short_name", "company_short_name TEXT")
  ensureColumn(db, "cabinet_users", "inn", "inn TEXT")
  ensureColumn(db, "cabinet_users", "kpp", "kpp TEXT")
  ensureColumn(db, "cabinet_users", "ogrn", "ogrn TEXT")
  ensureColumn(db, "cabinet_users", "ogrnip", "ogrnip TEXT")
  ensureColumn(db, "cabinet_users", "legal_address", "legal_address TEXT")
  ensureColumn(db, "cabinet_users", "postal_address", "postal_address TEXT")
  ensureColumn(db, "cabinet_users", "bank_correspondent_account", "bank_correspondent_account TEXT")
  ensureColumn(db, "cabinet_users", "ip_full_name", "ip_full_name TEXT")
  ensureColumn(db, "cabinet_users", "signatory_full_name", "signatory_full_name TEXT")
  ensureColumn(db, "cabinet_users", "signatory_position", "signatory_position TEXT")
  ensureColumn(db, "cabinet_users", "signatory_authority_basis", "signatory_authority_basis TEXT")
  ensureColumn(db, "cabinet_users", "documents_email", "documents_email TEXT")
  ensureColumn(db, "cabinet_users", "vat_payer", "vat_payer INTEGER")
  ensureColumn(db, "cabinet_users", "tax_system", "tax_system TEXT")
  ensureColumn(db, "cabinet_users", "edo_required", "edo_required INTEGER NOT NULL DEFAULT 0")
  ensureColumn(db, "cabinet_users", "edo_identifier", "edo_identifier TEXT")

  // Подписка: автоплатежи YooKassa
  ensureColumn(db, "cabinet_users", "yookassa_payment_method_id", "yookassa_payment_method_id TEXT")
  ensureColumn(db, "cabinet_users", "autopay_enabled", "autopay_enabled INTEGER NOT NULL DEFAULT 0")
  ensureColumn(db, "cabinet_users", "autopay_plan_id", "autopay_plan_id TEXT")
  ensureColumn(db, "cabinet_users", "autopay_period", "autopay_period TEXT")
  ensureColumn(db, "cabinet_users", "autopay_periods_count", "autopay_periods_count INTEGER")
  ensureColumn(db, "cabinet_users", "autopay_next_charge_at", "autopay_next_charge_at TEXT")
  ensureColumn(db, "cabinet_users", "autopay_last_reminder_sent_at", "autopay_last_reminder_sent_at TEXT")

  ensureColumn(db, "orders", "is_recurring_renewal", "is_recurring_renewal INTEGER NOT NULL DEFAULT 0")
  ensureColumn(db, "orders", "draft_id", "draft_id TEXT")
  ensureColumn(db, "orders", "upload_addon_bundle_payload_json", "upload_addon_bundle_payload_json TEXT")

  db.exec(`
    CREATE TABLE IF NOT EXISTS service_fulfillments (
      order_id TEXT PRIMARY KEY,
      fulfillment_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE INDEX IF NOT EXISTS idx_service_fulfillments_status ON service_fulfillments(fulfillment_status);
    CREATE INDEX IF NOT EXISTS idx_service_fulfillments_updated_at ON service_fulfillments(updated_at);
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_subscription_autopay (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      yookassa_payment_method_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      period TEXT NOT NULL,
      periods_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS autopay_disable_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_autopay_disable_tokens_expires_at ON autopay_disable_tokens(expires_at);

    CREATE TABLE IF NOT EXISTS subscription_billing_runs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
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
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS cabinet_user_artist_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      artist_name TEXT,
      subscription_name TEXT NOT NULL,
      subscription_expires_at TEXT,
      subscription_track_limit INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cuas_user_id ON cabinet_user_artist_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_cuas_user_artist ON cabinet_user_artist_subscriptions(user_id, artist_name);
  `)

  db.exec(`
    INSERT INTO cabinet_user_artist_subscriptions (
      id, user_id, artist_name, subscription_name, subscription_expires_at, subscription_track_limit, created_at, updated_at
    )
    SELECT
      lower(hex(randomblob(16))),
      cu.id,
      cu.artist_name,
      cu.subscription_name,
      cu.subscription_expires_at,
      cu.subscription_track_limit,
      COALESCE(cu.created_at, datetime('now')),
      datetime('now')
    FROM cabinet_users cu
    WHERE cu.subscription_name IS NOT NULL
      AND cu.subscription_expires_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM cabinet_user_artist_subscriptions s
        WHERE s.user_id = cu.id
      );
  `)

  // Важно: старые таблицы статистики удаляем, т.к. код теперь использует только music_platform_*.
  // (Иначе появится расхождение источников истины.)
  db.exec(`
    DROP TABLE IF EXISTS yandex_music_stat_imports;
    DROP TABLE IF EXISTS yandex_music_daily_stats;
    DROP TABLE IF EXISTS yandex_music_top_tracks;
    DROP TABLE IF EXISTS music_daily_stats;
    DROP TABLE IF EXISTS music_top_tracks;
  `)

  // Generic music stats (imports + aggregated data for charts)
  // Used for platforms like iTunes/YouTube/VK/Spotify/Shazam/Apple Music.
  db.exec(`
    CREATE TABLE IF NOT EXISTS music_stat_imports (
      id TEXT PRIMARY KEY,
      platform_key TEXT NOT NULL,
      platform_label TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      source TEXT,
      exported_at TEXT,
      total_rows INTEGER NOT NULL DEFAULT 0,
      total_tracks_in_file INTEGER NOT NULL DEFAULT 0,
      total_plays INTEGER NOT NULL DEFAULT 0,
      days_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(platform_key, file_hash)
    );

    CREATE INDEX IF NOT EXISTS idx_music_stat_imports_platform_key_created_at
      ON music_stat_imports(platform_key, created_at);
  `)

  // Music stats v2: replacement by platform+date
  // Allows: uploading a file that overlaps existing dates replaces those dates in DB.
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS cabinet_announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cabinet_announcements_active_created
      ON cabinet_announcements (active, created_at);

    CREATE TABLE IF NOT EXISTS cabinet_announcement_dismissals (
      user_id TEXT NOT NULL,
      announcement_id TEXT NOT NULL,
      dismissed_at TEXT NOT NULL,
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
      created_at TEXT NOT NULL,
      UNIQUE(document_key, content_sha256)
    );
    CREATE INDEX IF NOT EXISTS idx_legal_document_versions_key ON legal_document_versions(document_key);

    CREATE TABLE IF NOT EXISTS legal_acceptance_events (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      document_version_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      client_ip TEXT,
      user_agent TEXT,
      metadata_json TEXT,
      FOREIGN KEY (document_version_id) REFERENCES legal_document_versions(id),
      UNIQUE(resource_type, resource_id, event_type)
    );
    CREATE INDEX IF NOT EXISTS idx_legal_acceptance_user_email ON legal_acceptance_events(user_email);
    CREATE INDEX IF NOT EXISTS idx_legal_acceptance_occurred ON legal_acceptance_events(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_legal_acceptance_resource ON legal_acceptance_events(resource_type, resource_id);
  `)

  try {
    const n = backfillTrackAcceptancesWithCurrentOffer(db)
    if (n > 0 && process.env.NODE_ENV === "development") {
      console.log("[db] Backfilled legal acceptance events for tracks:", n)
    }
  } catch (e) {
    console.error("[db] legal acceptance backfill failed:", e)
  }
}

/**
 * Синглтон БД. При первом вызове создаёт директорию при необходимости, открывает БД и выполняет миграции схемы.
 */
export function getDb(): Database.Database {
  if (dbInstance) return dbInstance
  const dbPath = getDbPath()
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  dbInstance = new Database(dbPath)
  // Встроенный SQLite LOWER() меняет только ASCII; для кириллицы в title/author матчинг ломался.
  dbInstance.function("unicode_lower", (text: unknown) => {
    if (text == null) return null
    return String(text).toLowerCase()
  })
  runMigrations(dbInstance)
  if (process.env.NODE_ENV === "development") {
    console.log("[db] SQLite opened at", dbPath)
  }
  return dbInstance
}
