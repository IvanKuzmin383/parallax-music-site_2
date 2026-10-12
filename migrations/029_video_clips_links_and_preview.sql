-- Видеоклипы: комментарий/пожелания, таймкод превью, ссылки на площадки.

ALTER TABLE video_clips ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE video_clips ADD COLUMN IF NOT EXISTS preview_timecode_sec INTEGER;
ALTER TABLE video_clips ADD COLUMN IF NOT EXISTS apple_music_url TEXT;
ALTER TABLE video_clips ADD COLUMN IF NOT EXISTS yandex_music_url TEXT;
ALTER TABLE video_clips ADD COLUMN IF NOT EXISTS vk_url TEXT;
