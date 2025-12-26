import type { Adapter } from '../index'

export const consoleAdapter: Adapter = (record) => {
  // Keep console I/O as a single JSON line
  console.log(JSON.stringify(record))
}
