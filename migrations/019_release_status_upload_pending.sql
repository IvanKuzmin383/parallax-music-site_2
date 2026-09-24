-- Синхронизация: если у треков релиза статус «Требуется доработка»,
-- а у релиза ещё «На модерации» — поднимаем статус на релиз.
UPDATE releases r
SET status = 'upload_pending',
    updated_at = NOW()
WHERE r.status = 'on_moderation'
  AND EXISTS (
    SELECT 1
    FROM tracks t
    WHERE t.release_id = r.id
      AND t.status = 'upload_pending'
  );
