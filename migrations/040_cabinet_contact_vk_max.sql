-- Контакты для связи в профиле кабинета: ВК и Макс (рядом с telegram).

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS vk TEXT;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS max_contact TEXT;
