import { spawnSync } from 'child_process';
import path from 'path';

describe('ops/check-secrets.js', () => {
  it('warns when GITHUB_TOKEN is missing', () => {
    const tmp = process.cwd();
    const res = spawnSync(process.execPath, [path.resolve(tmp, 'ops', 'check-secrets.js')], {
      env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0', GITHUB_TOKEN: '', AUDIT_ALERT_WEBHOOK: '' }
    });
    const out = String(res.stdout) + String(res.stderr);
    expect(out).toContain('GITHUB_TOKEN is not set');
    expect(out).toContain('AUDIT_ALERT_WEBHOOK is not set');
    expect(res.status).toBe(0);
  });

  it('reports set when secrets present', () => {
    const tmp = process.cwd();
    const res = spawnSync(process.execPath, [path.resolve(tmp, 'ops', 'check-secrets.js')], {
      env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0', GITHUB_TOKEN: 'token', AUDIT_ALERT_WEBHOOK: 'https://hooks.example' }
    });
    const out = String(res.stdout) + String(res.stderr);
    expect(out).toContain('GITHUB_TOKEN is set');
    expect(out).toContain('AUDIT_ALERT_WEBHOOK is set');
    expect(res.status).toBe(0);
  });
});