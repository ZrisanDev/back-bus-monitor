import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelemetryStatusColumns1700000016000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS status varchar(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS current_stop varchar(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS next_stop varchar(100) DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reports
        DROP COLUMN IF EXISTS next_stop,
        DROP COLUMN IF EXISTS current_stop,
        DROP COLUMN IF EXISTS status;
    `);
  }
}
