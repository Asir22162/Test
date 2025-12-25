import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateRevocationLogTable1680000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_revocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jti VARCHAR(64) NOT NULL,
        sub VARCHAR(255),
        revokedBy VARCHAR(255),
        reason TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS refresh_revocation;')
  }
}
