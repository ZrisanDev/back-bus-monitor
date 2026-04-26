import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDayTypes1700000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE day_types (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        code VARCHAR(30) NOT NULL,
        label_es VARCHAR(80) NOT NULL,
        label_en VARCHAR(80) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_day_types_code UNIQUE (code)
      );
    `);

    // Seed default day types
    await queryRunner.query(`
      INSERT INTO day_types (code, label_es, label_en) VALUES
        ('LUNES_VIERNES', 'Lunes a Viernes', 'Monday to Friday'),
        ('SABADO', 'Sábado', 'Saturday'),
        ('DOMINGO', 'Domingo', 'Sunday'),
        ('FERIADO', 'Feriado', 'Holiday');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS day_types;`);
  }
}
