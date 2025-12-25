import { DataSource } from 'typeorm'
import { RefreshStore, RefreshTokenRecord } from './refresh'
import { RefreshTokenEntity } from './refresh.entity'

export class TypeOrmRefreshStore implements RefreshStore {
  private repo

  constructor(private ds: DataSource) {
    this.repo = ds.getRepository(RefreshTokenEntity)
  }

  async save(record: RefreshTokenRecord) {
    const ent = this.repo.create({ jti: record.jti, sub: record.sub, expiresAt: record.expiresAt, revoked: !!record.revoked })
    await this.repo.save(ent)
  }

  async revoke(jti: string) {
    await this.repo.update({ jti }, { revoked: true })
  }

  async get(jti: string) {
    const ent = await this.repo.findOne({ where: { jti } })
    if (!ent) return null
    if (ent.expiresAt < Date.now()) return null
    return { jti: ent.jti, sub: ent.sub, expiresAt: Number(ent.expiresAt), revoked: ent.revoked }
  }
}
