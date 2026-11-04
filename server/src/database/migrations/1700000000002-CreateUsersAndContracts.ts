import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndContracts1700000000002 implements MigrationInterface {
  name = 'CreateUsersAndContracts1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Таблица users
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        login VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'curator', 'employee')),
        device_fingerprint_hash VARCHAR(64),
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_users_login ON users(login)`);
    await queryRunner.query(`CREATE INDEX idx_users_email ON users(email)`);
    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role)`);
    await queryRunner.query(`CREATE INDEX idx_users_active ON users(is_active)`);

    // Таблица contracts
    await queryRunner.query(`
      CREATE TABLE contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        number VARCHAR(100),
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_contracts_active ON contracts(is_active)`);
    await queryRunner.query(`CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date)`);

    // Таблица contract_objects (M:N)
    await queryRunner.query(`
      CREATE TABLE contract_objects (
        contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
        object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
        PRIMARY KEY (contract_id, object_id)
      )
    `);

    // Таблица contract_employees (M:N)
    await queryRunner.query(`
      CREATE TABLE contract_employees (
        contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (contract_id, user_id)
      )
    `);

    // Таблица contract_curators (M:N)
    await queryRunner.query(`
      CREATE TABLE contract_curators (
        contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (contract_id, user_id)
      )
    `);

    // Таблица zone_requirements
    await queryRunner.query(`
      CREATE TABLE zone_requirements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
        min_employees INT NOT NULL DEFAULT 1,
        visits_count INT NOT NULL DEFAULT 1,
        period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
        weekdays_mask INT DEFAULT 127 CHECK (weekdays_mask BETWEEN 1 AND 127),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (zone_id, contract_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_req_zone ON zone_requirements(zone_id)`);
    await queryRunner.query(`CREATE INDEX idx_req_contract ON zone_requirements(contract_id)`);
    await queryRunner.query(`CREATE INDEX idx_req_active ON zone_requirements(is_active)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS zone_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS contract_curators`);
    await queryRunner.query(`DROP TABLE IF EXISTS contract_employees`);
    await queryRunner.query(`DROP TABLE IF EXISTS contract_objects`);
    await queryRunner.query(`DROP TABLE IF EXISTS contracts`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
