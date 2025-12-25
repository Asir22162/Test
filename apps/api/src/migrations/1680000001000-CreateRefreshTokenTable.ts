import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateRefreshTokenTable1680000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_token (
        jti VARCHAR(64) PRIMARY KEY,
        sub VARCHAR(255) NOT NULL,
        expiresAt BIGINT NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS refresh_token;')
  }
}
