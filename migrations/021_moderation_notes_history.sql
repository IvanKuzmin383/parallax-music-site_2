-- История комментариев модерации (JSON-массив). Текущий комментарий — tracks.moderation_note.
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS moderation_notes_json TEXT;
