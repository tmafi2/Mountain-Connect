#!/bin/bash
#
# scripts/fb-monitor/run.sh <region>
#
# One scheduled pass for one region: collect -> extract -> import.
# Invoked by launchd, one job per region (see install.ts).
#
#   ./scripts/fb-monitor/run.sh japan
#
# Everything about WHAT it watches lives in groups.json, never here — add a
# group by editing that file, with no shell or plist changes and no reload.
#
# Runs under launchd, which provides almost no environment: no PATH beyond the
# system default, no shell profile, no nvm. Every tool is called by absolute
# path and the working directory is set explicitly.
#
# Failures are loud by construction. Every exit path goes through die(), and an
# EXIT trap catches whatever die() does not, so a run that dies at 6am reaches
# your inbox rather than a log nobody opens.

set -uo pipefail

REPO="/Users/tylermafi/projects/mountain-connect"
NPM="/usr/local/bin/npm"
NODE="/usr/local/bin/node"

# launchd does not guarantee HOME, and `set -u` turns an unset one into an
# immediate abort before anything is logged — the worst failure mode for a job
# nobody watches.
HOME="${HOME:-/Users/tylermafi}"
LOG_DIR="$HOME/.mountain-connect/logs"

REGION="${1:-}"
if [[ -z "$REGION" ]]; then
  echo "usage: run.sh <region>   (regions are the keys in groups.json)" >&2
  exit 2
fi

LOG="$LOG_DIR/fb-monitor-$(date +%Y-%m-%d).log"
mkdir -p "$LOG_DIR"

log() { printf '%s  [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')" "$REGION" "$*" >> "$LOG"; }

notify() {
  local subject="$1"
  tail -40 "$LOG" > "$LOG.excerpt" 2>/dev/null || true
  ( cd "$REPO" 2>/dev/null && "$NPM" run fb:notify --silent -- \
      --subject "$subject" --body-file "$LOG.excerpt" ) >> "$LOG" 2>&1 \
    || log "note: alert could not be sent (see above)"
  rm -f "$LOG.excerpt"
}

NOTIFIED=0
die() {
  log "FATAL: $1"
  notify "fb-monitor [$REGION] FAILED — $(date '+%b %d %H:%M')"
  NOTIFIED=1
  exit 1
}

COMPLETED=0
on_exit() {
  local code=$?
  # die() has already sent one; without this every handled failure would send
  # two emails, since die's own exit triggers this trap.
  if [[ "$NOTIFIED" -eq 1 ]]; then return; fi
  if [[ "$COMPLETED" -eq 0 && "$code" -ne 0 ]]; then
    log "FATAL: exited unexpectedly (code $code)"
    notify "fb-monitor [$REGION] exited unexpectedly — $(date '+%b %d %H:%M')"
  fi
}
trap on_exit EXIT

# Jitter. launchd fires exactly on the minute; jobs landing at precisely
# 06:00:00 every day are both discourteous and the most obvious automation
# signature available. Spread each run over the following quarter hour.
# FB_MONITOR_NO_JITTER=1 skips it when testing by hand.
if [[ "${FB_MONITOR_NO_JITTER:-0}" == "1" ]]; then JITTER=0; else JITTER=$(( RANDOM % 900 )); fi
log "=== run starting (sleeping ${JITTER}s of jitter) ==="
sleep "$JITTER"

cd "$REPO" || die "cannot cd to $REPO — has the repo moved?"

# --- read this region's config -------------------------------------------
CONFIG="$REPO/scripts/fb-monitor/groups.json"
[[ -f "$CONFIG" ]] || die "groups.json not found at $CONFIG"

GROUPS_RAW="$("$NODE" -e '
  const fs = require("fs");
  const cfg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const region = cfg[process.argv[2]];
  if (!region) { console.error("no such region"); process.exit(3); }
  const groups = [...new Set(region.groups || [])];
  console.log(JSON.stringify({ groups, posts: region.postsPerGroup || 20 }));
' "$CONFIG" "$REGION" 2>>"$LOG")" || die "region \"$REGION\" is not in groups.json"

POSTS_PER_GROUP="$("$NODE" -e 'console.log(JSON.parse(process.argv[1]).posts)' "$GROUPS_RAW")"
mapfile -t FB_GROUPS < <("$NODE" -e 'JSON.parse(process.argv[1]).groups.forEach(g=>console.log(g))' "$GROUPS_RAW")

if [[ "${#FB_GROUPS[@]}" -eq 0 ]]; then
  # Not a failure. An empty region is a region you have not filled in yet.
  COMPLETED=1
  log "no groups configured for this region — nothing to do"
  exit 0
fi

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
EXTRACT_FILE="$("$NPM" run fb:extract --silent -- --file "$POSTS_FILE" --limit 500 2>>"$LOG")"
if [[ -z "$EXTRACT_FILE" || ! -f "$EXTRACT_FILE" ]]; then
  die "extract produced no results file"
fi
log "extract: wrote $EXTRACT_FILE"

# --- 3. import ------------------------------------------------------------
log "import: committing"
if "$NPM" run fb:import --silent -- --file "$EXTRACT_FILE" --commit >>"$LOG" 2>&1; then
  COMPLETED=1
  log "=== run complete ==="
  # Marker so a staleness check can tell "quiet day" from "has not run in days".
  date '+%Y-%m-%dT%H:%M:%S%z' > "$LOG_DIR/last-success-$REGION"
else
  die "import failed"
fi
