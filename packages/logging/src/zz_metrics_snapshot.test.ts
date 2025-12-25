import { describe, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { getSnapshot } from './metrics/collector'

describe('zz-metrics-snapshot', () => {
  it('writes metrics snapshot to test-artifacts', async () => {
    const outDir = path.join(__dirname, '..', 'test-artifacts')
    try { fs.mkdirSync(outDir, { recursive: true }) } catch {}
    const snapshot = getSnapshot()
    const outfile = path.join(outDir, 'metrics.txt')
    fs.writeFileSync(outfile, snapshot || '# no registries\n')
  })
})
