import { describe, expect, it } from 'vitest'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { createLogger } from '../index'
import { createFileAdapter } from './file'

function mktempDir(prefix = 'logtest-') {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  return base
}

describe('file adapter', () => {
  it('writes to file and rotates when exceeding maxBytes', () => {
    const tmp = mktempDir()
    const logfile = path.join(tmp, 'app.log')
    const { adapter, file } = createFileAdapter({ path: logfile, maxBytes: 200, maxBackups: 2 })
    const logger = createLogger({ level: 'debug', adapter })

    // Emit several large entries to trigger rotation
    for (let i = 0; i < 20; i++) {
      logger.info('entry', { i, payload: 'x'.repeat(80) })
    }

    // Original and at least one rotated file should exist
    expect(fs.existsSync(file)).toBe(true)
    expect(fs.existsSync(file + '.1') || fs.existsSync(file + '.2')).toBe(true)

    // Read lines and assert JSON parseable
    const readAndParse = (p: string) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    const baseLines = readAndParse(file)
    expect(baseLines.length).toBeGreaterThan(0)
    expect(baseLines[0].msg).toBeDefined()
  })

  it('creates directory if missing', () => {
    const tmp = mktempDir()
    const subdir = path.join(tmp, 'sub', 'logs')
    const logfile = path.join(subdir, 'a.log')
    const { adapter } = createFileAdapter({ path: logfile, maxBytes: 100 })
    const logger = createLogger({ level: 'debug', adapter })
    logger.info('hello')
    expect(fs.existsSync(logfile)).toBe(true)
    const content = fs.readFileSync(logfile, 'utf8')
    expect(content.includes('hello')).toBe(true)
  })
})
