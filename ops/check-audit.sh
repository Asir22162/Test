#!/usr/bin/env bash
set -euo pipefail

AUDIT_FILE="${1:-audit.json}"

if [ ! -f "$AUDIT_FILE" ]; then
  echo "No audit file at $AUDIT_FILE; skipping audit checks."
  exit 0
fi

echo "--- Dependency audit file: $AUDIT_FILE ---"
cat "$AUDIT_FILE"

# Detect high/critical issues across common audit outputs
if grep -qi '"severity"\s*:\s*"\(high\|critical\)"' "$AUDIT_FILE" || \
   grep -qi '"high"\s*:\s*[1-9]' "$AUDIT_FILE" || \
   grep -qi '"critical"\s*:\s*[1-9]' "$AUDIT_FILE"; then
  echo "::error file=$AUDIT_FILE::High or critical vulnerabilities detected in dependencies. See artifact 'dependency-audit' for details."

  # Optional alert via webhook (Slack or Teams)
  WEBHOOK_URL="${AUDIT_ALERT_WEBHOOK:-}"
  ALERT_TYPE="${AUDIT_ALERT_TYPE:-slack}" # 'slack' or 'teams'
  REPO="${GITHUB_REPOSITORY:-unknown}"
  RUN_ID="${GITHUB_RUN_ID:-unknown}"
  RUN_URL="${GITHUB_SERVER_URL:-}"/"${GITHUB_REPOSITORY:-}"/actions/runs/${RUN_ID}

  if [ -n "$WEBHOOK_URL" ]; then
    echo "Sending alert to webhook (type=$ALERT_TYPE)"

    # Try to extract a short top-N summary using the node helper
    SUM_JSON="$(node ops/check-audit.js "$AUDIT_FILE" 2>/dev/null || echo '{}')"
    TOP_COUNT=$(echo "$SUM_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')||'{}'); console.log(s.count||0)")
    TOP_ITEMS=$(echo "$SUM_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')||'{}'); (s.top||[]).forEach(i=>console.log('- '+(i.severity||'')+' '+(i.package||'')+': '+(i.title||'')+(i.url?(' ('+i.url+')') : '')+(i.suggestedFix?(' | suggested: '+i.suggestedFix):'')+(i.suggestedCommand?(' | cmd: '+i.suggestedCommand):'')))")

    SUMMARY="High/Critical vulnerabilities detected in dependencies for $REPO (run: $RUN_ID). Top $TOP_COUNT items:"\n"$TOP_ITEMS"

    if [ "$ALERT_TYPE" = "teams" ]; then
      PAYLOAD=$(cat <<EOF
{"text": "${SUMMARY//"/\"}"}
EOF
)
      if command -v curl >/dev/null 2>&1; then
        curl -s -X POST -H 'Content-Type: application/json' -d "$PAYLOAD" "$WEBHOOK_URL" || echo "Warning: failed to send Teams webhook"
      else
        echo "curl not found; cannot send Teams webhook"
      fi
    else
      PAYLOAD=$(cat <<EOF
{"text":"${SUMMARY//"/\"}\nRepository: $REPO\nRun: $RUN_ID\nSee artifact: dependency-audit"}
EOF
)
      if command -v curl >/dev/null 2>&1; then
        curl -s -X POST -H 'Content-Type: application/json' -d "$PAYLOAD" "$WEBHOOK_URL" || echo "Warning: failed to send Slack webhook"
      else
        echo "curl not found; cannot send Slack webhook"
      fi
    fi
  else
    echo "No AUDIT_ALERT_WEBHOOK configured; skipping external alert"
  fi

  exit 1
fi

echo "No high/critical vulnerabilities found in $AUDIT_FILE"
exit 0
