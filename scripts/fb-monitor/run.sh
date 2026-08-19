#!/bin/bash
#
# scripts/fb-monitor/run.sh
#
# One scheduled pass: collect -> extract -> import.
# Invoked by launchd at 06:00, 12:00 and 18:00 (see com.mountainconnects.fbmonitor.plist).
#
# Runs under launchd, which provides almost no environment: no PATH beyond the
# system default, no shell profile, no nvm. Every tool is therefore called by
# absolute path, and the working directory is set explicitly.
#
# Exit codes matter here — launchd logs them, and a silent failure at 6am that
# nobody notices for a week is the failure mode worth guarding against. Each
# stage aborts the run if it fails, and everything is logged with timestamps.

set -uo pipefail

REPO="/Users/tylermafi/Desktop/Mountain Connect"
NPM="/usr/local/bin/npm"
# launchd does not guarantee HOME, and `set -u` turns an unset one into an
# immediate abort before anything is logged — which is the worst possible
# failure mode for a job nobody watches.
HOME="${HOME:-/Users/tylermafi}"
LOG_DIR="$HOME/.mountain-connect/logs"
LOG="$LOG_DIR/fb-monitor-$(date +%Y-%m-%d).log"

# NB: not GROUPS — that is a read-only bash builtin holding the user's Unix
# group ids. Assigning to it is silently ignored, and ${#FB_GROUPS[@]} then reports
# however many Unix groups the account belongs to.
FB_GROUPS=(
  "https://www.facebook.com/groups/826037524168581"
  "https://www.facebook.com/groups/1162104401848557"
)
POSTS_PER_GROUP=20

mkdir -p "$LOG_DIR"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')" "$*" >> "$LOG"; }

# Jitter. launchd fires exactly on the minute; three sessions a day landing at
# precisely 06:00:00 is both discourteous to the service and the most obvious
# automation signature available. Spread each run over the following quarter
# hour. This is politeness and load-spreading, not concealment.
# FB_MONITOR_NO_JITTER=1 skips the wait when testing the chain by hand.
if [[ "${FB_MONITOR_NO_JITTER:-0}" == "1" ]]; then JITTER=0; else JITTER=$(( RANDOM % 900 )); fi
log "=== run starting (sleeping ${JITTER}s of jitter) ==="
sleep "$JITTER"

cd "$REPO" || { log "FATAL: cannot cd to $REPO"; exit 1; }

# --- 1. collect -----------------------------------------------------------
ARGS=()
for g in "${FB_GROUPS[@]}"; do ARGS+=(--group "$g"); done

log "collect: ${#FB_GROUPS[@]} group(s), up to $POSTS_PER_GROUP posts each"
POSTS_FILE="$("$NPM" run fb:collect --silent -- "${ARGS[@]}" --posts "$POSTS_PER_GROUP" 2>>"$LOG")"
if [[ -z "$POSTS_FILE" || ! -f "$POSTS_FILE" ]]; then
  log "FATAL: collect produced no posts file — session may have expired (npm run fb:login)"
  exit 1
fi
log "collect: wrote $POSTS_FILE"

# --- 2. extract -----------------------------------------------------------
log "extract: starting"
EXTRACT_FILE="$("$NPM" run fb:extract --silent -- --file "$POSTS_FILE" --limit 100 2>>"$LOG")"
if [[ -z "$EXTRACT_FILE" || ! -f "$EXTRACT_FILE" ]]; then
  log "FATAL: extract produced no results file"
  exit 1
fi
log "extract: wrote $EXTRACT_FILE"

# --- 3. import ------------------------------------------------------------
log "import: committing"
if "$NPM" run fb:import --silent -- --file "$EXTRACT_FILE" --commit >>"$LOG" 2>&1; then
  log "=== run complete ==="
else
  log "FATAL: import failed (exit $?)"
  exit 1
fi
