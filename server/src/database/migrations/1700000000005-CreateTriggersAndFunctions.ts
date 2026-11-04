import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriggersAndFunctions1700000000005 implements MigrationInterface {
  name = 'CreateTriggersAndFunctions1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Функция для автоматического обновления updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Триггеры для updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_objects_updated_at
        BEFORE UPDATE ON objects
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_contracts_updated_at
        BEFORE UPDATE ON contracts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_zone_requirements_updated_at
        BEFORE UPDATE ON zone_requirements
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_system_settings_updated_at
        BEFORE UPDATE ON system_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Функция для вычисления path зоны
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION zones_update_path()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.parent_zone_id IS NULL THEN
          NEW.path = NEW.id::text::ltree;
        ELSE
          SELECT path || NEW.id::text INTO NEW.path
          FROM zones WHERE id = NEW.parent_zone_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Триггер для вычисления path
    await queryRunner.query(`
      CREATE TRIGGER zones_path_trigger
        BEFORE INSERT OR UPDATE ON zones
        FOR EACH ROW
        EXECUTE FUNCTION zones_update_path()
    `);

    // Функция для каскадного обновления path при изменении parent
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION zones_update_path_cascade()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.parent_zone_id IS DISTINCT FROM NEW.parent_zone_id THEN
          IF NEW.parent_zone_id IS NULL THEN
            NEW.path = NEW.id::text::ltree;
          ELSE
            SELECT path || NEW.id::text INTO NEW.path
            FROM zones WHERE id = NEW.parent_zone_id;
          END IF;
          
          WITH RECURSIVE zone_tree AS (
            SELECT id, path, 1 as depth
            FROM zones
            WHERE id = NEW.id
            
            UNION ALL
            
            SELECT z.id, zt.path || z.id::text, zt.depth + 1
            FROM zones z
            INNER JOIN zone_tree zt ON z.parent_zone_id = zt.id
            WHERE zt.depth < 10
          )
          UPDATE zones z
          SET path = zt.path
          FROM zone_tree zt
          WHERE z.id = zt.id AND z.id != NEW.id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Замена триггера на каскадный
    await queryRunner.query(`DROP TRIGGER IF EXISTS zones_path_trigger ON zones`);
    await queryRunner.query(`
      CREATE TRIGGER zones_path_trigger
        BEFORE INSERT OR UPDATE ON zones
        FOR EACH ROW
        EXECUTE FUNCTION zones_update_path_cascade()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS zones_path_trigger ON zones`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS zones_update_path_cascade`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS zones_update_path`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_zone_requirements_updated_at ON zone_requirements`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON users`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_objects_updated_at ON objects`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column`);
  }
}
