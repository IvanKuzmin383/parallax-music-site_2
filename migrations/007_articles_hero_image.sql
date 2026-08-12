-- Wide cover (16:9) for article page; og_image stays for list cards (1:1)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS hero_image TEXT;
