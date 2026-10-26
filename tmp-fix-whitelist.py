#!/usr/bin/env python3
from pathlib import Path

p = Path("/var/www/parallaxmusic/.env")
text = p.read_text(encoding="utf-8")
key = "TBANK_WEBHOOK_IP_WHITELIST="
lines = text.splitlines(keepends=True)
out = []
updated = False
for line in lines:
    if line.startswith(key):
        raw = line[len(key) :].strip()
        ips = [x.strip() for x in raw.split(",") if x.strip()]
        for extra in ("91.194.226.212", "91.194.226.220"):
            if extra not in ips:
                ips.append(extra)
                updated = True
        # keep stable order
        ips = sorted(set(ips), key=lambda x: (x.count("."), x))
        out.append(key + ",".join(ips) + "\n")
    else:
        out.append(line)
if not any(l.startswith(key) for l in lines):
    raise SystemExit("TBANK_WEBHOOK_IP_WHITELIST missing")
p.write_text("".join(out), encoding="utf-8")
print("updated" if updated else "already_ok")
print([l.strip() for l in p.read_text(encoding="utf-8").splitlines() if l.startswith(key)][0])
