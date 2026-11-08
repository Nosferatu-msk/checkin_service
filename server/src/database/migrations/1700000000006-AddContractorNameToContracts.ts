import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractorNameToContracts1700000000006 implements MigrationInterface {
  name = 'AddContractorNameToContracts1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE contracts 
      ADD COLUMN contractor_name VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE contracts 
      DROP COLUMN contractor_name
    `);
  }
}
