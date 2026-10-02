-- История версий релиза (снапшоты метаданных, без копирования медиа-файлов).
CREATE TABLE IF NOT EXISTS release_entity_versions (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT,
  note TEXT,
  snapshot_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (release_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_release_entity_versions_release_id
  ON release_entity_versions(release_id);

CREATE INDEX IF NOT EXISTS idx_release_entity_versions_created_at
  ON release_entity_versions(created_at);
