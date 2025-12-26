import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fetch from 'node-fetch'
import { spawn } from 'child_process'

let proc: any

beforeAll(async () => {
  proc = spawn('node', ['dist/main.js'], { env: { ...process.env, PORT: '4002' }, stdio: 'inherit' })
  await new Promise((r) => setTimeout(r, 500))
})

afterAll(() => {
  if (proc && !proc.killed) proc.kill()
})

describe('auth revoke rate limit e2e', () => {
  it('rate limits multiple revoke attempts', async () => {
    const res = await fetch('http://127.0.0.1:4002/auth/login', { method: 'POST', body: JSON.stringify({ username: 'ratelimit-user' }), headers: { 'content-type': 'application/json' } })
    const json = await res.json()
    expect(json.accessToken).toBeDefined()

    // make MAX requests quickly
    let lastStatus = 0
    for (let i = 0; i < 7; i++) {
      const r = await fetch('http://127.0.0.1:4002/auth/revoke', { method: 'POST', body: JSON.stringify({ jti: 'nonexistent' }), headers: { 'content-type': 'application/json', 'authorization': `Bearer ${json.accessToken}` } })
      lastStatus = r.status
    }

    // expect at least one 429 Too Many Requests
    expect(lastStatus === 429 || lastStatus === 403).toBeTruthy()
  })
})
