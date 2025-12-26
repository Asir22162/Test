import fs from 'node:fs'
import path from 'node:path'
import type { Adapter, LogRecord } from '../index'

export type FileAdapterOptions = {
  path: string
  maxBytes?: number
  maxBackups?: number
}

export function createFileAdapter(opts: FileAdapterOptions) {
  const file = opts.path
  const maxBytes = opts.maxBytes ?? 10_000
  const maxBackups = Math.max(1, opts.maxBackups ?? 5)

  // Ensure directory exists
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
  } catch (e) {
    // ignore
  }

  function rotateIfNeeded() {
    try {
      if (!fs.existsSync(file)) return
      const stat = fs.statSync(file)
      if (stat.size < maxBytes) return

      // rotate files: file.(maxBackups-1) -> file.maxBackups, ..., file -> file.1
      for (let i = maxBackups; i >= 1; i--) {
        const src = i === 1 ? file : `${file}.${i - 1}`
        const dest = `${file}.${i}`
        if (fs.existsSync(src)) {
          // remove final dest if it'll be overwritten
          if (i === maxBackups && fs.existsSync(dest)) {
            try { fs.unlinkSync(dest) } catch (e) { /* ignore */ }
          }
          try { fs.renameSync(src, dest) } catch (e) { /* ignore */ }
        }
      }
    } catch (e) {
      // Swallow rotation errors
    }
  }

  const adapter: Adapter = (rec: LogRecord) => {
    try {
      rotateIfNeeded()
      fs.appendFileSync(file, JSON.stringify(rec) + '\n', { encoding: 'utf8' })
    } catch (e) {
      // don't let log writes throw
      try { console.error('file adapter error', e) } catch {}
    }
  }

  return { adapter, file }
}
