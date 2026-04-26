import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceReportRouteStopNotNull1700000012000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety check: fail if any NULL rows exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM reports WHERE route_id IS NULL OR stop_id IS NULL) THEN
          RAISE EXCEPTION 'Cannot enforce NOT NULL: reports with NULL route_id or stop_id still exist. Run backfill first.';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE reports ALTER COLUMN route_id SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE reports ALTER COLUMN stop_id SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reports ALTER COLUMN stop_id DROP NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE reports ALTER COLUMN route_id DROP NOT NULL;
    `);
  }
}
