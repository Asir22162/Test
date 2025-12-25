#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || 'audit.json';
const TOP_N = Number(process.env.AUDIT_TOP_N || 5);

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function collectFromVulnerabilities(vulns) {
  const out = [];
  for (const [pkg, info] of Object.entries(vulns)) {
    // severity could be in info.severity or derived
    let severity = info.severity;
    let title = info.title || (info.via && info.via[0] && info.via[0].title) || '';
    let url = (info.via && info.via[0] && info.via[0].url) || '';
    if (!severity && info.via && info.via[0] && info.via[0].severity) severity = info.via[0].severity;
    out.push({ package: pkg, severity: (severity || '').toLowerCase(), title, url });
  }
  return out;
}

function collectFromAdvisories(advisories) {
  const out = [];
  for (const id of Object.keys(advisories)) {
    const a = advisories[id];
    // Try to extract patched versions or recommendation
    const suggested = a.patched_versions || a.patched_version || a.recommendation || a.fix || (a.findings && a.findings[0] && a.findings[0].paths) || '';
    out.push({ package: a.module_name || a.module || a.package, severity: (a.severity || '').toLowerCase(), title: a.title || '', url: a.url || '', suggested });
  }
  return out;
}

function traverseAndCollect(obj, out) {
  if (!obj || typeof obj !== 'object') return;
  if ('severity' in obj && typeof obj.severity === 'string') {
    out.push({ package: obj.package || obj.module || obj.name || '(unknown)', severity: obj.severity.toLowerCase(), title: obj.title || obj.title_text || '', url: obj.url || '' });
  }
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (Array.isArray(v)) {
      for (const item of v) traverseAndCollect(item, out);
    } else if (v && typeof v === 'object') {
      traverseAndCollect(v, out);
    }
  }
}

function summarize(auditJson) {
  if (!auditJson) return { top: [], count: 0 };
  let items = [];
  if (auditJson.vulnerabilities && typeof auditJson.vulnerabilities === 'object') {
    items = items.concat(collectFromVulnerabilities(auditJson.vulnerabilities));
  }
  if (auditJson.advisories && typeof auditJson.advisories === 'object') {
    items = items.concat(collectFromAdvisories(auditJson.advisories));
  }
  // fallback: traverse
  const collected = [];
  traverseAndCollect(auditJson, collected);
  items = items.concat(collected);

  // normalize severity to hi/critical and include suggested fixes when present
  const filtered = items
    .map(it => ({ package: it.package || '(unknown)', severity: (it.severity || '').toLowerCase(), title: it.title || '', url: it.url || '', suggested: it.suggested || '' }))
    .filter(it => it.severity === 'high' || it.severity === 'critical');

  // dedupe by package+title
  const map = new Map();
  for (const it of filtered) {
    const key = `${it.package}::${it.title}`;
    if (!map.has(key)) map.set(key, it);
  }
  const unique = Array.from(map.values());

  // Add suggested fix attempts: if suggested contains a version string, normalize it
  const withFixes = unique.map(u => {
    let suggestedFix = '';
    if (u.suggested) {
      // try to extract a simple version range or recommended text
      const m = /[0-9]+\.[0-9]+\.[0-9]+(?:[^\s,]*)/.exec(u.suggested);
      if (m) suggestedFix = m[0];
      else suggestedFix = (typeof u.suggested === 'string') ? u.suggested : JSON.stringify(u.suggested);
    }
    const suggestedCommand = suggestedFix && /^[0-9]+\.[0-9]+\.[0-9]+/.test(suggestedFix)
      ? `npm i ${u.package}@${suggestedFix} --save`
      : (suggestedFix ? `npm audit fix --force # suggested: ${suggestedFix}` : '');
    return { ...u, suggestedFix, suggestedCommand };
  });

  return { top: withFixes.slice(0, TOP_N), count: withFixes.length };
}

const p = path.resolve(process.cwd(), file);
const json = readJson(p);
const res = summarize(json);
// print machine-readable JSON to stdout
console.log(JSON.stringify(res));
