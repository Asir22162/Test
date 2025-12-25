import fs from 'fs';
import os from 'os';
import path from 'path';
const nock = require('nock');
import { spawnSync } from 'child_process';

describe('ops/create-issue.js artifact attach failures', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('skips release creation when download fails', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-attach-'));
    const summary = { count: 1, top: [{ package: 'pkg', severity: 'high', title: 'bad' }] };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));

    const repo = 'owner/repo';
    const token = 'token';

    const issueScope = nock('https://api.github.com')
      .post(`/repos/${repo}/issues`)
      .reply(201, { number: 10, html_url: 'https://github.com/owner/repo/issues/10' });

    const artifactsScope = nock('https://api.github.com')
      .get(`/repos/${repo}/actions/artifacts`)
      .query(true)
      .reply(200, { artifacts: [{ id: 999, name: 'suggest-fixes-dry-run-artifacts' }] });

    const downloadScope = nock('https://api.github.com')
      .get(`/repos/${repo}/actions/artifacts/999/zip`)
      .reply(500, 'boom');

    const releaseScope = nock('https://api.github.com')
      .post(`/repos/${repo}/releases`)
      .reply(201, { id: 999, upload_url: 'https://uploads.github.com/repos/owner/repo/releases/999/assets{?name,label}', html_url: 'https://github.com/owner/repo/releases/tag/audit' });

    const { runCreateIssue } = require('../create-issue');
    let out = '';
    const ol = console.log; const oe = console.error; const ow = console.warn;
    console.log = (...a) => { out += a.join(' ') + '\n'; };
    console.error = (...a) => { out += a.join(' ') + '\n'; };
    console.warn = (...a) => { out += a.join(' ') + '\n'; };

    await runCreateIssue('audit-summary.json', { cwd: tmp, env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0', GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: '104', ATTACH_ARTIFACT: 'true', RELEASE_DRAFT: 'true' } });

    console.log = ol; console.error = oe; console.warn = ow;
    expect(issueScope.isDone()).toBe(true);
    expect(artifactsScope.isDone()).toBe(true);
    expect(downloadScope.isDone()).toBe(true);
    // release should NOT be called because download failed
    expect(releaseScope.isDone()).toBe(false);
  });

  it('deletes release if upload permanently fails', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-attach-'));
    const summary = { count: 1, top: [{ package: 'pkg', severity: 'high', title: 'bad' }] };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));

    const repo = 'owner/repo';
    const token = 'token';

    const issueScope = nock('https://api.github.com')
      .post(`/repos/${repo}/issues`)
      .reply(201, { number: 11, html_url: 'https://github.com/owner/repo/issues/11' });

    const artifactsScope = nock('https://api.github.com')
      .get(`/repos/${repo}/actions/artifacts`)
      .query(true)
      .reply(200, { artifacts: [{ id: 333, name: 'suggest-fixes-dry-run-artifacts' }] });

    const downloadScope = nock('https://api.github.com')
      .get(`/repos/${repo}/actions/artifacts/333/zip`)
      .reply(200, 'ZIPBYTES');

    const releaseScope = nock('https://api.github.com')
      .post(`/repos/${repo}/releases`)
      .reply(201, { id: 555, upload_url: 'https://uploads.github.com/repos/owner/repo/releases/555/assets{?name,label}', html_url: 'https://github.com/owner/repo/releases/tag/audit' });

    const uploadScope = nock('https://uploads.github.com')
      .post('/repos/owner/repo/releases/555/assets')
      .query(true)
      .reply(500, 'upload fail');

    const deleteScope = nock('https://api.github.com')
      .delete(`/repos/${repo}/releases/555`)
      .reply(204, '');

    const { runCreateIssue } = require('../create-issue');
    let out = '';
    const ol = console.log; const oe = console.error; const ow = console.warn;
    console.log = (...a) => { out += a.join(' ') + '\n'; };
    console.error = (...a) => { out += a.join(' ') + '\n'; };
    console.warn = (...a) => { out += a.join(' ') + '\n'; };

    await runCreateIssue('audit-summary.json', { cwd: tmp, env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0', GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: '104', ATTACH_ARTIFACT: 'true', RELEASE_DRAFT: 'true' } });

    console.log = ol; console.error = oe; console.warn = ow;
    expect(issueScope.isDone()).toBe(true);
    expect(artifactsScope.isDone()).toBe(true);
    expect(downloadScope.isDone()).toBe(true);
    expect(releaseScope.isDone()).toBe(true);
    expect(uploadScope.isDone()).toBe(true);
    expect(deleteScope.isDone()).toBe(true);
  });

  it('retries upload and succeeds eventually', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-attach-'));
    const summary = { count: 1, top: [{ package: 'pkg', severity: 'high', title: 'bad' }] };
    fs.writeFileSync(path.join(tmp, 'audit-summary.json'), JSON.stringify(summary));

    const repo = 'owner/repo';
    const token = 'token';

    const issueScope = nock('https://api.github.com')
      .post(`/repos/${repo}/issues`)
      .reply(201, { number: 12, html_url: 'https://github.com/owner/repo/issues/12' });

    const artifactsScope = nock('https://api.github.com')
      .get(`/repos/${repo}/actions/artifacts`)
      .query(true)
      .reply(200, { artifacts: [{ id: 444, name: 'suggest-fixes-dry-run-artifacts' }] });

    const downloadScope = nock('https://api.github.com')
      .get(`/repos/${repo}/actions/artifacts/444/zip`)
      .reply(200, 'ZIPBYTES');

    const releaseScope = nock('https://api.github.com')
      .post(`/repos/${repo}/releases`)
      .reply(201, { id: 444, upload_url: 'https://uploads.github.com/repos/owner/repo/releases/444/assets{?name,label}', html_url: 'https://github.com/owner/repo/releases/tag/audit' });

    // two transient failures then success
    const uploadScope1 = nock('https://uploads.github.com')
      .post('/repos/owner/repo/releases/444/assets')
      .query(true)
      .reply(500, 'upload fail 1');
    const uploadScope2 = nock('https://uploads.github.com')
      .post('/repos/owner/repo/releases/444/assets')
      .query(true)
      .reply(500, 'upload fail 2');
    const uploadScope3 = nock('https://uploads.github.com')
      .post('/repos/owner/repo/releases/444/assets')
      .query(true)
      .reply(201, { url: 'ok' });

    const { runCreateIssue } = require('../create-issue');
    let out = '';
    const ol = console.log; const oe = console.error; const ow = console.warn;
    console.log = (...a) => { out += a.join(' ') + '\n'; };
    console.error = (...a) => { out += a.join(' ') + '\n'; };
    console.warn = (...a) => { out += a.join(' ') + '\n'; };

    await runCreateIssue('audit-summary.json', { cwd: tmp, env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0', GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: '105', ATTACH_ARTIFACT: 'true', RELEASE_DRAFT: 'true' } });

    console.log = ol; console.error = oe; console.warn = ow;
    expect(issueScope.isDone()).toBe(true);
    expect(artifactsScope.isDone()).toBe(true);
    expect(downloadScope.isDone()).toBe(true);
    expect(releaseScope.isDone()).toBe(true);
    expect(uploadScope1.isDone()).toBe(true);
    expect(uploadScope2.isDone()).toBe(true);
    expect(uploadScope3.isDone()).toBe(true);
  });
});