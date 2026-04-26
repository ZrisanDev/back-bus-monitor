import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLatLngToReports1700000013000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reports ADD COLUMN latitude NUMERIC(10,8) NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE reports ADD COLUMN longitude NUMERIC(11,8) NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE reports ADD CONSTRAINT chk_reports_latitude
        CHECK (latitude >= -90 AND latitude <= 90);
    `);

    await queryRunner.query(`
      ALTER TABLE reports ADD CONSTRAINT chk_reports_longitude
        CHECK (longitude >= -180 AND longitude <= 180);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reports_bus_timestamp ON reports (bus_id, timestamp DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_bus_timestamp;`);
    await queryRunner.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_longitude;`);
    await queryRunner.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_latitude;`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS longitude;`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS latitude;`);
  }
}
