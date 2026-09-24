-- Обложка с ИИ: no | partial | full (вместо boolean, если колонка ещё boolean).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'releases'
      AND column_name = 'cover_created_with_ai'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE releases
      ALTER COLUMN cover_created_with_ai TYPE TEXT
      USING (
        CASE
          WHEN cover_created_with_ai IS TRUE THEN 'full'
          WHEN cover_created_with_ai IS FALSE THEN 'no'
          ELSE NULL
        END
      );
  END IF;
END $$;
