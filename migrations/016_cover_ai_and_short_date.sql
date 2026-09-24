-- Обложка создана ИИ: no | partial | full (NULL = не выбрано); согласие на короткий срок релиза.
ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS cover_created_with_ai TEXT;

ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS accept_short_release_date BOOLEAN NOT NULL DEFAULT FALSE;
