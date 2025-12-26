import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DataSource } from 'typeorm'
import { RefreshTokenEntity } from '../src/refresh.entity'
import { RefreshRevocationEntity } from '../src/revocation.entity'
import { TypeOrmRefreshStore } from '../src/typeorm-refresh'
import { AuthService } from '../src/service'
import { JWT } from '../src/jwt'

let ds: DataSource
let store: TypeOrmRefreshStore
let auth: AuthService

beforeAll(async () => {
  ds = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    entities: [RefreshTokenEntity, RefreshRevocationEntity],
  })
  await ds.initialize()
  store = new TypeOrmRefreshStore(ds)
  const jwt = new JWT({ secret: 'test-secret' })
  auth = new AuthService(jwt, { refreshTTLSeconds: 60, refreshStore: store })
})

afterAll(async () => {
  if (ds && ds.isInitialized) await ds.destroy()
})

describe('AuthService revoke integration', () => {
  it('revokes refresh token and creates revocation record', async () => {
    const pair = await auth.issueTokens({ sub: 'user-db' }, '15m')
    // revoke
    await auth.revokeByRefreshToken(pair.refreshToken, { revokedBy: 'tester', reason: 'integration test' })

    // verify revocation row
    const rev = await ds.getRepository(RefreshRevocationEntity).findOne({ where: { jti: (await jwtVerifyJti(pair.refreshToken)) } })
    expect(rev).not.toBeNull()
    expect(rev?.revokedBy).toBe('tester')

    // rotation should fail
    try {
      await auth.rotateRefresh(pair.refreshToken)
      throw new Error('rotateRefresh should have thrown')
    } catch (e: any) {
      expect(e.message).toMatch(/Invalid refresh token/)
    }
  })
})

// helper to extract jti without using AuthService internals
async function jwtVerifyJti(token: string) {
  const jwt = new JWT({ secret: 'test-secret' })
  const p: any = await jwt.verify(token)
  return p.jti
}
