import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateObjectsAddressFields1700000000008 implements MigrationInterface {
  name = 'UpdateObjectsAddressFields1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE objects
      ADD COLUMN country VARCHAR(100) DEFAULT 'Россия',
      ADD COLUMN region VARCHAR(255),
      ADD COLUMN city VARCHAR(255),
      ADD COLUMN street VARCHAR(255),
      ADD COLUMN building VARCHAR(50),
      ADD COLUMN structure VARCHAR(50),
      ADD COLUMN object_code VARCHAR(50),
      ADD COLUMN full_address TEXT
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_objects_object_code" ON "objects" ("object_code")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_objects_region" ON "objects" ("region")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_objects_region"`);
    await queryRunner.query(`DROP INDEX "IDX_objects_object_code"`);
    await queryRunner.query(`
      ALTER TABLE objects
      DROP COLUMN full_address,
      DROP COLUMN object_code,
      DROP COLUMN structure,
      DROP COLUMN building,
      DROP COLUMN street,
      DROP COLUMN city,
      DROP COLUMN region,
      DROP COLUMN country
    `);
  }
}
