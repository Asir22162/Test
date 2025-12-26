import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import type { Adapter, LogRecord } from '../index'

import { PrometheusRegistry } from '../prometheus'

export type AsyncFileAdapterOptions = {
  path: string
  maxBytes?: number
  maxBackups?: number
  bufferSize?: number // flush when buffer reaches this many entries
  flushIntervalMs?: number // periodic flush
  metricsObserver?: (metrics: AsyncFileAdapterMetrics) => void
  metricsRegistry?: PrometheusRegistry
}

export type AsyncFileAdapterMetrics = {
  bufferLen: number
  flushCount: number
  writeBytes: number
  errorCount: number
}

export function createAsyncFileAdapter(opts: AsyncFileAdapterOptions) {
  const file = opts.path
  const maxBytes = opts.maxBytes ?? 50_000
  const maxBackups = Math.max(1, opts.maxBackups ?? 5)
  const bufferSize = Math.max(1, opts.bufferSize ?? 100)
  const flushIntervalMs = Math.max(10, opts.flushIntervalMs ?? 200)
  const metricsObserver = opts.metricsObserver
  const metricsRegistry = opts.metricsRegistry

  // Ensure directory exists
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
  } catch (e) {
    // ignore
  }

  let buffer: string[] = []
  let flushing = false
  let interval: NodeJS.Timeout | null = setInterval(() => { void flush() }, flushIntervalMs)

  const metrics: AsyncFileAdapterMetrics = {
    bufferLen: 0,
    flushCount: 0,
    writeBytes: 0,
    errorCount: 0,
  }

  function notify() {
    try {
      if (metricsObserver) metricsObserver({ ...metrics })
    } catch (e) {
      // ignore observer errors
    }
  }

  async function rotateIfNeeded() {
    try {
      const stat = await fsPromises.stat(file).catch(() => null)
      if (!stat) return
      if (stat.size < maxBytes) return

      // rotate files: file.(maxBackups-1) -> file.maxBackups, ..., file -> file.1
      for (let i = maxBackups; i >= 1; i--) {
        const src = i === 1 ? file : `${file}.${i - 1}`
        const dest = `${file}.${i}`
        const exists = await fsPromises.stat(src).then(s => !!s).catch(() => false)
        if (exists) {
          // remove final dest if it'll be overwritten
          if (i === maxBackups) {
            await fsPromises.unlink(dest).catch(() => {})
          }
          await fsPromises.rename(src, dest).catch(() => {})
        }
      }
    } catch (e) {
      // swallow
    }
  }

  async function flush() {
    if (flushing) return
    if (buffer.length === 0) return
    flushing = true
    const chunk = buffer.join('')
    // capture bytes to write
    const bytes = Buffer.byteLength(chunk, 'utf8')
    buffer = []
    metrics.bufferLen = buffer.length
    notify()
    if (metricsRegistry) metricsRegistry.setGauge('logging_async_buffer_len', metrics.bufferLen)
    try {
      await rotateIfNeeded()
      await fsPromises.appendFile(file, chunk, { encoding: 'utf8' })
      metrics.flushCount += 1
      metrics.writeBytes += bytes
      notify()
      // update registry if provided
      if (metricsRegistry) {
        metricsRegistry.inc('logging_async_flush_count', 1)
        metricsRegistry.inc('logging_async_write_bytes', bytes)
      }
    } catch (e) {
      metrics.errorCount += 1
      notify()
      if (metricsRegistry) metricsRegistry.inc('logging_async_error_count', 1)
      try { console.error('async file adapter write error', e) } catch {}
    } finally {
      flushing = false
    }
  }

  const adapter: Adapter = (rec: LogRecord) => {
    try {
      buffer.push(JSON.stringify(rec) + '\n')
      metrics.bufferLen = buffer.length
      notify()
      if (buffer.length >= bufferSize) {
        // trigger but don't await
        void flush()
      }
    } catch (e) {
      metrics.errorCount += 1
      notify()
      try { console.error('async file adapter buffer error', e) } catch {}
    }
  }

  async function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
    await flush()
  }

  function getMetrics() {
    return { ...metrics }
  }

  return { adapter, file, stop, getMetrics }
}
