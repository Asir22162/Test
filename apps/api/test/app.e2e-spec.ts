import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import { spawn } from 'child_process';

let proc: any;

beforeAll(async () => {
  proc = spawn('node', ['dist/main.js'], { env: { ...process.env, PORT: '4001' }, stdio: 'inherit' });
  // allow server to start
  await new Promise((r) => setTimeout(r, 500));
});

afterAll(() => {
  if (proc && !proc.killed) proc.kill();
});

describe('api e2e', () => {
  it('returns health', async () => {
    const res = await fetch('http://127.0.0.1:4001/health');
    const json = await res.json();
    expect(json.status).toBe('ok');
  });
});
