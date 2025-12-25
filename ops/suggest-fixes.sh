#!/usr/bin/env bash
set -euo pipefail

AUDIT_FILE="${1:-audit.json}"
RUN_FIXES=false
PUSH_PR=false
BRANCH_PREFIX="auto/dep-fix"
BRANCH_NAME=""
PR_TITLE="chore(deps): apply automated security fixes"
PR_BODY="This PR contains automated dependency fixes suggested by audit tools. Please review and test before merging."

# parse flags
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --run)
      RUN_FIXES=true; shift;;
    --push)
      PUSH_PR=true; shift;;
    --branch)
      BRANCH_NAME="$2"; shift 2;;
    --help)
      echo "Usage: $0 [audit.json] [--run] [--push] [--branch BRANCH_NAME]"; exit 0;;
    *) shift;;
  esac
done

if [ ! -f "$AUDIT_FILE" ]; then
  echo "Audit file $AUDIT_FILE not found"; exit 1
fi

# Extract suggested commands from check-audit.js
SUGGESTED_JSON=$(node ops/check-audit.js "$AUDIT_FILE" 2>/dev/null || echo '{}')
COUNT=$(echo "$SUGGESTED_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')||'{}'); console.log((s.top||[]).length)")
if [ "$COUNT" -eq 0 ]; then
  echo "No suggested fixes found (top list empty)."; exit 0
fi

# Build commands file
COMMANDS_FILE="ops/suggested-fixes.sh"
echo "#!/usr/bin/env bash" > "$COMMANDS_FILE"
echo "set -euo pipefail" >> "$COMMANDS_FILE"

echo "Found $COUNT suggested fix(es):"
echo "$SUGGESTED_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')||'{}'); (s.top||[]).forEach(i=>console.log((i.suggestedCommand||i.suggestedFix||'').trim()))" | nl -w2 -s'. '

# Append commands to the generated script and also list them
echo "" >> "$COMMANDS_FILE"
echo "# Suggested fix commands" >> "$COMMANDS_FILE"
echo "$SUGGESTED_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')||'{}'); (s.top||[]).forEach(i=>{ const cmd=(i.suggestedCommand||'').trim(); if(cmd) console.log(cmd); })" >> "$COMMANDS_FILE"
chmod +x "$COMMANDS_FILE"

if [ "$RUN_FIXES" = false ]; then
  echo "Generated suggested fixes script at $COMMANDS_FILE"
  echo "To execute the fixes locally review the commands, then run:"
  echo "  bash $COMMANDS_FILE"
  echo "Or run this helper with --run to execute and create a branch:"
  echo "  bash ops/suggest-fixes.sh $AUDIT_FILE --run [--push] [--branch BRANCH_NAME]"
  exit 0
fi

# Running fixes: prepare branch
if [ -z "$BRANCH_NAME" ]; then
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  BRANCH_NAME="$BRANCH_PREFIX-$TIMESTAMP"
fi

echo "Executing suggested fixes and creating branch: $BRANCH_NAME"

git fetch origin || true

git checkout -b "$BRANCH_NAME"

# Run suggested commands
bash "$COMMANDS_FILE" || {
  echo "Suggested fixes failed; aborting and leaving working tree for inspection"; exit 1
}

# Stage typical files changed by package updates
CHANGED=false
for f in package.json package-lock.json pnpm-lock.yaml yarn.lock; do
  if git status --porcelain -- "$f" | grep -q '.'; then
    git add "$f" && CHANGED=true
  fi
done

if [ "$CHANGED" = false ]; then
  echo "No lockfile or package.json changes detected after running fixes. Nothing to commit."; exit 0
fi

COMMIT_MSG="$PR_TITLE (auto)

Audit file: $AUDIT_FILE
Commands executed: see ops/suggested-fixes.sh"

git commit -m "$COMMIT_MSG" || echo "No changes to commit"

if [ "$PUSH_PR" = false ]; then
  echo "Branch created locally: $BRANCH_NAME. Review changes and push or run with --push to create a PR."
  exit 0
fi

# Push and open PR if requested and GITHUB_TOKEN available
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "GITHUB_TOKEN not set; cannot push or open PR. Branch is local: $BRANCH_NAME"; exit 0
fi

# Push branch
git push origin "$BRANCH_NAME"

# Create PR via GitHub API
REPO="${GITHUB_REPOSITORY:-}"
API="https://api.github.com/repos/$REPO/pulls"
BODY=$(jq -nc --arg t "$PR_TITLE" --arg b "$BRANCH_NAME" --arg m "$PR_BODY" '{title:$t, head:$b, base:"main", body:$m}')

echo "Creating Pull Request..."
RESP=$(curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" -H "Content-Type: application/json" -d "$BODY" "$API")
PR_URL=$(echo "$RESP" | node -e "try{const r=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(r.html_url||'') }catch(e){console.log('')}")
if [ -n "$PR_URL" ]; then
  echo "PR created: $PR_URL"
else
  echo "Failed to create PR. Response: $RESP"
fi

exit 0
