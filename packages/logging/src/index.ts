export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogRecord {
  ts: string
  level: LogLevel
  msg: string
  [key: string]: any
}

export type Adapter = (record: LogRecord) => void

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export type LoggerOptions = {
  level?: LogLevel
  adapter?: Adapter
  ctx?: Record<string, any>
}

export type Logger = {
  debug: (msg: string, meta?: Record<string, any>) => void
  info: (msg: string, meta?: Record<string, any>) => void
  warn: (msg: string, meta?: Record<string, any>) => void
  error: (msg: string, meta?: Record<string, any>) => void
  child: (ctx: Record<string, any>) => Logger
}

function serializeMeta(meta: any) {
  if (meta instanceof Error) {
    return { message: meta.message, stack: meta.stack }
  }
  if (meta && typeof meta === 'object') return meta
  return { value: meta }
}

export function createLogger(opts: LoggerOptions = {}): Logger {
  const level = opts.level ?? 'info'
  const adapter: Adapter = opts.adapter ?? ((r) => console.log(JSON.stringify(r)))
  const baseCtx = opts.ctx ?? {}

  function shouldLog(lvl: LogLevel) {
    return levelPriority[lvl] >= levelPriority[level]
  }

  function makeRecord(lvl: LogLevel, msg: string, meta?: Record<string, any>) {
    const ts = new Date().toISOString()
    const serializedMeta = meta ? Object.entries(meta).reduce((acc, [k, v]) => ({ ...acc, [k]: v instanceof Error ? { message: v.message, stack: v.stack } : v }), {}) : undefined
    const record: LogRecord = Object.assign({ ts, level: lvl, msg }, baseCtx, serializedMeta)
    return record
  }

  function log(lvl: LogLevel, msg: string, meta?: Record<string, any>) {
    if (!shouldLog(lvl)) return
    const rec = makeRecord(lvl, msg, meta)
    try {
      adapter(rec)
    } catch (e) {
      // adapters should not crash the app; swallow adapter errors
      // but surface minimally to console in dev environments
      try { console.error('logger adapter failed', e) } catch {} // best-effort
    }
  }

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    child: (ctx) => createLogger({ level, adapter, ctx: Object.assign({}, baseCtx, ctx) })
  }
}

// Convenience re-exports for adapters and types
export { consoleAdapter } from './adapters/console'
export { createMemoryAdapter } from './adapters/memory'
export { createFileAdapter } from './adapters/file'
export type { FileAdapterOptions } from './adapters/file'
export { createAsyncFileAdapter } from './adapters/file-async'
export type { AsyncFileAdapterOptions, AsyncFileAdapterMetrics } from './adapters/file-async'
export { createHttpAdapter } from './adapters/http'
export type { HttpAdapterOptions, HttpAdapterMetrics } from './adapters/http'
export { PrometheusRegistry } from './prometheus'

