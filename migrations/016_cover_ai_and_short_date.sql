-- Обложка создана ИИ (NULL = не выбрано); согласие на короткий срок релиза.
ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS cover_created_with_ai BOOLEAN;

ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS accept_short_release_date BOOLEAN NOT NULL DEFAULT FALSE;
