-- AI-маркировка трека (режим + подробные этапы для частичного ИИ).
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS ai_labeling_json TEXT;
