#!/usr/bin/env bash
# Copyright (c) 2026 Perpetuator LLC
#
# GENERIC (signature-free) detector for injected/obfuscated code. Where
# scan-for-malware.sh matches known IOCs (campaign id, addresses, domains), THIS
# flags the *shape* of a dropper, so it catches NEW variants with different
# strings, addresses, campaigns, or obfuscators:
#
#   1. Abnormally long lines in non-minified source/config — packers/obfuscators
#      emit one giant line (the cc-fe payload was a single ~3,500-char line).
#   2. Dynamic-exec / network / char-code primitives inside CONFIG files, which
#      have no legitimate reason to eval(), spawn processes, or open sockets.
#   3. CRLF line endings in an otherwise-LF repo — the injector rewrote EOLs.
#
# Pure read-only; never executes scanned code. Exit 1 if anything is flagged.
# These are HEURISTICS for review, not proof — tune the skip list for real assets.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

MAXLINE="${MAXLINE:-500}"
flagged=0

skip() {
  case "$1" in
    *.min.js|*.min.css|*.map|*.bundle.js|*.lock|yarn.lock|package-lock.json|*.svg|*.snap) return 0 ;;
    *graphql-types.ts|*.generated.*|*-generated.*|*_generated*|*/generated/*) return 0 ;;
    *scan-for-malware.sh|*scan-obfuscation.sh|*hunt-dropper.sh|*watch-file-writes.sh|*SECURITY-eslint-malware.md) return 0 ;;
    .husky/*|*/.husky/*) return 0 ;;
  esac
  return 1
}

# Rules 1 + 3: long lines / CRLF in tracked EXECUTABLE source (JS/TS). Markup
# (HTML/SCSS) legitimately has long lines (inline SVG, class lists), and the
# dropper always lives in executable JS — so scoping here kills the false
# positives without losing detection.
while IFS= read -r -d '' f; do
  skip "$f" && continue
  case "$f" in *.js|*.cjs|*.mjs|*.ts|*.tsx) ;; *) continue ;; esac
  LC_ALL=C grep -Iq . "$f" 2>/dev/null || continue   # skip binary
  maxlen=$(awk '{ if (length > m) m = length } END { print m + 0 }' "$f" 2>/dev/null)
  if [ "${maxlen:-0}" -gt "$MAXLINE" ]; then
    echo "  [long-line]   $f  (longest line: ${maxlen} chars)"; flagged=1
  fi
  if LC_ALL=C grep -q $'\r' "$f" 2>/dev/null; then
    echo "  [crlf]        $f  (CRLF in an LF repo)"; flagged=1
  fi
done < <(git ls-files -z 2>/dev/null)

# Rule 2: exec / network / char-code primitives inside CONFIG files.
while IFS= read -r -d '' f; do
  skip "$f" && continue
  case "$f" in *config*.js|*config*.cjs|*config*.mjs|*config*.ts|*.*rc.js|*.*rc.cjs) ;; *) continue ;; esac
  hits=$(LC_ALL=C grep -aoE \
    'eval\(|new Function|Function\(|child_process|\.spawn\(|\.fork\(|atob\(|fromCharCode|Buffer\.from\([^)]*(hex|base64)|require\((["'\''])(https?|net|dns|tls|child_process)' \
    "$f" 2>/dev/null | sort -u)
  if [ -n "$hits" ]; then
    echo "  [config-exec] $f has primitives unusual for a config file:"
    printf '%s\n' "$hits" | sed 's/^/                  /'
    flagged=1
  fi
done < <(git ls-files -z 2>/dev/null)

if [ "$flagged" -ne 0 ]; then
  echo
  echo "[REVIEW] Generic obfuscation indicators found above. Inspect each:"
  echo "         - a legit minified/generated asset? add it to skip() and re-run."
  echo "         - otherwise treat as a possible injection (see docs/SECURITY-eslint-malware.md)."
  exit 1
fi
echo "[OK] no generic obfuscation indicators ($(git ls-files | wc -l | tr -d ' ') files considered)"
