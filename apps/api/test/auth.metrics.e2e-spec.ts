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

describe('auth metrics e2e', () => {
  it('auth operations emit metrics', async () => {
    const res = await fetch('http://127.0.0.1:4002/auth/login', { method: 'POST', body: JSON.stringify({ username: 'metrics-user' }), headers: { 'content-type': 'application/json' } })
    const json = await res.json()
    expect(json.refreshToken).toBeDefined()

    // perform revoke
    await fetch('http://127.0.0.1:4002/auth/revoke', { method: 'POST', body: JSON.stringify({ refreshToken: json.refreshToken }), headers: { 'content-type': 'application/json' } })

    // fetch metrics
    const m = await fetch('http://127.0.0.1:4002/metrics')
    const text = await m.text()
    expect(text.includes('auth_issue_count') || text.includes('auth_revoke_count') || text.includes('auth_rotate_count')).toBeTruthy()
  })
})