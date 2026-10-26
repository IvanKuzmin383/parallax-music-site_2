#!/usr/bin/env python3
from pathlib import Path
import os
import subprocess
import sys

env_path = Path("/var/www/parallaxmusic/.env")
env = os.environ.copy()
for line in env_path.read_text(encoding="utf-8", errors="replace").splitlines():
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
        continue
    k, v = s.split("=", 1)
    env[k] = v.strip().strip('"').strip("'")

script = Path("/var/www/parallaxmusic/_manual_fulfill_order.ts")
r = subprocess.run(
    ["./node_modules/.bin/tsx", str(script)],
    cwd="/var/www/parallaxmusic",
    env=env,
)
raise SystemExit(r.returncode)
