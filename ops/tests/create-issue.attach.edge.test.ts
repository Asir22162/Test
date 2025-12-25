import fs from 'fs';
import os from 'os';
import path from 'path';
const nock = require('nock');
import { spawnSync } from 'child_process';

describe('ops/create-issue.js attach edge cases', () => {
  afterEach(() => { nock.cleanAll(); });

  it('skips artifact calls when ATTACH_ARTIFACT=false', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-edge-'));
    const summary = { count: 1, top: [{ package: 'pkg', severity: 'high', title: 'bad' }] };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));

    // If ATTACH_ARTIFACT=false, no list artifacts call should be made
    const listScope = nock('https://api.github.com').get(/\/actions\/artifacts/).reply(200, {});

    const { runCreateIssue } = require('../create-issue');
    await runCreateIssue('audit-summary.json', { cwd: tmp, env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0', GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'token', GITHUB_RUN_ID: '107', ATTACH_ARTIFACT: 'false' } });

    expect(listScope.isDone()).toBe(false); // should not call artifacts API
  });

  it('skips attach when artifact list empty', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-edge-'));
    const summary = { count: 1, top: [{ package: 'pkg', severity: 'high', title: 'bad' }] };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));

    const issueScope = nock('https://api.github.com').post(`/repos/owner/repo/issues`).reply(201, { number: 5 });
    const artifactsScope = nock('https://api.github.com').get(`/repos/owner/repo/actions/artifacts`).query(true).reply(200, { artifacts: [] });

    const { runCreateIssue } = require('../create-issue');
    let out = '';
    const ol = console.log; const oe = console.error; const ow = console.warn;
    console.log = (...a) => { out += a.join(' ') + '\n'; };
    console.error = (...a) => { out += a.join(' ') + '\n'; };
    console.warn = (...a) => { out += a.join(' ') + '\n'; };

    await runCreateIssue('audit-summary.json', { cwd: tmp, env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0', GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'token', GITHUB_RUN_ID: '108', ATTACH_ARTIFACT: 'true' } });

    console.log = ol; console.error = oe; console.warn = ow;
    expect(issueScope.isDone()).toBe(true);
    expect(artifactsScope.isDone()).toBe(true);
  });
});