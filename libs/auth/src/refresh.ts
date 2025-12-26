export interface RefreshTokenRecord {
  jti: string
  sub: string
  expiresAt: number
  revoked?: boolean
}

export interface RefreshStore {
  save(record: RefreshTokenRecord): Promise<void>
  revoke(jti: string, opts?: { revokedBy?: string; reason?: string }): Promise<void>
  get(jti: string): Promise<RefreshTokenRecord | null>
}

export class InMemoryRefreshStore implements RefreshStore {
  private store = new Map<string, RefreshTokenRecord>()

  async save(record: RefreshTokenRecord) {
    this.store.set(record.jti, record)
  }

  async revoke(jti: string, opts?: { revokedBy?: string; reason?: string }) {
    const r = this.store.get(jti)
    if (r) {
      r.revoked = true
      this.store.set(jti, r)
    }
    // opts are ignored in memory store, but included for interface parity
  }

  async get(jti: string) {
    const r = this.store.get(jti) || null
    if (r && r.expiresAt < Date.now()) return null
    return r
  }
}
