import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRouteStops1700000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE route_stops (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        route_id BIGINT NOT NULL,
        stop_id BIGINT NOT NULL,
        direction_id BIGINT NOT NULL,
        stop_order INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_route_stops_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT,
        CONSTRAINT fk_route_stops_stop FOREIGN KEY (stop_id) REFERENCES stops(id) ON DELETE RESTRICT,
        CONSTRAINT fk_route_stops_direction FOREIGN KEY (direction_id) REFERENCES directions(id) ON DELETE RESTRICT,
        CONSTRAINT uq_route_stops_route_stop_direction UNIQUE (route_id, stop_id, direction_id),
        CONSTRAINT uq_route_stops_route_direction_order UNIQUE (route_id, direction_id, stop_order),
        CONSTRAINT chk_route_stops_order_positive CHECK (stop_order > 0)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_route_stops_route_direction_order ON route_stops (route_id, direction_id, stop_order);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS route_stops;`);
  }
}
