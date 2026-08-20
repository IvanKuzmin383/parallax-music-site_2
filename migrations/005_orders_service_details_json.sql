-- Детали заказа услуг (название трека, пожелания, исходные имена файлов)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS service_details_json TEXT;
