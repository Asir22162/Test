export interface RefreshTokenRecord {
  jti: string
  sub: string
  expiresAt: number
  revoked?: boolean
}

export interface RefreshStore {
  save(record: RefreshTokenRecord): Promise<void>
  revoke(jti: string): Promise<void>
  get(jti: string): Promise<RefreshTokenRecord | null>
}

export class InMemoryRefreshStore implements RefreshStore {
  private store = new Map<string, RefreshTokenRecord>()

  async save(record: RefreshTokenRecord) {
    this.store.set(record.jti, record)
  }

  async revoke(jti: string) {
    const r = this.store.get(jti)
    if (r) {
      r.revoked = true
      this.store.set(jti, r)
    }
  }

  async get(jti: string) {
    const r = this.store.get(jti) || null
    if (r && r.expiresAt < Date.now()) return null
    return r
  }
}
