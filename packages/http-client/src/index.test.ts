import nock from 'nock'
import { describe, it, expect, vi } from 'vitest'
import { HttpClient } from './index'

describe('HttpClient', () => {
  it('injects auth header from provider', async () => {
    const scope = nock('http://api.test')
      .get('/foo')
      .matchHeader('authorization', 'Bearer token123')
      .reply(200, { ok: true })

    const client = new HttpClient({ baseUrl: 'http://api.test', authProvider: async () => 'Bearer token123' })
    const res = await client.get('/foo')
    expect(res).toEqual({ ok: true })
    expect(scope.isDone()).toBe(true)
  })

  it('retries on server errors and succeeds', async () => {
    const scope = nock('http://api.test')
      .get('/retry')
      .reply(500, 'err')
      .get('/retry')
      .reply(500, 'err')
      .get('/retry')
      .reply(200, { ok: true })

    const client = new HttpClient({ baseUrl: 'http://api.test', retry: { retries: 3, baseDelayMs: 1, jitterMs: 0 } })
    const res = await client.get('/retry')
    expect(res).toEqual({ ok: true })
    expect(scope.isDone()).toBe(true)
  })

  it('propagates tracing headers', async () => {
    const scope = nock('http://api.test')
      .get('/trace')
      .matchHeader('x-trace-id', 'trace-1')
      .reply(200, 'ok')

    const client = new HttpClient({ baseUrl: 'http://api.test', tracingHeaders: () => ({ 'x-trace-id': 'trace-1' }) })
    const res = await client.get('/trace')
    expect(res).toEqual('ok')
    expect(scope.isDone()).toBe(true)
  })

  it('calls metrics hooks on retries and errors', async () => {
    const scope = nock('http://api.test')
      .get('/boom')
      .replyWithError('network')

    const onRetry = vi.fn()
    const onError = vi.fn()
    const client = new HttpClient({ baseUrl: 'http://api.test', retry: { retries: 1, baseDelayMs: 1, jitterMs: 0 }, metrics: { onRetry, onError } })
    await expect(client.get('/boom')).rejects.toBeTruthy()
    expect(onRetry).toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
    expect(scope.isDone()).toBe(true)
  })
})