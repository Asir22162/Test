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

describe('auth e2e', () => {
  it('login -> refresh -> revoke', async () => {
    const res = await fetch('http://127.0.0.1:4002/auth/login', { method: 'POST', body: JSON.stringify({ username: 'bob' }), headers: { 'content-type': 'application/json' } })
    const json = await res.json()
    expect(json.accessToken).toBeDefined()
    expect(json.refreshToken).toBeDefined()

    const res2 = await fetch('http://127.0.0.1:4002/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: json.refreshToken }), headers: { 'content-type': 'application/json' } })
    const json2 = await res2.json()
    expect(json2.accessToken).toBeDefined()
    expect(json2.refreshToken).toBeDefined()

    // revoke the latest refresh token
    const revRes = await fetch('http://127.0.0.1:4002/auth/revoke', { method: 'POST', body: JSON.stringify({ refreshToken: json2.refreshToken, reason: 'e2e' }), headers: { 'content-type': 'application/json' } })
    expect(revRes.status).toBeLessThan(400)

    // attempt to refresh with revoked token should fail
    const res3 = await fetch('http://127.0.0.1:4002/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: json2.refreshToken }), headers: { 'content-type': 'application/json' } })
    expect(res3.status).not.toBe(200)
  })
})