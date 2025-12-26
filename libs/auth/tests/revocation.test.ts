import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DataSource } from 'typeorm'
import { RefreshTokenEntity } from '../src/refresh.entity'
import { RefreshRevocationEntity } from '../src/revocation.entity'
import { TypeOrmRefreshStore } from '../src/typeorm-refresh'

let ds: DataSource
let store: TypeOrmRefreshStore

beforeAll(async () => {
  ds = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    entities: [RefreshTokenEntity, RefreshRevocationEntity],
  })
  await ds.initialize()
  store = new TypeOrmRefreshStore(ds)
})

afterAll(async () => {
  if (ds && ds.isInitialized) await ds.destroy()
})

describe('revocation audit', () => {
  it('creates revocation record when revoking existing token', async () => {
    const rec = { jti: 'jrev1', sub: 'u1', expiresAt: Date.now() + 100000, revoked: false }
    await store.save(rec)
    await store.revoke('jrev1', { revokedBy: 'tester', reason: 'compromised' })
    const rev = await ds.getRepository(RefreshRevocationEntity).findOne({ where: { jti: 'jrev1' } })
    expect(rev).not.toBeNull()
    expect(rev?.revokedBy).toBe('tester')
    expect(rev?.reason).toBe('compromised')
  })

  it('logs revocation attempt for unknown jti', async () => {
    await store.revoke('unknown-jti', { revokedBy: 'tester2', reason: 'manual' })
    const rev = await ds.getRepository(RefreshRevocationEntity).findOne({ where: { jti: 'unknown-jti' } })
    expect(rev).not.toBeNull()
    expect(rev?.revokedBy).toBe('tester2')
  })
})