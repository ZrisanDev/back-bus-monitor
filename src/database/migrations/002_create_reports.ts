import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReports1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE reports (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        bus_id BIGINT NOT NULL,
        latitude NUMERIC(10,8) NOT NULL,
        longitude NUMERIC(11,8) NOT NULL,
        passenger_count INT NOT NULL DEFAULT 0,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_reports_bus FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE RESTRICT,
        CONSTRAINT chk_reports_passenger_count CHECK (passenger_count >= 0)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_reports_bus_id ON reports (bus_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_reports_timestamp ON reports (timestamp DESC);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS reports;`);
  }
}
