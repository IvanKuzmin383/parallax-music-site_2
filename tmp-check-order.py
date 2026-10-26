#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ORDER = "09ed230a-fa15-4a70-88ee-4083afbebbd7"
EMAIL = "slavic.winter@yandex.ru"
PAY = "9513192631"

text = Path("/var/www/parallaxmusic/.env").read_text(encoding="utf-8", errors="replace")
url = None
for line in text.splitlines():
    s = line.strip()
    if s.startswith("DATABASE_URL="):
        url = s.split("=", 1)[1].strip().strip('"').strip("'")
        break
if not url:
    sys.exit("no DATABASE_URL")

sql = f"""
\\echo === ORDER BY ID ===
SELECT id, order_type, status, payment_id, user_email, plan_id, period, periods_count, total_amount, created_at, paid_at, user_id, is_recurring_renewal
FROM orders WHERE id = '{ORDER}';

\\echo === ORDERS BY EMAIL ===
SELECT id, order_type, status, payment_id, user_email, plan_id, total_amount, created_at, paid_at
FROM orders WHERE LOWER(user_email) = LOWER('{EMAIL}')
ORDER BY created_at DESC;

\\echo === CABINET USER ===
SELECT id, email, artist_name, subscription_name, subscription_expires_at, created_at, disabled
FROM cabinet_users WHERE LOWER(email) = LOWER('{EMAIL}');

\\echo === BY PAYMENT ID ===
SELECT id, order_type, status, payment_id, user_email, total_amount, created_at, paid_at
FROM orders WHERE payment_id = '{PAY}' OR payment_id LIKE '%{PAY}%';
"""
Path("/tmp/check-order.sql").write_text(sql, encoding="utf-8")
r = subprocess.run(["psql", url, "-v", "ON_ERROR_STOP=1", "-f", "/tmp/check-order.sql"], check=False)
raise SystemExit(r.returncode)
