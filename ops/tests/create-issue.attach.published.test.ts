import fs from 'fs';
import os from 'os';
import path from 'path';
const nock = require('nock');
import { spawnSync } from 'child_process';

describe('ops/create-issue.js artifact attach (published)', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('creates release with draft=false when RELEASE_DRAFT=false', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-attach-'));
    const summary = {
      count: 1,
      top: [{ package: 'pkg', severity: 'high', title: 'bad' }]
    };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));

    const repo = 'owner/repo';
    const token = 'token';

    const issueScope = nock('https://api.github.com')
      .post(`/repos/${repo}/issues`)
      .reply(201, { number: 3, html_url: 'https://github.com/owner/repo/issues/3' });

    const artifactsScope = nock('https://api.github.com')
      .get(`/repos/${repo}/actions/artifacts`)
      .query(true)
      .reply(200, { artifacts: [{ id: 444, name: 'suggest-fixes-dry-run-artifacts' }] });

    const downloadScope = nock('https://api.github.com')
      .get(`/repos/${repo}/actions/artifacts/444/zip`)
      .reply(200, 'ZIPBYTES');

    const releaseScope = nock('https://api.github.com')
      .post(`/repos/${repo}/releases`, (body) => { expect(body.draft).toBe(false); return true; })
      .reply(201, { id: 444, upload_url: 'https://uploads.github.com/repos/owner/repo/releases/444/assets{?name,label}', html_url: 'https://github.com/owner/repo/releases/tag/audit' });

    const uploadScope = nock('https://uploads.github.com')
      .post('/repos/owner/repo/releases/444/assets')
      .query(true)
      .reply(201, { url: 'ok' });

    const commentScope = nock('https://api.github.com')
      .post(`/repos/${repo}/issues/3/comments`)
      .reply(201, { html_url: 'https://github.com/owner/repo/issues/3#comment' });

    const labelsScope = nock('https://api.github.com')
      .post(`/repos/${repo}/issues/3/labels`, (body) => { expect(Array.isArray(body.labels)).toBe(true); return true; })
      .reply(200, [{}]);

    const { runCreateIssue } = require('../create-issue');
    let out = '';
    const ol = console.log; const oe = console.error; const ow = console.warn;
    console.log = (...a) => { out += a.join(' ') + '\n'; };
    console.error = (...a) => { out += a.join(' ') + '\n'; };
    console.warn = (...a) => { out += a.join(' ') + '\n'; };

    await runCreateIssue('audit-summary.json', { cwd: tmp, env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0', GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: '103', ATTACH_ARTIFACT: 'true', RELEASE_DRAFT: 'false' } });

    console.log = ol; console.error = oe; console.warn = ow;
    expect(issueScope.isDone()).toBe(true);
    expect(artifactsScope.isDone()).toBe(true);
    expect(downloadScope.isDone()).toBe(true);
    expect(releaseScope.isDone()).toBe(true);
    expect(uploadScope.isDone()).toBe(true);
    expect(commentScope.isDone()).toBe(true);
    expect(labelsScope.isDone()).toBe(true);
  });
});