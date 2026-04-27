import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDirectionFromRouteStops1700000017000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraint first, then the column
    await queryRunner.query(`
      ALTER TABLE route_stops
        DROP CONSTRAINT IF EXISTS fk_route_stops_direction;
    `);
    await queryRunner.query(`
      ALTER TABLE route_stops
        DROP COLUMN IF EXISTS direction_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE route_stops
        ADD COLUMN direction_id bigint NOT NULL DEFAULT 1;
    `);
    await queryRunner.query(`
      ALTER TABLE route_stops
        ADD CONSTRAINT fk_route_stops_direction
          FOREIGN KEY (direction_id) REFERENCES directions(id);
    `);
  }
}