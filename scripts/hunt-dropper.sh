#!/usr/bin/env bash
# Copyright (c) 2026 Perpetuator LLC
#
# Machine-wide hunt for the cc-fe eslint.config.js dropper and its web3
# dead-drop C2 indicators. Unlike `find ... | xargs strings | grep` (which
# loses the file name once strings strips it), this records BOTH the file path
# AND the matched indicator, and logs everything.
#
# It scans file CONTENTS as text even for binaries/executables (grep -a), so it
# finds the ASCII indicators embedded in compiled binaries, .md, .js, .json, etc.
# It is pure read-only grep and NEVER executes anything it finds.
#
# Usage:
#   ./scripts/hunt-dropper.sh                  # high-value roots (fast)
#   sudo ./scripts/hunt-dropper.sh --full      # ENTIRE filesystem (slow)
#   sudo ./scripts/hunt-dropper.sh /a /b ...   # specific roots
#   LOG=/tmp/hunt.log JOBS=12 ./scripts/hunt-dropper.sh
#
# Run with sudo to read root-owned / other-user files. Matches stream to stdout
# AND append to $LOG as: <file>:<matched-indicator>
set -uo pipefail

LOG="${LOG:-$HOME/dropper-hunt-$(date +%Y%m%d-%H%M%S).log}"
JOBS="${JOBS:-8}"

# ---- roots ------------------------------------------------------------------
roots=()
if [ "${1:-}" = "--full" ]; then roots=(/); shift; fi
if [ "$#" -gt 0 ]; then roots+=("$@"); fi
if [ "${#roots[@]}" -eq 0 ]; then
  for r in "$HOME" /usr/local /opt /private/tmp /tmp /Library /usr/lib /usr/share; do
    [ -e "$r" ] && roots+=("$r")
  done
fi

# ---- indicators -------------------------------------------------------------
# The two obfuscation markers are assembled from fragments so this script does
# not match itself (and does not trip scripts/scan-for-malware.sh).
PF="$(mktemp -t dropper-patterns)"; trap 'rm -f "$PF"' EXIT
{
  printf '%s\n' "fromCharCode""(127)"                                     # decoder marker
  printf '%s\n' "global['""!']"                                           # loader marker
  printf '%s\n' "9-0474-4"                                                # campaign id
  printf '%s\n' "TMfKQEd7TJJa5xNZJZ2Lep838vrzrs7mAP"                      # TRON dead-drop #1
  printf '%s\n' "TXfxHUet9pJVU1BgVkBAbrES4YUc1nGzcG"                      # TRON dead-drop #2
  printf '%s\n' "0xbe037400670fbf1c32364f762975908dc43eeb38759263e7dfcdabc76380811e"  # APTOS #1
  printf '%s\n' "0x3f0e5781d0855fb460661ac63257376db1941b2bb522499e4757ecb3ebd5dce3"  # APTOS #2
  printf '%s\n' "api.trongrid.io"
  printf '%s\n' "fullnode.mainnet.aptoslabs.com"
  printf '%s\n' "bsc-dataseed.binance.org"
  printf '%s\n' "bsc-rpc.publicnode.com"
} > "$PF"

echo "[*] hunt starting"
echo "[*] roots: ${roots[*]}"
echo "[*] log:   $LOG"
echo "[*] indicators:"; sed 's/^/      /' "$PF"
echo "[*] scanning (this can take a while with --full)..."

# Prune pseudo/virtual filesystems and macOS firmlink duplicates; treat binaries
# as text (-a); print file + only the matched indicator (-o -H) via a fixed-string
# pattern file (-F -f). Parallelised across files.
find "${roots[@]}" \
  \( -path /dev -o -path /proc -o -path /sys -o -path /Volumes \
     -o -path /System/Volumes -o -path /private/var/vm -o -path '*/.Trash' \
     -o -fstype devfs \) -prune -o -type f -print0 2>/dev/null \
| xargs -0 -P "$JOBS" -n 64 grep -aoHFf "$PF" 2>/dev/null \
| grep -vE '/(hunt-dropper\.sh|scan-for-malware\.sh|watch-file-writes\.sh|SECURITY-eslint-malware\.md):' \
| tee -a "$LOG"

echo
echo "[*] hunt complete. Lines above are '<file>:<indicator>'. Full log: $LOG"
echo "[*] If ANYTHING matched outside this repo's own cleaned files, treat that"
echo "    file as the dropper source and quarantine it."
