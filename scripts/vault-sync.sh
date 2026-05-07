#!/bin/bash
# Obsidian Brain vault sync — auto-commit, pull (picks up Railway decisions), and push
# Run by launchd every 30 minutes
# Writes status to ~/.vault-sync-status.json for monitoring

VAULT_DIR="/Users/quantumcode/CODE/OBSIDIAN BRAIN"
LOGFILE="/tmp/vault-sync.log"
STATUS_FILE="$HOME/.vault-sync-status.json"

cd "$VAULT_DIR" || exit 1

echo "[$(date)] Starting vault sync" >> "$LOGFILE"

# Pull first to get decisions pushed by Railway
if ! git pull --rebase --quiet 2>> "$LOGFILE"; then
  echo "[$(date)] ERROR: git pull failed" >> "$LOGFILE"
  echo "{\"status\":\"error\",\"phase\":\"pull\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"message\":\"git pull failed\"}" > "$STATUS_FILE"
  # Try to recover from rebase conflict
  git rebase --abort 2>/dev/null
fi

# Stage all changes (new notes, edits, etc.)
git add -A 2>> "$LOGFILE"

# Only commit if there are changes
if ! git diff --cached --quiet; then
  git commit -m "vault sync $(date +%Y-%m-%d_%H:%M)" 2>> "$LOGFILE"

  # Push with retry
  if git push --quiet 2>> "$LOGFILE"; then
    echo "[$(date)] Pushed vault changes" >> "$LOGFILE"
    DOC_COUNT=$(find "$VAULT_DIR" -name "*.md" -not -path "*/.git/*" | wc -l | tr -d ' ')
    echo "{\"status\":\"ok\",\"phase\":\"pushed\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"docs\":$DOC_COUNT}" > "$STATUS_FILE"
  else
    echo "[$(date)] ERROR: git push failed — retrying in 10s" >> "$LOGFILE"
    sleep 10
    if git push --quiet 2>> "$LOGFILE"; then
      echo "[$(date)] Push retry succeeded" >> "$LOGFILE"
      DOC_COUNT=$(find "$VAULT_DIR" -name "*.md" -not -path "*/.git/*" | wc -l | tr -d ' ')
      echo "{\"status\":\"ok\",\"phase\":\"pushed_retry\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"docs\":$DOC_COUNT}" > "$STATUS_FILE"
    else
      echo "[$(date)] ERROR: git push failed on retry — check for secrets or auth issues" >> "$LOGFILE"
      PUSH_ERR=$(git push 2>&1 | tail -5)
      echo "{\"status\":\"error\",\"phase\":\"push\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"message\":\"push failed after retry\",\"detail\":\"$(echo $PUSH_ERR | head -c 200)\"}" > "$STATUS_FILE"
    fi
  fi
else
  echo "[$(date)] No changes to commit" >> "$LOGFILE"
  DOC_COUNT=$(find "$VAULT_DIR" -name "*.md" -not -path "*/.git/*" | wc -l | tr -d ' ')
  echo "{\"status\":\"ok\",\"phase\":\"no_changes\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"docs\":$DOC_COUNT}" > "$STATUS_FILE"
fi

# Keep log from growing forever (last 500 lines)
tail -500 "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
