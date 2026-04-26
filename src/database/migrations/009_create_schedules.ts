import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchedules1700000008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE schedules (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        route_id BIGINT NOT NULL,
        direction_id BIGINT NOT NULL,
        day_type_id BIGINT NOT NULL,
        start_time TIME NULL,
        end_time TIME NULL,
        is_operating BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_schedules_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT,
        CONSTRAINT fk_schedules_direction FOREIGN KEY (direction_id) REFERENCES directions(id) ON DELETE RESTRICT,
        CONSTRAINT fk_schedules_day_type FOREIGN KEY (day_type_id) REFERENCES day_types(id) ON DELETE RESTRICT,
        CONSTRAINT uq_schedules_route_direction_day_type UNIQUE (route_id, direction_id, day_type_id),
        CONSTRAINT chk_schedules_time_order CHECK (
          is_operating = false OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
        )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_schedules_route_direction ON schedules (route_id, direction_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS schedules;`);
  }
}
