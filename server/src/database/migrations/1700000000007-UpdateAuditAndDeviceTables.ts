import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAuditAndDeviceTables1700000000007 implements MigrationInterface {
  name = 'UpdateAuditAndDeviceTables1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Обновляем таблицу audit_logs
    // Меняем id с BIGSERIAL на UUID
    await queryRunner.query(`
      ALTER TABLE audit_logs 
      ALTER COLUMN id TYPE UUID USING gen_random_uuid()
    `);
    await queryRunner.query(`
      ALTER TABLE audit_logs 
      ALTER COLUMN id SET DEFAULT gen_random_uuid()
    `);

    // Меняем ip_address с INET на VARCHAR(45)
    await queryRunner.query(`
      ALTER TABLE audit_logs 
      ALTER COLUMN ip_address TYPE VARCHAR(45) USING ip_address::TEXT
    `);

    // Меняем user_agent с TEXT на VARCHAR(500)
    await queryRunner.query(`
      ALTER TABLE audit_logs 
      ALTER COLUMN user_agent TYPE VARCHAR(500)
    `);

    // Добавляем индексы если их нет
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id)`);

    // Обновляем таблицу user_devices
    // Переименовываем fingerprint_hash в device_fingerprint
    await queryRunner.query(`
      ALTER TABLE user_devices 
      RENAME COLUMN fingerprint_hash TO device_fingerprint
    `);

    // Добавляем device_name (с переносом данных из device_info если есть)
    await queryRunner.query(`
      ALTER TABLE user_devices 
      ADD COLUMN IF NOT EXISTS device_name VARCHAR(255)
    `);

    // Заполняем device_name из device_info если есть
    await queryRunner.query(`
      UPDATE user_devices 
      SET device_name = COALESCE(device_info->>'name', device_info->>'deviceName', 'Unknown Device')
      WHERE device_name IS NULL AND device_info IS NOT NULL
    `);

    // Делаем device_name NOT NULL с дефолтным значением
    await queryRunner.query(`
      ALTER TABLE user_devices 
      ALTER COLUMN device_name SET DEFAULT 'Unknown Device'
    `);
    await queryRunner.query(`
      ALTER TABLE user_devices 
      ALTER COLUMN device_name SET NOT NULL
    `);

    // Переименовываем first_seen_at в created_at (если существует)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_devices' AND column_name = 'first_seen_at') THEN
          EXECUTE 'ALTER TABLE user_devices RENAME COLUMN first_seen_at TO created_at';
        END IF;
      END $$;
    `);

    // Переименовываем last_seen_at в last_used_at (если существует)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_devices' AND column_name = 'last_seen_at') THEN
          EXECUTE 'ALTER TABLE user_devices RENAME COLUMN last_seen_at TO last_used_at';
        END IF;
      END $$;
    `);

    // Удаляем device_info если существует
    await queryRunner.query(`
      ALTER TABLE user_devices 
      DROP COLUMN IF EXISTS device_info
    `);

    // Устанавливаем created_at по умолчанию
    await queryRunner.query(`
      ALTER TABLE user_devices 
      ALTER COLUMN created_at SET DEFAULT NOW()
    `);

    // Устанавливаем last_used_at nullable
    await queryRunner.query(`
      ALTER TABLE user_devices 
      ALTER COLUMN last_used_at DROP NOT NULL
    `);

    // Добавляем индексы
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint_new ON user_devices(device_fingerprint)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Откатываем изменения для audit_logs
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_entity_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_entity_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_action`);

    await queryRunner.query(`
      ALTER TABLE audit_logs 
      ALTER COLUMN user_agent TYPE TEXT
    `);
    await queryRunner.query(`
      ALTER TABLE audit_logs 
      ALTER COLUMN ip_address TYPE INET USING ip_address::INET
    `);
    await queryRunner.query(`
      ALTER TABLE audit_logs 
      ALTER COLUMN id TYPE BIGINT USING id::BIGINT
    `);
    await queryRunner.query(`
      ALTER TABLE audit_logs 
      ALTER COLUMN id SET DEFAULT nextval('audit_logs_id_seq'::regclass)
    `);

    // Откатываем изменения для user_devices
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_devices_fingerprint_new`);

    await queryRunner.query(`
      ALTER TABLE user_devices 
      ALTER COLUMN last_used_at SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE user_devices 
      ALTER COLUMN created_at DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE user_devices 
      ADD COLUMN IF NOT EXISTS device_info JSONB
    `);

    await queryRunner.query(`
      ALTER TABLE user_devices 
      DROP COLUMN IF EXISTS device_name
    `);

    // Откатываем переименования
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_devices' AND column_name = 'created_at') THEN
          EXECUTE 'ALTER TABLE user_devices RENAME COLUMN created_at TO first_seen_at';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_devices' AND column_name = 'last_used_at') THEN
          EXECUTE 'ALTER TABLE user_devices RENAME COLUMN last_used_at TO last_seen_at';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE user_devices 
      RENAME COLUMN device_fingerprint TO fingerprint_hash
    `);
  }
}
