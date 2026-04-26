import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHolidays1700000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE holidays (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        date DATE NOT NULL,
        description VARCHAR(200) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_holidays_date UNIQUE (date)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS holidays;`);
  }
}
