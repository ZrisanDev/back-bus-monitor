import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDirections1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE directions (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_directions_code UNIQUE (code)
      );
    `);

    // Insert default directions (ida/vuelta)
    await queryRunner.query(`
      INSERT INTO directions (name, code) VALUES 
        ('Ida', 'IDA'),
        ('Vuelta', 'RET');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS directions;`);
  }
}