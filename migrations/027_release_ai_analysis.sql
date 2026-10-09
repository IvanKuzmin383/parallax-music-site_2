-- AI-анализ релиза (текст заполняется вручную в админке).
ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS ai_analysis_text TEXT;

-- Для legacy-синглов без строки в releases.
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS ai_analysis_text TEXT;
