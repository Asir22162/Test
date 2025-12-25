import fs from 'fs';
import os from 'os';
import path from 'path';
const nock = require('nock');
import { spawnSync } from 'child_process';

describe('ops/create-issue.js labels failure handling', () => {
  afterEach(() => { nock.cleanAll(); });

  it('logs warning when labels API fails but continues', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-labels-'));
    const summary = { count: 1, top: [{ package: 'pkg', severity: 'high', title: 'bad' }] };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));

    const issueScope = nock('https://api.github.com').post(`/repos/owner/repo/issues`).reply(201, { number: 6 });
    const artifactsScope = nock('https://api.github.com').get(`/repos/owner/repo/actions/artifacts`).query(true).reply(200, { artifacts: [] });
    const commentScope = nock('https://api.github.com').post(`/repos/owner/repo/issues/6/comments`).reply(201, {});
    const labelsScope = nock('https://api.github.com').post(`/repos/owner/repo/issues/6/labels`).reply(500, 'boom');

    const { runCreateIssue } = require('../create-issue');
    let out = '';
    const ol = console.log; const oe = console.error; const ow = console.warn;
    console.log = (...a) => { out += a.join(' ') + '\n'; };
    console.error = (...a) => { out += a.join(' ') + '\n'; };
    console.warn = (...a) => { out += a.join(' ') + '\n'; };

    await runCreateIssue('audit-summary.json', { cwd: tmp, env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0', GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'token', GITHUB_RUN_ID: '303', ATTACH_ARTIFACT: 'true' } });

    console.log = ol; console.error = oe; console.warn = ow;
    expect(issueScope.isDone()).toBe(true);
    expect(labelsScope.isDone()).toBe(true);
    expect(out).toContain('Failed to add labels to issue');
  });
});