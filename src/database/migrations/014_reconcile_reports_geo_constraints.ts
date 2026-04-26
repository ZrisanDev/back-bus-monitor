import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReconcileReportsGeoConstraints1700000014000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_reports_latitude'
            AND conrelid = 'reports'::regclass
        ) THEN
          ALTER TABLE reports
            ADD CONSTRAINT chk_reports_latitude
            CHECK (latitude >= -90 AND latitude <= 90);
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_reports_longitude'
            AND conrelid = 'reports'::regclass
        ) THEN
          ALTER TABLE reports
            ADD CONSTRAINT chk_reports_longitude
            CHECK (longitude >= -180 AND longitude <= 180);
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_bus_timestamp
        ON reports (bus_id, timestamp DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_bus_timestamp;`);
    await queryRunner.query(
      `ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_longitude;`,
    );
    await queryRunner.query(
      `ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_latitude;`,
    );
  }
}
