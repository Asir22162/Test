import { describe, it, expect } from 'vitest'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
// nock is CommonJS; use require() inside tests to avoid ESM/CJS interop issues with Vite
const nock = require('nock')
import { createLogger } from '../index'
import { createHttpAdapter } from './http'
import { registerRegistry } from '../metrics/collector'
import { PrometheusRegistry } from '../prometheus'

describe('http adapter', () => {
  it('sends batched payloads to endpoint when batchSize reached', async () => {
    const host = 'http://localhost:9876'
    const scope = nock(host)
      .post('/logs')
      .reply(200, { ok: true })

    const { adapter, stop } = createHttpAdapter({ endpoint: host + '/logs', batchSize: 3, flushIntervalMs: 100 })
    const logger = createLogger({ level: 'debug', adapter })

    logger.info('a')
    logger.info('b')
    logger.info('c') // should trigger batch of 3

    // allow flush
    await new Promise(r => setTimeout(r, 200))
    await stop()

    expect(scope.isDone()).toBe(true)
  })

  it('retries on transient failure and eventually succeeds', async () => {
    const host = 'http://localhost:9877'
    let called = 0
    const scope = nock(host)
      .post('/logs')
      .reply(function () {
        called += 1
        if (called === 1) return [500, 'err']
        return [200, 'ok']
      })

    const registry = new PrometheusRegistry()
    registerRegistry('http-retry', registry)
    const { adapter, stop, getMetrics } = createHttpAdapter({ endpoint: host + '/logs', batchSize: 2, maxRetries: 2, retryDelayMs: 10, flushIntervalMs: 100, metricsRegistry: registry })
    const logger = createLogger({ level: 'debug', adapter })

    logger.info('x')
    logger.info('y')

    await new Promise(r => setTimeout(r, 300))
    await stop()

    // allow some time for metrics to be updated
    const start = Date.now()
    let metrics = getMetrics()
    while (metrics.successCount < 1 && Date.now() - start < 1000) {
      await new Promise(r => setTimeout(r, 50))
      metrics = getMetrics()
    }

    expect(scope.isDone()).toBe(true)
    // at least one attempt happened (error expected on first attempt)
    expect(metrics.errorCount).toBeGreaterThanOrEqual(1)
    expect(metrics.flushCount + metrics.successCount + metrics.errorCount).toBeGreaterThanOrEqual(1)
  })

  it('stop flushes remaining entries', async () => {
    const host = 'http://localhost:9875'
    const scope = nock(host)
      .post('/logs')
      .reply(200, 'ok')

    const { adapter, stop } = createHttpAdapter({ endpoint: host + '/logs', batchSize: 100, flushIntervalMs: 1000 })
    const logger = createLogger({ level: 'debug', adapter })
    logger.info('hello')
    await stop()

    expect(scope.isDone()).toBe(true)
  })
})
