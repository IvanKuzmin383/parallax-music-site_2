-- Legacy tracks without releases row: materialize releases so cabinet wizard/detail work.
-- Singles: release.id = track.id. Albums: release.id = album_id.

-- 1) Singles (no album)
INSERT INTO releases (
  id, user_id, kind, title, artist_name, label_name, cover_path, release_date, upc,
  status, wizard_step, addons_json, request_ai_cover, cover_created_with_ai,
  accept_short_release_date, bundle_order_id, album_id, created_at, updated_at
)
SELECT
  t.id,
  t.user_id,
  'single',
  COALESCE(NULLIF(TRIM(t.track_name), ''), 'Без названия'),
  COALESCE(NULLIF(TRIM(t.artist_name), ''), ''),
  COALESCE(NULLIF(TRIM(t.label_name), ''), 'Parallax Music'),
  COALESCE(t.cover_path, ''),
  t.release_date,
  t.upc,
  t.status,
  CASE
    WHEN t.status IN ('upload_pending', 'rejected') THEN 6
    WHEN t.status = 'draft' THEN 1
    ELSE 1
  END,
  '{}',
  COALESCE(t.needs_ai_cover, FALSE),
  NULL,
  FALSE,
  NULL,
  NULL,
  COALESCE(t.created_at, NOW()),
  NOW()
FROM tracks t
WHERE t.release_id IS NULL
  AND t.album_id IS NULL
  AND t.status IN (
    'draft',
    'upload_pending',
    'rejected',
    'on_moderation',
    'sent_to_platforms',
    'approved_by_platforms',
    'released',
    'postponed'
  )
  AND NOT EXISTS (SELECT 1 FROM releases r WHERE r.id = t.id);

UPDATE tracks t
SET release_id = t.id
WHERE t.release_id IS NULL
  AND t.album_id IS NULL
  AND EXISTS (SELECT 1 FROM releases r WHERE r.id = t.id);

-- 2) Albums: one release per album_id for tracks still without release_id
INSERT INTO releases (
  id, user_id, kind, title, artist_name, label_name, cover_path, release_date, upc,
  status, wizard_step, addons_json, request_ai_cover, cover_created_with_ai,
  accept_short_release_date, bundle_order_id, album_id, created_at, updated_at
)
SELECT
  a.id,
  a.user_id,
  'album',
  COALESCE(NULLIF(TRIM(a.title), ''), COALESCE(NULLIF(TRIM(MIN(t.track_name)), ''), 'Альбом')),
  COALESCE(NULLIF(TRIM(a.artist_name), ''), COALESCE(NULLIF(TRIM(MIN(t.artist_name)), ''), '')),
  COALESCE(NULLIF(TRIM(a.label_name), ''), COALESCE(NULLIF(TRIM(MIN(t.label_name)), ''), 'Parallax Music')),
  COALESCE(NULLIF(TRIM(a.cover_path), ''), COALESCE(NULLIF(TRIM(MIN(t.cover_path)), ''), '')),
  COALESCE(a.release_date, MIN(t.release_date)),
  NULL,
  CASE
    WHEN BOOL_OR(t.status = 'rejected') THEN 'rejected'
    WHEN BOOL_OR(t.status = 'upload_pending') THEN 'upload_pending'
    WHEN BOOL_OR(t.status = 'on_moderation') THEN 'on_moderation'
    WHEN BOOL_OR(t.status = 'draft') THEN 'draft'
    WHEN BOOL_OR(t.status = 'postponed') THEN 'postponed'
    WHEN BOOL_OR(t.status = 'sent_to_platforms') THEN 'sent_to_platforms'
    WHEN BOOL_OR(t.status = 'approved_by_platforms') THEN 'approved_by_platforms'
    WHEN BOOL_OR(t.status = 'released') THEN 'released'
    ELSE 'on_moderation'
  END,
  CASE
    WHEN BOOL_OR(t.status IN ('upload_pending', 'rejected')) THEN 6
    WHEN BOOL_OR(t.status = 'draft') THEN 1
    ELSE 1
  END,
  '{}',
  BOOL_OR(COALESCE(t.needs_ai_cover, FALSE)),
  NULL,
  FALSE,
  NULL,
  a.id,
  COALESCE(MIN(t.created_at), NOW()),
  NOW()
FROM albums a
INNER JOIN tracks t ON t.album_id = a.id
WHERE t.release_id IS NULL
  AND t.status IN (
    'draft',
    'upload_pending',
    'rejected',
    'on_moderation',
    'sent_to_platforms',
    'approved_by_platforms',
    'released',
    'postponed'
  )
  AND NOT EXISTS (SELECT 1 FROM releases r WHERE r.id = a.id)
GROUP BY
  a.id, a.user_id, a.title, a.artist_name, a.label_name, a.cover_path, a.release_date;

UPDATE tracks t
SET release_id = t.album_id
WHERE t.release_id IS NULL
  AND t.album_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM releases r WHERE r.id = t.album_id);
