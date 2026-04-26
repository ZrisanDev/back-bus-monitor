import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRouteStopToReports1700000011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reports ADD COLUMN route_id BIGINT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE reports ADD COLUMN stop_id BIGINT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE reports ADD CONSTRAINT fk_reports_route
        FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE reports ADD CONSTRAINT fk_reports_stop
        FOREIGN KEY (stop_id) REFERENCES stops(id) ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reports_route_id ON reports (route_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reports_stop_id ON reports (stop_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_stop_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_route_id;`);
    await queryRunner.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS fk_reports_stop;`);
    await queryRunner.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS fk_reports_route;`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS stop_id;`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS route_id;`);
  }
}
