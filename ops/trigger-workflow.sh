#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-}"
TOKEN="${GITHUB_TOKEN:-}"
WORKFLOW_ID="${1:-suggest-fixes-dry-run.yml}"
REF="${2:-main}"

if [ -z "$REPO" ]; then
  echo "GITHUB_REPOSITORY must be set (owner/repo)"; exit 1
fi
if [ -z "$TOKEN" ]; then
  echo "GITHUB_TOKEN must be set to trigger workflow"; exit 1
fi

DISPATCH_URL="https://api.github.com/repos/$REPO/actions/workflows/$WORKFLOW_ID/dispatches"

echo "Triggering workflow $WORKFLOW_ID on ref $REF for repo $REPO"

curl -sS -X POST -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
  -d "{ \"ref\": \"$REF\" }" "$DISPATCH_URL"

echo "Triggered. You can monitor the run in the Actions UI or poll via the API."
