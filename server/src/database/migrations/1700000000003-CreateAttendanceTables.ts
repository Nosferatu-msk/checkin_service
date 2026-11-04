import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceTables1700000000003 implements MigrationInterface {
  name = 'CreateAttendanceTables1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Таблица attendance_raw (партицированная)
    await queryRunner.query(`
      CREATE TABLE attendance_raw (
        id BIGSERIAL,
        user_id UUID NOT NULL,
        beacon_uuid VARCHAR(36) NOT NULL,
        mac_address VARCHAR(17),
        scan_timestamp_start TIMESTAMPTZ NOT NULL,
        scan_timestamp_end TIMESTAMPTZ NOT NULL,
        median_rssi FLOAT NOT NULL,
        min_rssi FLOAT,
        max_rssi FLOAT,
        samples_count INT,
        device_fingerprint_hash VARCHAR(64),
        request_id UUID,
        synced_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, scan_timestamp_start)
      ) PARTITION BY RANGE (scan_timestamp_start)
    `);

    // Создание начальных партиций
    await queryRunner.query(`
      CREATE TABLE attendance_raw_2026_11 PARTITION OF attendance_raw
        FOR VALUES FROM ('2026-11-01') TO ('2026-12-01')
    `);
    await queryRunner.query(`
      CREATE TABLE attendance_raw_2026_12 PARTITION OF attendance_raw
        FOR VALUES FROM ('2026-12-01') TO ('2027-01-01')
    `);

    await queryRunner.query(`CREATE INDEX idx_raw_user_time ON attendance_raw(user_id, scan_timestamp_start)`);
    await queryRunner.query(`CREATE INDEX idx_raw_beacon ON attendance_raw(beacon_uuid)`);
    await queryRunner.query(`CREATE INDEX idx_raw_request_id ON attendance_raw(request_id)`);

    // Таблица attendance_calculated (партицированная)
    await queryRunner.query(`
      CREATE TABLE attendance_calculated (
        id BIGSERIAL,
        user_id UUID NOT NULL,
        zone_id UUID NOT NULL,
        enter_time TIMESTAMPTZ NOT NULL,
        exit_time TIMESTAMPTZ NOT NULL,
        duration_minutes INT NOT NULL,
        avg_rssi FLOAT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, enter_time)
      ) PARTITION BY RANGE (enter_time)
    `);

    // Создание начальных партиций
    await queryRunner.query(`
      CREATE TABLE attendance_calculated_2026_11 PARTITION OF attendance_calculated
        FOR VALUES FROM ('2026-11-01') TO ('2026-12-01')
    `);
    await queryRunner.query(`
      CREATE TABLE attendance_calculated_2026_12 PARTITION OF attendance_calculated
        FOR VALUES FROM ('2026-12-01') TO ('2027-01-01')
    `);

    await queryRunner.query(`CREATE INDEX idx_calc_user_time ON attendance_calculated(user_id, enter_time)`);
    await queryRunner.query(`CREATE INDEX idx_calc_zone_time ON attendance_calculated(zone_id, enter_time)`);
    await queryRunner.query(`CREATE INDEX idx_calc_exit_time ON attendance_calculated(exit_time)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS attendance_calculated_2026_12`);
    await queryRunner.query(`DROP TABLE IF EXISTS attendance_calculated_2026_11`);
    await queryRunner.query(`DROP TABLE IF EXISTS attendance_calculated`);
    await queryRunner.query(`DROP TABLE IF EXISTS attendance_raw_2026_12`);
    await queryRunner.query(`DROP TABLE IF EXISTS attendance_raw_2026_11`);
    await queryRunner.query(`DROP TABLE IF EXISTS attendance_raw`);
  }
}
