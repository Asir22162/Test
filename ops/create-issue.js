#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const file = process.argv[2] || 'audit-summary.json';
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}
const summary = readJson(path.resolve(process.cwd(), file));
if (!summary || !summary.count || summary.count === 0) {
  console.log('No high/critical vulnerabilities detected. No issue will be created.');
  process.exit(0);
}

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
const runId = process.env.GITHUB_RUN_ID || 'unknown';

if (!repo) {
  console.error('GITHUB_REPOSITORY not set; cannot create issue');
  process.exit(0);
}

if (!token) {
  console.error('GITHUB_TOKEN not set; skipping issue creation (to avoid leaking data without auth)');
  process.exit(0);
}

// Build issue title and body
const title = `[Security][Automated] High severity vulnerabilities found (${summary.count}) - audit run #${runId}`;

function formatTop(list) {
  if (!Array.isArray(list) || list.length === 0) return 'None';
  return list.map((it, i) => {
    const lines = [];
    lines.push(`${i+1}. **${it.package}** — *${it.severity}*`);
    if (it.title) lines.push(`   - ${it.title}`);
    if (it.url) lines.push(`   - ${it.url}`);
    if (it.suggestedCommand) lines.push(`   - Suggested: \`${it.suggestedCommand.replace(/`/g, "'")}\``);
    return lines.join('\n');
  }).join('\n');
}

let body = `Automated audit detected **${summary.count}** high/critical vulnerability(ies).

**Top items**:\n\n${formatTop(summary.top)}\n\n`;

// Attach small artifacts inline
try {
  const auditRaw = fs.readFileSync(path.resolve(process.cwd(), 'audit.json'), 'utf8');
  body += `---\n\n### audit.json (raw)\n\n\n\`\`\`json\n${auditRaw.slice(0, 20000)}\n\`\`\`\n\n`;
} catch (e) {
  body += '\n(Unable to read audit.json)\n';
}

try {
  const fixes = fs.readFileSync(path.resolve(process.cwd(), 'ops/suggested-fixes.sh'), 'utf8');
  body += `---\n\n### suggested fixes script (ops/suggested-fixes.sh)\n\n\`\`\`bash\n${fixes.slice(0, 20000)}\n\`\`\`\n\n`;
} catch (e) {
  body += '\n(No suggested fixes script found)\n';
}

body += `Artifacts (full) are available at the workflow run: ${serverUrl}/${repo}/actions/runs/${runId}\n\n`;
body += 'Please review the suggested fixes and create a PR or apply fixes manually.\n';

// Create issue via GitHub API with retry and non-fatal behavior
const postData = JSON.stringify({ title, body });

const optionsBase = {
  hostname: 'api.github.com',
  path: `/repos/${repo}/issues`,
  method: 'POST',
  headers: {
    'User-Agent': 'ops/suggest-fixes-bot',
    'Authorization': `token ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function sendWithRetries(attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const parsed = await new Promise((resolve, reject) => {
        const req = https.request(optionsBase, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try { resolve(JSON.parse(data)); } catch (e) { resolve({ raw: data }); }
            } else {
              reject({ code: res.statusCode, body: data });
            }
          });
        });
        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
      });
      console.log('Issue created:', parsed.html_url || '(no url returned)');
      return true;
    } catch (err) {
      console.error(`Attempt ${i} failed to create issue:`, err && err.code ? err.code : err);
      if (i < attempts) await wait(1000 * i); // backoff
    }
  }
  console.error('All attempts to create issue failed; continuing without blocking the workflow.');
  return false;
}

(async () => {
  try {
    await sendWithRetries();
    process.exit(0);
  } catch (e) {
    console.error('Unexpected error while creating issue:', e);
    process.exit(0);
  }
})();
