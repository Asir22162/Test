import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

@Entity({ name: 'refresh_revocation' })
export class RefreshRevocationEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  jti!: string

  @Column({ nullable: true })
  sub?: string

  @Column({ nullable: true })
  revokedBy?: string

  @Column({ nullable: true, type: 'text' })
  reason?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date
}
