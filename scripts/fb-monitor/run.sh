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

REPO="/Users/tylermafi/projects/mountain-connect"
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

# Email the last stretch of the log. Best effort by design: a broken alert must
# never mask the failure it is reporting, so notify failures go to the log and
# are otherwise swallowed.
notify() {
  local subject="$1"
  tail -40 "$LOG" > "$LOG.excerpt" 2>/dev/null || true
  ( cd "$REPO" 2>/dev/null && "$NPM" run fb:notify --silent -- \
      --subject "$subject" --body-file "$LOG.excerpt" ) >> "$LOG" 2>&1 \
    || log "note: alert could not be sent (see above)"
  rm -f "$LOG.excerpt"
}

# Every failure path goes through here, so none can exit quietly.
NOTIFIED=0
die() {
  log "FATAL: $1"
  notify "fb-monitor FAILED — $(date '+%b %d %H:%M')"
  NOTIFIED=1
  exit 1
}

# Catches what die() does not: an unhandled error, a killed process, anything
# that ends the script without reaching "run complete". Without this, only the
# failures someone anticipated would ever be reported.
COMPLETED=0
on_exit() {
  local code=$?
  # die() has already sent one; without this check every handled failure would
  # send two emails, since die's own exit triggers this trap.
  if [[ "$NOTIFIED" -eq 1 ]]; then return; fi
  if [[ "$COMPLETED" -eq 0 && "$code" -ne 0 ]]; then
    log "FATAL: exited unexpectedly (code $code)"
    notify "fb-monitor exited unexpectedly — $(date '+%b %d %H:%M')"
  fi
}
trap on_exit EXIT

# Jitter. launchd fires exactly on the minute; three sessions a day landing at
# precisely 06:00:00 is both discourteous to the service and the most obvious
# automation signature available. Spread each run over the following quarter
# hour. This is politeness and load-spreading, not concealment.
# FB_MONITOR_NO_JITTER=1 skips the wait when testing the chain by hand.
if [[ "${FB_MONITOR_NO_JITTER:-0}" == "1" ]]; then JITTER=0; else JITTER=$(( RANDOM % 900 )); fi
log "=== run starting (sleeping ${JITTER}s of jitter) ==="
sleep "$JITTER"

cd "$REPO" || die "cannot cd to $REPO — has the repo moved?"

# --- 1. collect -----------------------------------------------------------
ARGS=()
for g in "${FB_GROUPS[@]}"; do ARGS+=(--group "$g"); done

log "collect: ${#FB_GROUPS[@]} group(s), up to $POSTS_PER_GROUP posts each"
POSTS_FILE="$("$NPM" run fb:collect --silent -- "${ARGS[@]}" --posts "$POSTS_PER_GROUP" 2>>"$LOG")"
if [[ -z "$POSTS_FILE" || ! -f "$POSTS_FILE" ]]; then
  die "collect produced no posts file — the Facebook session may have expired. Run: npm run fb:login"
fi
log "collect: wrote $POSTS_FILE"

# --- 2. extract -----------------------------------------------------------
log "extract: starting"
EXTRACT_FILE="$("$NPM" run fb:extract --silent -- --file "$POSTS_FILE" --limit 100 2>>"$LOG")"
if [[ -z "$EXTRACT_FILE" || ! -f "$EXTRACT_FILE" ]]; then
  die "extract produced no results file"
fi
log "extract: wrote $EXTRACT_FILE"

# --- 3. import ------------------------------------------------------------
log "import: committing"
if "$NPM" run fb:import --silent -- --file "$EXTRACT_FILE" --commit >>"$LOG" 2>&1; then
  COMPLETED=1
  log "=== run complete ==="
  # Touch a marker so a staleness check can tell "no new posts today" from
  # "this has not run successfully in days".
  date '+%Y-%m-%dT%H:%M:%S%z' > "$LOG_DIR/last-success"
else
  die "import failed"
fi
