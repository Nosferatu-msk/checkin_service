import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1700000000001 implements MigrationInterface {
  name = 'CreateInitialTables1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создание расширения ltree
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS ltree`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    // Таблица objects
    await queryRunner.query(`
      CREATE TABLE objects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_objects_active ON objects(is_active)`);

    // Таблица zones
    await queryRunner.query(`
      CREATE TABLE zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
        parent_zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        zone_type VARCHAR(20) NOT NULL CHECK (zone_type IN ('floor', 'room', 'zone')),
        level INT NOT NULL DEFAULT 1,
        rssi_threshold FLOAT DEFAULT -75.0,
        path LTREE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_zones_object ON zones(object_id)`);
    await queryRunner.query(`CREATE INDEX idx_zones_parent ON zones(parent_zone_id)`);
    await queryRunner.query(`CREATE INDEX idx_zones_path ON zones USING GIST(path)`);
    await queryRunner.query(`CREATE INDEX idx_zones_type ON zones(zone_type)`);

    // Таблица beacons
    await queryRunner.query(`
      CREATE TABLE beacons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        major INT NOT NULL,
        minor INT NOT NULL,
        mac_address VARCHAR(17),
        tx_power INT DEFAULT -59,
        battery_level INT CHECK (battery_level BETWEEN 0 AND 100),
        last_seen_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        installed_at DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_beacons_uuid ON beacons(uuid)`);
    await queryRunner.query(`CREATE INDEX idx_beacons_zone ON beacons(zone_id)`);
    await queryRunner.query(`CREATE INDEX idx_beacons_active ON beacons(is_active)`);
    await queryRunner.query(`CREATE INDEX idx_beacons_battery ON beacons(battery_level) WHERE battery_level < 20`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS beacons`);
    await queryRunner.query(`DROP TABLE IF EXISTS zones`);
    await queryRunner.query(`DROP TABLE IF EXISTS objects`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pgcrypto`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS ltree`);
  }
}
