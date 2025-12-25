import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { PrometheusRegistry } from '../prometheus'
import { createAsyncFileAdapter } from './file-async'
import { createHttpAdapter } from './http'
import { registerRegistry } from '../metrics/collector'

function mktempDir(prefix = 'logtest-') {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  return base
}

async function wait (ms: number) { return new Promise(r => setTimeout(r, ms)) }

describe('metrics registry integration', () => {
  it('async adapter updates registry', async () => {
    const tmp = mktempDir()
    const logfile = path.join(tmp, 'm.log')
    const registry = new PrometheusRegistry()
    registerRegistry('async1', registry)
    const { adapter, stop } = createAsyncFileAdapter({ path: logfile, bufferSize: 5, flushIntervalMs: 50, metricsRegistry: registry })
    for (let i = 0; i < 10; i++) adapter({ ts: new Date().toISOString(), level: 'info', msg: 'x' })
    await wait(200)
    await stop()
    const m = registry.getMetrics()
    expect(m.includes('logging_async_flush_count')).toBe(true)
    expect(m.includes('logging_async_write_bytes')).toBe(true)
  })

  it('http adapter updates registry', async () => {
    const host = 'http://localhost:9800'
    const scope = require('nock')(host).post('/logs').reply(200, 'ok')
    const registry = new PrometheusRegistry()
    const { adapter, stop } = createHttpAdapter({ endpoint: host + '/logs', batchSize: 2, flushIntervalMs: 50, metricsRegistry: registry })

    adapter({ ts: new Date().toISOString(), level: 'info', msg: 'a' })
    adapter({ ts: new Date().toISOString(), level: 'info', msg: 'b' })
    await new Promise(r => setTimeout(r, 200))
    await stop()
    const m = registry.getMetrics()
    expect(m.includes('logging_http_flush_count')).toBe(true)
    expect(m.includes('logging_http_success_count')).toBe(true)
    expect(scope.isDone()).toBe(true)
  })
})
