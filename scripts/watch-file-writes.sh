#!/usr/bin/env bash
# Copyright (c) 2026 Perpetuator LLC
#
# Record WHICH PROCESS writes/renames a watched file and alert in real time.
# If the dropper is ever re-injected, this captures the responsible process
# (executable path, pid, ppid, code-signing id) so you have forensic evidence
# of exactly what made the change and when.
#
# Backends (auto-detected, best first):
#   1. eslogger  - macOS 13+ EndpointSecurity. Gives the RESPONSIBLE PROCESS for
#                  each file event. Requires sudo AND your terminal app must have
#                  Full Disk Access (System Settings > Privacy & Security).
#   2. fs_usage  - macOS, sudo. Shows process+pid live (less structured).
#
# Alerts: appends to $LOG, fires a macOS notification, and (if ALERT_WEBHOOK is
# set) POSTs a JSON {"text": ...} to that URL (Slack/Mattermost/Matrix bridge).
#
# Usage:
#   sudo ./scripts/watch-file-writes.sh                      # default paths
#   sudo ./scripts/watch-file-writes.sh eslint.config.js .husky/
#   ALERT_WEBHOOK=https://hooks... sudo ./scripts/watch-file-writes.sh
set -uo pipefail

LOG="${LOG:-$HOME/file-write-audit.log}"
PATTERNS=("$@")
if [ "${#PATTERNS[@]}" -eq 0 ]; then
  PATTERNS=("eslint.config.js" "eslint.config.cjs" "eslint.config.mjs" "commitlint.config.js" ".husky/")
fi
# ERE alternation of the basenames, with dots escaped.
RE="$(printf '%s|' "${PATTERNS[@]}")"; RE="${RE%|}"; RE="$(printf '%s' "$RE" | sed 's/\./\\./g')"

alert() { # $1 = message
  printf '%s\n' "$1" >> "$LOG"
  if command -v osascript >/dev/null 2>&1; then
    msg="$(printf '%s' "$1" | tr '"' "'" | cut -c1-180)"
    osascript -e "display notification \"$msg\" with title \"cc-fe config-write ALERT\"" 2>/dev/null || true
  fi
  if [ -n "${ALERT_WEBHOOK:-}" ]; then
    payload="$(python3 -c 'import json,sys;print(json.dumps({"text":sys.argv[1]}))' "$1" 2>/dev/null)"
    [ -n "$payload" ] && curl -sf -m 5 -H 'Content-Type: application/json' -d "$payload" "$ALERT_WEBHOOK" >/dev/null 2>&1 || true
  fi
}

echo "[*] watching writes to: ${PATTERNS[*]}"
echo "[*] log: $LOG   webhook: ${ALERT_WEBHOOK:+enabled}"

if command -v eslogger >/dev/null 2>&1; then
  echo "[*] backend: eslogger (EndpointSecurity). Needs sudo + Full Disk Access."
  eslogger write create rename unlink 2>/dev/null | while IFS= read -r line; do
    printf '%s' "$line" | grep -Eq "$RE" || continue
    info="$(printf '%s' "$line" | RE="$RE" python3 - <<'PY'
import json,os,re,sys
rx=re.compile(os.environ["RE"])
try: e=json.loads(sys.stdin.read())
except Exception: sys.exit(0)
ev=e.get("event",{}) or {}
etype=next(iter(ev),"?")
paths=[]
def walk(o):
    if isinstance(o,dict):
        for k,v in o.items():
            (paths.append(v) if k=="path" and isinstance(v,str) else walk(v))
    elif isinstance(o,list):
        for v in o: walk(v)
walk(ev)
hit=[p for p in paths if rx.search(p)]
if not hit: sys.exit(0)
p=e.get("process",{}) or {}
exe=(p.get("executable") or {}).get("path","?")
pid=(p.get("audit_token") or {}).get("pid") or p.get("pid","?")
print(f'{e.get("time","?")} {etype} -> {hit[0]} BY pid={pid} ppid={p.get("ppid","?")} exe={exe} signing_id={p.get("signing_id","?")}')
PY
)"
    [ -n "$info" ] && { echo "$info"; alert "$info"; }
  done
elif command -v fs_usage >/dev/null 2>&1; then
  echo "[*] backend: fs_usage (sudo). Shows process+pid; less structured."
  fs_usage -w -f filesystem 2>/dev/null \
    | grep -E "$RE" | grep -Ei 'write|rename|truncate|open' \
    | while IFS= read -r line; do echo "$line"; alert "$line"; done
else
  echo "ERROR: neither eslogger (macOS 13+) nor fs_usage found." >&2
  exit 1
fi
