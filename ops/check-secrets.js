#!/usr/bin/env node
const token = process.env.GITHUB_TOKEN;
const auditWebhook = process.env.AUDIT_ALERT_WEBHOOK;
let ok = true;
if (!token) {
  console.warn('::warning::GITHUB_TOKEN is not set. Issue creation will be skipped.');
  ok = false;
} else {
  console.log('GITHUB_TOKEN is set.');
}
if (!auditWebhook) {
  console.warn('::warning::AUDIT_ALERT_WEBHOOK is not set. Slack/Teams alerts will be skipped.');
  ok = false;
} else {
  console.log('AUDIT_ALERT_WEBHOOK is set.');
}
process.exit(ok ? 0 : 0); // non-fatal in CI; we print warnings instead of failing
