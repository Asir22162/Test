import type { Adapter, LogRecord } from '../index'

import { PrometheusRegistry } from '../prometheus'

export type HttpAdapterOptions = {
  endpoint: string
  batchSize?: number
  flushIntervalMs?: number
  timeoutMs?: number
  headers?: Record<string, string>
  maxRetries?: number
  retryDelayMs?: number
  metricsObserver?: (metrics: HttpAdapterMetrics) => void
  metricsRegistry?: PrometheusRegistry
}

export type HttpAdapterMetrics = {
  bufferLen: number
  flushCount: number
  successCount: number
  errorCount: number
}

function wait(ms: number) { return new Promise(res => setTimeout(res, ms)) }

export function createHttpAdapter(opts: HttpAdapterOptions) {
  const endpoint = opts.endpoint
  const batchSize = Math.max(1, opts.batchSize ?? 100)
  const flushIntervalMs = Math.max(10, opts.flushIntervalMs ?? 1000)
  const timeoutMs = Math.max(100, opts.timeoutMs ?? 5000)
  const headers = opts.headers ?? { 'content-type': 'application/json' }
  const maxRetries = Math.max(0, opts.maxRetries ?? 2)
  const retryDelayMs = Math.max(50, opts.retryDelayMs ?? 200)
  const metricsObserver = opts.metricsObserver
  const metricsRegistry = opts.metricsRegistry

  let buffer: LogRecord[] = []
  let flushing = false
  let stopped = false
  let interval: NodeJS.Timeout | null = setInterval(() => { void flush() }, flushIntervalMs)

  const metrics: HttpAdapterMetrics = {
    bufferLen: 0,
    flushCount: 0,
    successCount: 0,
    errorCount: 0,
  }

  function notify() { try { if (metricsObserver) metricsObserver({ ...metrics }) } catch (e) { } }

  async function doPost(payload: LogRecord[], attempt = 0): Promise<void> {
    // Use node http/https so tests (nock) can intercept
    const url = new URL(endpoint)
    const isHttps = url.protocol === 'https:'
    const body = JSON.stringify(payload)

    const lib = isHttps ? await import('node:https') : await import('node:http')
    const options: any = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + (url.search || ''),
      headers: Object.assign({}, headers, { 'content-length': Buffer.byteLength(body, 'utf8') }),
      timeout: timeoutMs,
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const req = lib.request(options, (res: any) => {
          const { statusCode } = res
          res.on('data', () => {})
          res.on('end', () => {
            if (statusCode && statusCode >= 200 && statusCode < 300) {
              resolve()
            } else {
              reject(new Error(`HTTP ${statusCode}`))
            }
          })
        })
        req.on('error', (err: any) => reject(err))
        req.setTimeout(timeoutMs, () => {
          req.destroy(new Error('timeout'))
        })
        req.write(body)
        req.end()
      })

      metrics.successCount += 1
      notify()
      if (metricsRegistry) metricsRegistry.inc('logging_http_success_count', 1)
    } catch (e) {
      metrics.errorCount += 1
      notify()
      if (metricsRegistry) metricsRegistry.inc('logging_http_error_count', 1)
      if (attempt < maxRetries) {
        await wait(retryDelayMs)
        return doPost(payload, attempt + 1)
      }
      // swallow after retries
    }
  }

  async function flush() {
    if (flushing) return
    if (buffer.length === 0) return
    flushing = true
    const batch = buffer.splice(0, buffer.length)
    metrics.bufferLen = buffer.length
    notify()
    try {
      await doPost(batch)
      metrics.flushCount += 1
      notify()
      if (metricsRegistry) metricsRegistry.inc('logging_http_flush_count', 1)
    } finally {
      flushing = false
    }
  }

  const adapter: Adapter = (rec: LogRecord) => {
    if (stopped) return
    buffer.push(rec)
    metrics.bufferLen = buffer.length
    notify()
    if (buffer.length >= batchSize) void flush()
  }

  async function stop() {
    stopped = true
    if (interval) { clearInterval(interval); interval = null }
    await flush()
  }

  function getMetrics() { return { ...metrics } }

  return { adapter, stop, getMetrics }
}
