import type { Adapter, LogRecord } from '../index'

export function createMemoryAdapter() {
  const entries: LogRecord[] = []
  const adapter: Adapter = (r) => entries.push(r)
  return { adapter, entries }
}
