import { DataSource } from 'typeorm'
import { RefreshStore, RefreshTokenRecord } from './refresh'
import { RefreshTokenEntity } from './refresh.entity'

import { RefreshRevocationEntity } from './revocation.entity'

export class TypeOrmRefreshStore implements RefreshStore {
  private repo
  private revRepo

  constructor(private ds: DataSource) {
    this.repo = ds.getRepository(RefreshTokenEntity)
    this.revRepo = ds.getRepository(RefreshRevocationEntity)
  }

  async save(record: RefreshTokenRecord) {
    const ent = this.repo.create({ jti: record.jti, sub: record.sub, expiresAt: record.expiresAt, revoked: !!record.revoked })
    await this.repo.save(ent)
  }

  async revoke(jti: string, opts?: { revokedBy?: string; reason?: string }) {
    const ent = await this.repo.findOne({ where: { jti } })
    if (ent) {
      ent.revoked = true
      await this.repo.save(ent)
      const rev = this.revRepo.create({ jti: ent.jti, sub: ent.sub, revokedBy: opts?.revokedBy, reason: opts?.reason })
      await this.revRepo.save(rev)
    } else {
      // still record revocation attempt for unknown jti
      const rev = this.revRepo.create({ jti, revokedBy: opts?.revokedBy, reason: opts?.reason })
      await this.revRepo.save(rev)
    }
  }

  async get(jti: string) {
    const ent = await this.repo.findOne({ where: { jti } })
    if (!ent) return null
    if (ent.expiresAt < Date.now()) return null
    return { jti: ent.jti, sub: ent.sub, expiresAt: Number(ent.expiresAt), revoked: ent.revoked }
  }
}
