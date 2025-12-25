import express from 'express'
import type { PrometheusRegistry } from '../src/prometheus'

export function createMetricsServer(registry: PrometheusRegistry) {
  const app = express()
  app.get('/metrics', (_req, res) => {
    res.type('text/plain').send(registry.getMetrics())
  })

  let server: any = null
  return {
    async start(port = 0) {
      return new Promise<number>((resolve) => {
        server = app.listen(port, () => {
          const addr = server.address()
          const p = typeof addr === 'object' && addr ? addr.port : addr
          resolve(p as number)
        })
      })
    },
    async close() {
      if (!server) return
      return new Promise((resolve, reject) => server.close((err: any) => (err ? reject(err) : resolve(undefined))))
    }
  }
}
