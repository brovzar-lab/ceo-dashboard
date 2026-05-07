#!/bin/bash
# Notion → Obsidian Brain Ingest Pipeline
# Pulls new content from Notion API and deposits structured .md files into the vault.
# Designed to run via launchd every 6 hours.
#
# Requires: NOTION_API_TOKEN in ~/.vault-sync-env or vault .env

set -euo pipefail

VAULT_DIR="/Users/quantumcode/CODE/OBSIDIAN BRAIN"
SCRIPTS_DIR="$VAULT_DIR/raw/notes"
LOGFILE="/tmp/notion-ingest.log"
STATUS_FILE="$HOME/.notion-ingest-status.json"

# Load env
if [ -f "$VAULT_DIR/.env" ]; then
  export $(grep -v '^#' "$VAULT_DIR/.env" | xargs)
fi

cd "$VAULT_DIR" || exit 1

echo "[$(date)] Starting Notion ingest" >> "$LOGFILE"

# Check for API token
if [ -z "${NOTION_API_TOKEN:-}" ]; then
  echo "[$(date)] ERROR: NOTION_API_TOKEN not set" >> "$LOGFILE"
  echo "{\"status\":\"error\",\"phase\":\"env\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"message\":\"NOTION_API_TOKEN not set\"}" > "$STATUS_FILE"
  exit 1
fi

ERRORS=0
EXTRACTED=0

# ── Step 1: Extract meetings from Notion ──────────────────────
echo "[$(date)] Step 1: Extracting meetings..." >> "$LOGFILE"
if python3 "$SCRIPTS_DIR/notion-extract-all-meetings.py" >> "$LOGFILE" 2>&1; then
  echo "[$(date)] Meetings extracted OK" >> "$LOGFILE"
  EXTRACTED=$((EXTRACTED + 1))
else
  echo "[$(date)] WARNING: Meeting extraction failed" >> "$LOGFILE"
  ERRORS=$((ERRORS + 1))
fi

# ── Step 2: Extract PLAUD transcripts ──────────────────────────
echo "[$(date)] Step 2: Extracting PLAUD transcripts..." >> "$LOGFILE"
if python3 "$SCRIPTS_DIR/notion-extract-plaud.py" >> "$LOGFILE" 2>&1; then
  echo "[$(date)] PLAUD transcripts extracted OK" >> "$LOGFILE"
  EXTRACTED=$((EXTRACTED + 1))
else
  echo "[$(date)] WARNING: PLAUD extraction failed" >> "$LOGFILE"
  ERRORS=$((ERRORS + 1))
fi

# ── Step 3: Extract general Notion pages ───────────────────────
echo "[$(date)] Step 3: Extracting Notion pages..." >> "$LOGFILE"
if python3 "$SCRIPTS_DIR/notion-extract.py" >> "$LOGFILE" 2>&1; then
  echo "[$(date)] Notion pages extracted OK" >> "$LOGFILE"
  EXTRACTED=$((EXTRACTED + 1))
else
  echo "[$(date)] WARNING: Notion page extraction failed" >> "$LOGFILE"
  ERRORS=$((ERRORS + 1))
fi

# ── Step 4: Dedup check ───────────────────────────────────────
echo "[$(date)] Step 4: Running dedup check..." >> "$LOGFILE"
if python3 "$SCRIPTS_DIR/dedup-check.py" >> "$LOGFILE" 2>&1; then
  echo "[$(date)] Dedup check OK" >> "$LOGFILE"
else
  echo "[$(date)] WARNING: Dedup check failed" >> "$LOGFILE"
  ERRORS=$((ERRORS + 1))
fi

# ── Step 5: Commit + push if changes ─────────────────────────
git add -A 2>> "$LOGFILE"

if ! git diff --cached --quiet; then
  CHANGED=$(git diff --cached --stat | tail -1)
  git commit -m "notion-ingest $(date +%Y-%m-%d_%H:%M): $CHANGED" >> "$LOGFILE" 2>&1
  
  if git push --quiet 2>> "$LOGFILE"; then
    echo "[$(date)] Pushed ingest changes" >> "$LOGFILE"
    DOC_COUNT=$(find "$VAULT_DIR" -name "*.md" -not -path "*/.git/*" | wc -l | tr -d ' ')
    echo "{\"status\":\"ok\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"extracted\":$EXTRACTED,\"errors\":$ERRORS,\"docs\":$DOC_COUNT}" > "$STATUS_FILE"
  else
    echo "[$(date)] ERROR: Push failed after ingest" >> "$LOGFILE"
    echo "{\"status\":\"error\",\"phase\":\"push\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"extracted\":$EXTRACTED,\"errors\":$ERRORS}" > "$STATUS_FILE"
  fi
else
  echo "[$(date)] No new content from Notion" >> "$LOGFILE"
  echo "{\"status\":\"ok\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"extracted\":$EXTRACTED,\"errors\":$ERRORS,\"new_content\":false}" > "$STATUS_FILE"
fi

echo "[$(date)] Notion ingest complete (extracted=$EXTRACTED, errors=$ERRORS)" >> "$LOGFILE"

# Keep log trimmed
tail -500 "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
