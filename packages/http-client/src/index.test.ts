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

  it('retries on 429 and succeeds', async () => {
    const scope = nock('http://api.test')
      .get('/too-many')
      .reply(429, 'slow')
      .get('/too-many')
      .reply(200, { ok: true })

    const onRetry = vi.fn()
    const client = new HttpClient({ baseUrl: 'http://api.test', retry: { retries: 2, baseDelayMs: 1, jitterMs: 0 }, metrics: { onRetry } })
    const res = await client.get('/too-many')
    expect(res).toEqual({ ok: true })
    expect(onRetry).toHaveBeenCalled()
    expect(scope.isDone()).toBe(true)
  })

  it('throws HttpError with status and body', async () => {
    const scope = nock('http://api.test')
      .get('/bad')
      .reply(400, 'invalid')

    const client = new HttpClient({ baseUrl: 'http://api.test' })
    await expect(client.get('/bad')).rejects.toMatchObject({ status: 400, body: 'invalid' })
    expect(scope.isDone()).toBe(true)
  })

  it('invokes circuit hooks on success and failure', async () => {
    const onSuccess = vi.fn()
    const onFailure = vi.fn()

    const scopeFail = nock('http://api.test').get('/fail').reply(500, 'err')
    const clientFail = new HttpClient({ baseUrl: 'http://api.test', circuit: { onFailure } })
    await expect(clientFail.get('/fail')).rejects.toBeTruthy()
    expect(onFailure).toHaveBeenCalled()
    expect(scopeFail.isDone()).toBe(true)

    const scopeOk = nock('http://api.test').get('/ok').reply(200, { ok: true })
    const clientOk = new HttpClient({ baseUrl: 'http://api.test', circuit: { onSuccess } })
    const res = await clientOk.get('/ok')
    expect(res).toEqual({ ok: true })
    expect(onSuccess).toHaveBeenCalled()
    expect(scopeOk.isDone()).toBe(true)
  })
})