#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

let file;
let repo;
let token;
let serverUrl;
let runId;
let summary;
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

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

// Helper: request with retries; returns parsed JSON or Buffer
const doRequest = (opts, body = null, asBuffer = false, attempts = 3) => new Promise((resolve, reject) => {
  let tries = 0;
  const attempt = () => {
    tries++;
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (asBuffer) return resolve(buf);
          try { return resolve(JSON.parse(buf.toString())); } catch (e) { return resolve(buf.toString()); }
        }
        const err = { code: res.statusCode, body: buf.toString() };
        if (tries < attempts) {
          let delayBase = 1000;
          const fast = process.env.FAST_TEST_RETRIES;
          if (typeof fast !== 'undefined') {
            const parsed = Number(fast);
            if (!Number.isNaN(parsed)) delayBase = parsed;
            else if (String(fast).toLowerCase() === 'true') delayBase = 10;
          } else if (process.env.NODE_ENV === 'test') {
            delayBase = 10;
          }
          setTimeout(attempt, delayBase * tries);
        } else reject(err);
      });
    });
    req.on('error', (e) => {
      if (tries < attempts) {
        let delayBase = 1000;
        const fast = process.env.FAST_TEST_RETRIES;
        if (typeof fast !== 'undefined') {
          const parsed = Number(fast);
          if (!Number.isNaN(parsed)) delayBase = parsed;
          else if (String(fast).toLowerCase() === 'true') delayBase = 10;
        } else if (process.env.NODE_ENV === 'test') {
          delayBase = 10;
        }
        setTimeout(attempt, delayBase * tries);
      } else reject(e);
    });
    if (body) req.write(body);
    req.end();
  };
  attempt();
});

const deleteRelease = async (id) => {
  if (!id) return;
  try {
    await doRequest({ hostname: 'api.github.com', path: `/repos/${repo}/releases/${id}`, method: 'DELETE', headers: { 'User-Agent': 'ops/suggest-fixes-bot', 'Authorization': `token ${token}` } }, null, false, 1);
    console.log('Deleted release', id);
  } catch (e) {
    console.warn('Failed to delete release', id, e);
  }
};

// Optionally attach artifacts by creating a draft release and uploading artifact zip
const attachArtifacts = async () => {
  const attach = (process.env.ATTACH_ARTIFACT || 'false').toLowerCase();
  if (attach !== 'true') return null;
  console.log('ATTACH_ARTIFACT is enabled: attempting to attach artifacts to a draft release');

  const listOptions = { hostname: 'api.github.com', path: `/repos/${repo}/actions/artifacts?per_page=100`, method: 'GET', headers: { 'User-Agent': 'ops/suggest-fixes-bot', 'Authorization': `token ${token}` } };
  let artifacts;
  try { const res = await doRequest(listOptions); artifacts = res.artifacts || []; } catch (e) { console.warn('Failed to list artifacts', e); return null; }
  if (!Array.isArray(artifacts) || artifacts.length === 0) { console.warn('No artifacts found for this repo run'); return null; }

  const target = artifacts.find(a => a.name && a.name.includes('suggest-fixes')) || artifacts[0];
  if (!target) { console.warn('No suitable artifact found'); return null; }

  const downloadOptions = { hostname: 'api.github.com', path: `/repos/${repo}/actions/artifacts/${target.id}/zip`, method: 'GET', headers: { 'User-Agent': 'ops/suggest-fixes-bot', 'Authorization': `token ${token}` } };
  let zipBuffer;
  try { zipBuffer = await doRequest(downloadOptions, null, true); } catch (e) { console.warn('Failed to download artifact', e); return null; }

  const releaseDraft = (process.env.RELEASE_DRAFT || 'true').toLowerCase() === 'true';
  const tag = `audit-artifacts-run-${runId}-${Date.now()}`;
  const releaseBody = JSON.stringify({ tag_name: tag, name: `Audit artifacts run ${runId}`, body: `Artifacts for audit run ${runId}`, draft: releaseDraft, prerelease: false });
  const createRelOptions = { hostname: 'api.github.com', path: `/repos/${repo}/releases`, method: 'POST', headers: { 'User-Agent': 'ops/suggest-fixes-bot', 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(releaseBody) } };

  let release;
  try { release = await doRequest(createRelOptions, releaseBody); } catch (e) { console.warn('Failed to create release for artifacts', e); return null; }
  if (!release || !release.upload_url) { console.warn('Failed to create release for artifacts'); return null; }

  const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(target.name || 'artifact.zip')}`);
  const up = new URL(uploadUrl);
  const uploadOptions = { hostname: up.hostname, path: up.pathname + (up.search || ''), method: 'POST', headers: { 'User-Agent': 'ops/suggest-fixes-bot', 'Authorization': `token ${token}`, 'Content-Type': 'application/zip', 'Content-Length': zipBuffer.length } };

  try { await doRequest(uploadOptions, zipBuffer, false, 3); } catch (e) { console.warn('Failed to upload artifact after retries', e); try { await deleteRelease(release.id); } catch (ee) {} return null; }

  return release.html_url || null;
};

async function runCreateIssueMain(fileArg = 'audit-summary.json', opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const env = opts.env || process.env;
  // set module-scoped variables used by helper functions
  file = fileArg;
  summary = readJson(path.resolve(cwd, file));
  if (!summary || !summary.count || summary.count === 0) {
    console.log('No high/critical vulnerabilities detected. No issue will be created.');
    return 0;
  }
  repo = env.GITHUB_REPOSITORY;
  token = env.GITHUB_TOKEN;
  serverUrl = env.GITHUB_SERVER_URL || 'https://github.com';
  runId = env.GITHUB_RUN_ID || 'unknown';

  if (!repo) {
    console.error('GITHUB_REPOSITORY not set; cannot create issue');
    return 0;
  }

  if (!token) {
    console.error('GITHUB_TOKEN not set; skipping issue creation (to avoid leaking data without auth)');
    return 0;
  }

  // Export env into process for backward compatible helper usage and restore later
  const oldEnv = { ...process.env };
  Object.assign(process.env, env);

  // Build issue title and body now that we have summary, repo, runId, and serverUrl
  const title = `[Security][Automated] High severity vulnerabilities found (${summary.count}) - audit run #${runId}`;

  let body = `Automated audit detected **${summary.count}** high/critical vulnerability(ies).\n\n**Top items**:\n\n${formatTop(summary.top)}\n\n`;

  // Attach small artifacts inline
  try {
    const auditRaw = fs.readFileSync(path.resolve(cwd, 'audit.json'), 'utf8');
    body += `---\n\n### audit.json (raw)\n\n\n\`\`\`json\n${auditRaw.slice(0, 20000)}\n\`\`\`\n\n`;
  } catch (e) {
    body += '\n(Unable to read audit.json)\n';
  }

  try {
    const fixes = fs.readFileSync(path.resolve(cwd, 'ops/suggested-fixes.sh'), 'utf8');
    body += `---\n\n### suggested fixes script (ops/suggested-fixes.sh)\n\n\`\`\`bash\n${fixes.slice(0, 20000)}\n\`\`\`\n\n`;
  } catch (e) {
    body += '\n(No suggested fixes script found)\n';
  }

  body += `Artifacts (full) are available at the workflow run: ${serverUrl}/${repo}/actions/runs/${runId}\n\n`;
  body += 'Please review the suggested fixes and create a PR or apply fixes manually.\n';

  // Prepare POST payload and options for creating the issue
  const postData = JSON.stringify({ title, body });
  const options = {
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
          const req = https.request(options, (res) => {
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
        return parsed;
      } catch (err) {
        console.error(`Attempt ${i} failed to create issue:`, err && err.code ? err.code : err);
        if (i < attempts) await wait(1000 * i); // backoff
      }
    }
    console.error('All attempts to create issue failed; continuing without blocking the workflow.');
    return false;
  }

  try {
    const issue = await sendWithRetries();
    if (issue && issue.number) {
      try {
        const releaseUrl = await attachArtifacts();

        // Post a comment for the created issue (mention artifacts link if available)
        const commentBody = JSON.stringify({ body: releaseUrl ? `Full artifacts uploaded to draft release: ${releaseUrl}` : 'No artifacts uploaded for this run' });
        const commentOptions = {
          hostname: 'api.github.com',
          path: `/repos/${repo}/issues/${issue.number}/comments`,
          method: 'POST',
          headers: { 'User-Agent': 'ops/suggest-fixes-bot', 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(commentBody) }
        };
        try {
          await doRequest(commentOptions, commentBody);
          console.log('Posted artifacts link to issue.');
        } catch (e) {
          console.warn('Failed to post artifacts link to issue:', e);
        }

        // add standard labels to the created issue for easier triage (attempt even if artifacts unavailable)
        const labelsBody = JSON.stringify({ labels: ['security', 'audit'] });
        const labelOptions = {
          hostname: 'api.github.com',
          path: `/repos/${repo}/issues/${issue.number}/labels`,
          method: 'POST',
          headers: { 'User-Agent': 'ops/suggest-fixes-bot', 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(labelsBody) }
        };
        try {
          await doRequest(labelOptions, labelsBody);
          console.log('Added labels to issue.');
        } catch (e) {
          console.warn('Failed to add labels to issue:', e);
        }

      } catch (ee) {
        console.warn('Artifact attach step failed:', ee);
      }
    }
    return 0;
  } catch (e) {
    console.error('Unexpected error while creating issue:', e);
    return 0;
  } finally {
    // restore env
    if (typeof oldEnv !== 'undefined') {
      Object.assign(process.env, oldEnv);
    }
  }
}

if (require.main === module) {
  runCreateIssueMain(process.argv[2]).then(() => process.exit(0)).catch(() => process.exit(0));
} else {
  module.exports = { runCreateIssue: runCreateIssueMain };
}
