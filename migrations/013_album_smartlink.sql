-- Один смартлинк на альбом (не на каждый трек).
ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS smartlink_slug TEXT;

ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS platform_links TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_albums_smartlink_slug
  ON albums (smartlink_slug)
  WHERE smartlink_slug IS NOT NULL;

-- Перенести slug/ссылки с первого трека альбома (у кого они есть) на альбом.
WITH pick AS (
  SELECT DISTINCT ON (t.album_id)
    t.album_id,
    t.smartlink_slug,
    t.platform_links
  FROM tracks t
  WHERE t.album_id IS NOT NULL
    AND (
      NULLIF(TRIM(COALESCE(t.smartlink_slug, '')), '') IS NOT NULL
      OR (
        t.platform_links IS NOT NULL
        AND TRIM(t.platform_links) <> ''
        AND TRIM(t.platform_links) <> '{}'
      )
    )
  ORDER BY t.album_id, t.created_at ASC
)
UPDATE albums a
SET
  smartlink_slug = COALESCE(NULLIF(TRIM(a.smartlink_slug), ''), p.smartlink_slug),
  platform_links = COALESCE(NULLIF(TRIM(a.platform_links), ''), p.platform_links)
FROM pick p
WHERE a.id = p.album_id;

-- У треков альбома свой смартлинк больше не нужен.
UPDATE tracks
SET smartlink_slug = NULL
WHERE album_id IS NOT NULL
  AND smartlink_slug IS NOT NULL;
