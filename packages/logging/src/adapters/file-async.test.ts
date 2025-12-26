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

describe('async file adapter', () => {
  it('buffers and flushes asynchronously and rotates', async () => {
    const tmp = mktempDir()
    const logfile = path.join(tmp, 'app_async.log')
    const { adapter, file, stop } = createAsyncFileAdapter({ path: logfile, maxBytes: 200, maxBackups: 2, bufferSize: 5, flushIntervalMs: 50 })
    const logger = createLogger({ level: 'debug', adapter })

    for (let i = 0; i < 40; i++) {
      logger.info('entry', { i, payload: 'x'.repeat(80) })
    }

    // allow flushes to run
    await wait(300)
    await stop()

    expect(fs.existsSync(file)).toBe(true)
    expect(fs.existsSync(file + '.1') || fs.existsSync(file + '.2')).toBe(true)

    const readAndParse = (p: string) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    const baseLines = readAndParse(file)
    expect(baseLines.length).toBeGreaterThan(0)
    expect(baseLines[0].msg).toBeDefined()
  })

  it('stop flushes remaining entries', async () => {
    const tmp = mktempDir()
    const logfile = path.join(tmp, 'a_async.log')
    const { adapter, stop } = createAsyncFileAdapter({ path: logfile, bufferSize: 1000, flushIntervalMs: 500 })
    const logger = createLogger({ level: 'debug', adapter })
    logger.info('hello')

    // stop should flush buffered message
    await stop()
    const content = fs.readFileSync(logfile, 'utf8')
    expect(content.includes('hello')).toBe(true)
  })
})
