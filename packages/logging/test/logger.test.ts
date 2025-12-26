import { describe, expect, it } from 'vitest'
import { createLogger } from '../src'
import { createMemoryAdapter } from '../src/adapters/memory'

describe('packages/logging', () => {
  it('emits JSON records with ts, level, msg', () => {
    const mem = createMemoryAdapter()
    const logger = createLogger({ level: 'debug', adapter: mem.adapter })
    logger.info('hello', { a: 1 })

    expect(mem.entries.length).toBe(1)
    const rec = mem.entries[0]
    expect(rec.level).toBe('info')
    expect(rec.msg).toBe('hello')
    expect(typeof rec.ts).toBe('string')
    expect(rec.a).toBe(1)
  })

  it('respects level threshold', () => {
    const mem = createMemoryAdapter()
    const logger = createLogger({ level: 'warn', adapter: mem.adapter })
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    expect(mem.entries.map(e => e.level)).toEqual(['warn'])
  })

  it('child logger merges context', () => {
    const mem = createMemoryAdapter()
    const parent = createLogger({ level: 'debug', adapter: mem.adapter, ctx: { app: 'svc' } })
    const child = parent.child({ requestId: 'r1' })
    child.info('ok')

    expect(mem.entries.length).toBe(1)
    const rec = mem.entries[0]
    expect(rec.app).toBe('svc')
    expect(rec.requestId).toBe('r1')
  })

  it('serializes error objects', () => {
    const mem = createMemoryAdapter()
    const logger = createLogger({ level: 'debug', adapter: mem.adapter })
    const err = new Error('boom')
    logger.error('fail', { err })

    expect(mem.entries.length).toBe(1)
    const rec = mem.entries[0]
    expect(rec.err).toBeDefined()
    expect(rec.err.message).toBe('boom')
    expect(typeof rec.err.stack).toBe('string')
  })
})
