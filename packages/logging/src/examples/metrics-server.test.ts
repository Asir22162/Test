import { describe, it, expect } from 'vitest'
import { PrometheusRegistry } from '../prometheus'
import { createMetricsServer } from '../../examples/metrics-server'
import http from 'node:http'

function fetchText(url: string) {
  return new Promise<string>((resolve, reject) => {
    http.get(url, (res) => {
      let body = ''
      res.on('data', (c) => body += c)
      res.on('end', () => resolve(body))
    }).on('error', reject)
  })
}

describe('metrics server example', () => {
  it('exposes metrics at /metrics', async () => {
    const reg = new PrometheusRegistry()
    reg.inc('test_counter', 3)

    const srv = createMetricsServer(reg)
    const port = await srv.start(0)

    const body = await fetchText(`http://127.0.0.1:${port}/metrics`)
    expect(body.includes('test_counter')).toBe(true)

    await srv.close()
  })
})
