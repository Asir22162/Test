# packages/logging

Structured logging wrapper and adapters. 提供统一的 log levels、context fields、可插拔输出（console、file、external providers）。

File adapter example:

```ts
import { createLogger, createFileAdapter } from '@weapp/logging'

// create a file adapter and attach it to logger
const { adapter } = createFileAdapter({ path: '/var/log/myapp.log', maxBytes: 10_000, maxBackups: 3 })
const logger = createLogger({ level: 'info', adapter })
logger.info('server started', { port: 3000 })
```

Notes:
- Rotation is size-based and performed synchronously before writes for the synchronous adapter; keep `maxBytes` reasonable for your environment.
- The file adapters will create parent directories if missing and will keep up to `maxBackups` rotated files.
- For high-throughput services, prefer the async buffered adapter `createAsyncFileAdapter({ bufferSize, flushIntervalMs })` which batches writes and flushes in the background.

### Observability / metrics

`createAsyncFileAdapter` supports an optional `metricsObserver` callback and exposes a `getMetrics()` function on the returned object. Metrics available:

- `bufferLen` — number of records currently buffered
- `flushCount` — number of completed flush operations
- `writeBytes` — total bytes written by the adapter
- `errorCount` — number of write/buffer errors encountered

Example of observing metrics:

```ts
const { adapter, stop, getMetrics } = createAsyncFileAdapter({
  path: '/var/log/myapp.log',
  bufferSize: 500,
  flushIntervalMs: 1000,
  metricsObserver: (m) => console.debug('log metrics', m),
})

// poll
setInterval(() => console.info('metrics snapshot', getMetrics()), 5000)

// graceful stop
process.on('SIGINT', async () => { await stop(); process.exit(0) })
```

### HTTP adapter (send batches to a remote logging endpoint)

#### Exporting metrics to Prometheus

You can create a simple in-process Prometheus registry using the built-in `PrometheusRegistry` and pass it to adapters via `metricsRegistry` option. Then expose a `/metrics` endpoint in your service that returns `registry.getMetrics()`.

```ts
import express from 'express'
import { PrometheusRegistry, createHttpAdapter, createLogger } from '@weapp/logging'

const registry = new PrometheusRegistry()
const { adapter, stop } = createHttpAdapter({ endpoint: 'https://logs.example/ingest', metricsRegistry: registry })
const logger = createLogger({ adapter })

const app = express()
app.get('/metrics', (_req, res) => {
  res.type('text/plain').send(registry.getMetrics())
})

process.on('SIGINT', async () => { await stop(); process.exit(0) })
```

`createHttpAdapter` lets you post batched log records to an HTTP endpoint. It supports batch sizing, periodic flush, timeouts and retries.

```ts
import { createLogger, createHttpAdapter } from '@weapp/logging'

const { adapter, stop, getMetrics } = createHttpAdapter({
  endpoint: 'https://logs.example.com/ingest',
  batchSize: 200,
  flushIntervalMs: 1000,
  timeoutMs: 5000,
  maxRetries: 3,
  retryDelayMs: 200,
  metricsObserver: (m) => console.debug('http log metrics', m)
})

const logger = createLogger({ level: 'info', adapter })

process.on('SIGINT', async () => { await stop(); process.exit(0) })
```

## Async file adapter (high-throughput)

使用异步缓冲适配器可以显著减少写磁盘的频率，适合高吞吐场景：

```ts
import { createLogger, createAsyncFileAdapter } from '@weapp/logging'

const { adapter, stop } = createAsyncFileAdapter({
  path: '/var/log/myapp.log',
  maxBytes: 10_000,
  maxBackups: 3,
  bufferSize: 500,       // 达到 500 条记录时触发刷新
  flushIntervalMs: 1000, // 每 1s 最少刷新一次
})

const logger = createLogger({ level: 'info', adapter })
logger.info('server started', { port: 3000 })

// 在进程退出时确保日志被刷新
process.on('SIGINT', async () => {
  await stop()
  process.exit(0)
})
```

最佳实践：

- 根据吞吐量与可接受的日志延迟来选择 `bufferSize` 和 `flushIntervalMs`。
- 在进程优雅关停时务必调用 `stop()` 来强制刷新缓冲区，否则可能丢失未写入的日志。
- 对于关键日志（如审计事件），可同时触发同步写入或将日志发送到远端并增加确认机制。
- 在非常高的吞吐场景下，建议使用外部日志转发器（Fluentd/Vector/Logstash）或云日志代理来避免应用进程承担大量 I/O。

