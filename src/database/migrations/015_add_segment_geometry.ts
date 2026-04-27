import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSegmentGeometry1700000015000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE route_stops
        ADD COLUMN IF NOT EXISTS segment_geometry JSONB;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_route_stops_segment_geo'
            AND conrelid = 'route_stops'::regclass
        ) THEN
          ALTER TABLE route_stops
            ADD CONSTRAINT chk_route_stops_segment_geo
            CHECK (
              segment_geometry IS NULL OR (
                segment_geometry->>'type' = 'LineString'
                AND jsonb_typeof(segment_geometry->'coordinates') = 'array'
              )
            );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_route_stops_segment_geo
        ON route_stops USING GIN (segment_geometry);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_route_stops_segment_geo;
    `);
    await queryRunner.query(`
      ALTER TABLE route_stops DROP CONSTRAINT IF EXISTS chk_route_stops_segment_geo;
    `);
    await queryRunner.query(`
      ALTER TABLE route_stops DROP COLUMN IF EXISTS segment_geometry;
    `);
  }
}
