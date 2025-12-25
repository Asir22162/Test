import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import { spawnSync } from 'child_process';

describe('ops/create-issue.js', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('creates an issue when high vulnerabilities exist', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-test-'));
    const summary = {
      count: 1,
      top: [
        {
          package: 'left-pad',
          severity: 'high',
          title: 'DoS in left-pad',
          url: 'http://example.com',
          suggestedCommand: 'npm i left-pad@1.2.3 --save'
        }
      ]
    };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));
    fs.writeFileSync(path.join(tmp, 'audit.json'), JSON.stringify({ test: true }));
    fs.mkdirSync(path.join(tmp, 'ops'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'ops', 'suggested-fixes.sh'), '#!/bin/bash\necho fix', { mode: 0o755 });

    const repo = 'owner/repo';
    const token = 'token';

    const scope = nock('https://api.github.com', {
      reqheaders: { 'user-agent': 'ops/suggest-fixes-bot', authorization: `token ${token}` }
    })
      .post(`/repos/${repo}/issues`, (body: any) => {
        expect(body.title).toContain('High severity vulnerabilities');
        expect(body.body).toContain('left-pad');
        expect(body.body).toContain('npm i left-pad@1.2.3');
        return true;
      })
      .reply(201, { html_url: 'https://github.com/owner/repo/issues/1' });

    const res = spawnSync(process.execPath, [path.resolve(__dirname, '..', 'create-issue.js'), 'audit-summary.json'], {
      cwd: tmp,
      env: { ...process.env, GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: '99' }
    });

    expect(res.status).toBe(0);
    expect(scope.isDone()).toBe(true);
  });

  it('does nothing when no vulnerabilities', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-test-'));
    const summary = { count: 0, top: [] };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));
    const repo = 'owner/repo';
    const token = 'token';
    const scope = nock('https://api.github.com').post(`/repos/${repo}/issues`).reply(201, {});

    const res = spawnSync(process.execPath, [path.resolve(__dirname, '..', 'create-issue.js'), 'audit-summary.json'], {
      cwd: tmp,
      env: { ...process.env, GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: '100' }
    });

    expect(res.status).toBe(0);
    expect(scope.isDone()).toBe(false);
  });

  it('handles GitHub API 500 gracefully (non-fatal)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-test-'));
    const summary = { count: 1, top: [{ package: 'pkg', severity: 'high', title: 'bad', suggestedCommand: '' }] };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));
    fs.writeFileSync(path.join(tmp, 'audit.json'), JSON.stringify({ test: true }));

    const repo = 'owner/repo';
    const token = 'token';

    const scope = nock('https://api.github.com', {
      reqheaders: { 'user-agent': 'ops/suggest-fixes-bot', authorization: `token ${token}` }
    })
      .post(`/repos/${repo}/issues`)
      .reply(500, { message: 'server error' });

    const res = spawnSync(process.execPath, [path.resolve(__dirname, '..', 'create-issue.js'), 'audit-summary.json'], {
      cwd: tmp,
      env: { ...process.env, GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: '101' }
    });

    // script should exit 0 (non-fatal) and have attempted the request
    expect(res.status).toBe(0);
    expect(scope.isDone()).toBe(true);
  });

  it('exits gracefully when GITHUB_TOKEN is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-test-'));
    const summary = { count: 1, top: [{ package: 'pkg', severity: 'high', title: 'bad' }] };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));

    const res = spawnSync(process.execPath, [path.resolve(__dirname, '..', 'create-issue.js'), 'audit-summary.json'], {
      cwd: tmp,
      env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_RUN_ID: '102' }
    });

    expect(res.status).toBe(0);
    expect(String(res.stdout)).toContain('GITHUB_TOKEN not set');
  });
});