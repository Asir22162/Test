import { describe, expect, it } from 'vitest'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { createLogger } from '../index'
import { createAsyncFileAdapter } from './file-async'

function mktempDir(prefix = 'logtest-') {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  return base
}

async function wait(ms: number) { return new Promise(res => setTimeout(res, ms)) }

describe('async file adapter metrics', () => {
  it('exposes buffer length and flush metrics via getMetrics', async () => {
    const tmp = mktempDir()
    const logfile = path.join(tmp, 'metrics.log')
    const { adapter, stop, getMetrics } = createAsyncFileAdapter({ path: logfile, bufferSize: 5, flushIntervalMs: 100 })
    const logger = createLogger({ level: 'debug', adapter })

    for (let i = 0; i < 3; i++) logger.info('m', { i })
    // buffer not yet flushed
    const m1 = getMetrics()
    expect(m1.bufferLen).toBeGreaterThanOrEqual(1)
    expect(m1.flushCount).toBe(0)

    // trigger flush by emitting more messages
    for (let i = 0; i < 5; i++) logger.info('m', { i })
    await wait(200)
    const m2 = getMetrics()
    expect(m2.flushCount).toBeGreaterThanOrEqual(1)
    expect(m2.writeBytes).toBeGreaterThan(0)

    await stop()
  })

  it('observer receives updates', async () => {
    const tmp = mktempDir()
    const logfile = path.join(tmp, 'metrics2.log')
    let observed: any[] = []
    const { adapter, stop } = createAsyncFileAdapter({ path: logfile, bufferSize: 5, flushIntervalMs: 100, metricsObserver: m => observed.push(m) })
    const logger = createLogger({ level: 'debug', adapter })

    logger.info('a')
    logger.info('b')
    await new Promise(r => setTimeout(r, 150))
    expect(observed.length).toBeGreaterThanOrEqual(1)

    await stop()
    expect(observed[observed.length - 1].flushCount).toBeGreaterThanOrEqual(0)
  })
})