import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DataSource } from 'typeorm'
import { RefreshTokenEntity } from '../src/refresh.entity'
import { TypeOrmRefreshStore } from '../src/typeorm-refresh'

let ds: DataSource
let store: TypeOrmRefreshStore

beforeAll(async () => {
  ds = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    entities: [RefreshTokenEntity],
  })
  await ds.initialize()
  store = new TypeOrmRefreshStore(ds)
})

afterAll(async () => {
  if (ds && ds.isInitialized) await ds.destroy()
})

describe('TypeOrmRefreshStore', () => {
  it('saves and retrieves token', async () => {
    const rec = { jti: 'j1', sub: 'u1', expiresAt: Date.now() + 100000, revoked: false }
    await store.save(rec)
    const got = await store.get('j1')
    expect(got).not.toBeNull()
    expect(got?.sub).toBe('u1')
  })

  it('revokes token', async () => {
    const rec = { jti: 'j2', sub: 'u2', expiresAt: Date.now() + 100000, revoked: false }
    await store.save(rec)
    await store.revoke('j2')
    const got = await store.get('j2')
    expect(got).not.toBeNull()
    expect(got?.revoked).toBe(true)
  })
})