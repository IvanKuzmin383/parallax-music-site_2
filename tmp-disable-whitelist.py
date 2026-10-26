#!/usr/bin/env python3
from pathlib import Path

p = Path("/var/www/parallaxmusic/.env")
text = p.read_text(encoding="utf-8")
key = "TBANK_WEBHOOK_IP_WHITELIST="
out = []
removed = False
for line in text.splitlines(keepends=True):
    if line.startswith(key):
        removed = True
        out.append("# TBANK_WEBHOOK_IP_WHITELIST disabled — Token signature is enough; T-Bank IPs change\n")
        out.append("# " + line)
    else:
        out.append(line)

if not removed:
    raise SystemExit("active TBANK_WEBHOOK_IP_WHITELIST not found")

p.write_text("".join(out), encoding="utf-8")
active = [l for l in p.read_text(encoding="utf-8").splitlines() if l.startswith(key)]
print("active_lines:", active)
print("commented_ok")
