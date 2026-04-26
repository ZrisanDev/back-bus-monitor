import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDirections1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE directions (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        code VARCHAR(30) NOT NULL,
        label_es VARCHAR(80) NOT NULL,
        label_en VARCHAR(80) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_directions_code UNIQUE (code)
      );
    `);

    // Seed default directions
    await queryRunner.query(`
      INSERT INTO directions (code, label_es, label_en) VALUES
        ('NORTE_SUR', 'Norte → Sur', 'North → South'),
        ('SUR_NORTE', 'Sur → Norte', 'South → North'),
        ('ESTE_OESTE', 'Este → Oeste', 'East → West'),
        ('OESTE_ESTE', 'Oeste → Este', 'West → East');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS directions;`);
  }
}
