#!/usr/bin/env python3
from pathlib import Path
import subprocess

text = Path("/var/www/parallaxmusic/.env").read_text(encoding="utf-8", errors="replace")
url = None
wl = None
for line in text.splitlines():
    s = line.strip()
    if s.startswith("DATABASE_URL="):
        url = s.split("=", 1)[1].strip().strip('"').strip("'")
    if s.startswith("TBANK_WEBHOOK_IP_WHITELIST="):
        wl = s
sql = "SELECT id, status, payment_id, user_email, paid_at FROM orders WHERE id = '09ed230a-fa15-4a70-88ee-4083afbebbd7';"
subprocess.run(["psql", url, "-c", sql], check=False)
print(wl)
p = Path("/var/www/parallaxmusic/_manual_fulfill_order.ts")
print("manual_script_exists", p.exists())
if p.exists():
    p.unlink()
    print("manual_script_removed")
