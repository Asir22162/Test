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

describe('auth e2e tokenbucket', () => {
  it('returns rate-limit headers and enforces 429 when limit exceeded', async () => {
    const loginRes = await fetch('http://127.0.0.1:4002/auth/login', { method: 'POST', body: JSON.stringify({ username: 'tb-user' }), headers: { 'content-type': 'application/json' } })
    const loginJson = await loginRes.json()
    const access = loginJson.accessToken
    expect(access).toBeDefined()

    // perform rapid revoke attempts
    let lastStatus = 0
    let sawHeader = false
    for (let i = 0; i < 10; i++) {
      const r = await fetch('http://127.0.0.1:4002/auth/revoke', { method: 'POST', body: JSON.stringify({ jti: 'nonexist' }), headers: { 'content-type': 'application/json', 'authorization': `Bearer ${access}` } })
      lastStatus = r.status
      const rem = r.headers.get('x-ratelimit-remaining')
      const reset = r.headers.get('x-ratelimit-reset')
      if (rem !== null && reset !== null) sawHeader = true
      if (lastStatus === 429) break
    }

    expect(sawHeader).toBe(true)
    expect(lastStatus === 429 || lastStatus === 403).toBeTruthy()
  })
})
