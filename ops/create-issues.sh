#!/usr/bin/env bash
set -euo pipefail

# Helper to create GitHub Issues from docs/tasks/issues/*.md
# Requires: gh CLI authenticated locally (https://cli.github.com/)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ISSUE_DIR="$ROOT_DIR/docs/tasks/issues"

for f in "$ISSUE_DIR"/*.md; do
  title=$(sed -n '1p' "$f" | sed 's/^Title: //')
  labels=$(sed -n '3p' "$f" | sed 's/^Labels: //')
  echo "Creating issue: $title"
  gh issue create --title "$title" --label "$labels" --body-file "$f"
done

echo "All issues created."
