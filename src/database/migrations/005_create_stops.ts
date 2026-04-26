import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStops1700000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE stops (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        latitude NUMERIC(10,8) NOT NULL,
        longitude NUMERIC(11,8) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_stops_name UNIQUE (name),
        CONSTRAINT chk_stops_latitude CHECK (latitude >= -90 AND latitude <= 90),
        CONSTRAINT chk_stops_longitude CHECK (longitude >= -180 AND longitude <= 180)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS stops;`);
  }
}
