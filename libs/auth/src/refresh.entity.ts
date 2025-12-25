import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm'

@Entity({ name: 'refresh_token' })
export class RefreshTokenEntity {
  @PrimaryColumn()
  jti!: string

  @Index()
  @Column()
  sub!: string

  @Column('bigint')
  expiresAt!: number

  @Column({ default: false })
  revoked!: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date
}
