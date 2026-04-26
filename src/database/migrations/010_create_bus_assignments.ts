import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBusAssignments1700000009000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE bus_assignments (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        bus_id BIGINT NOT NULL,
        route_id BIGINT NOT NULL,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        unassigned_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_bus_assignments_bus FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE RESTRICT,
        CONSTRAINT fk_bus_assignments_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_bus_assignments_bus_active ON bus_assignments (bus_id, unassigned_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_bus_assignments_route_active ON bus_assignments (route_id, unassigned_at);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_bus_assignments_active_bus ON bus_assignments (bus_id) WHERE unassigned_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_bus_assignments_active_bus;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bus_assignments_route_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bus_assignments_bus_active;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bus_assignments;`);
  }
}
