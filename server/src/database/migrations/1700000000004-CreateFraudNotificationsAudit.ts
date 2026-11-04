import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFraudNotificationsAudit1700000000004 implements MigrationInterface {
  name = 'CreateFraudNotificationsAudit1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Таблица requirement_violations
    await queryRunner.query(`
      CREATE TABLE requirement_violations (
        id BIGSERIAL PRIMARY KEY,
        requirement_id UUID NOT NULL REFERENCES zone_requirements(id) ON DELETE CASCADE,
        period_date DATE NOT NULL,
        required_count INT NOT NULL,
        actual_count INT NOT NULL,
        deficit INT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_violations_req ON requirement_violations(requirement_id)`);
    await queryRunner.query(`CREATE INDEX idx_violations_date ON requirement_violations(period_date)`);

    // Таблица fraud_logs
    await queryRunner.query(`
      CREATE TABLE fraud_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        fraud_type VARCHAR(50) NOT NULL CHECK (fraud_type IN (
          'device_mismatch',
          'device_changed',
          'simultaneous_presence',
          'teleportation',
          'emulator_detected',
          'root_detected',
          'mock_location',
          'beacon_clone_detected',
          'clock_skew_detected'
        )),
        details JSONB NOT NULL,
        severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
        is_reviewed BOOLEAN DEFAULT false,
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_fraud_user ON fraud_logs(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_fraud_time ON fraud_logs(created_at)`);
    await queryRunner.query(`CREATE INDEX idx_fraud_unreviewed ON fraud_logs(created_at) WHERE NOT is_reviewed`);
    await queryRunner.query(`CREATE INDEX idx_fraud_severity ON fraud_logs(severity)`);

    // Таблица user_devices
    await queryRunner.query(`
      CREATE TABLE user_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fingerprint_hash VARCHAR(64) NOT NULL,
        device_info JSONB,
        first_seen_at TIMESTAMPTZ NOT NULL,
        last_seen_at TIMESTAMPTZ NOT NULL,
        is_trusted BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_user_devices_user ON user_devices(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_user_devices_fingerprint ON user_devices(fingerprint_hash)`);

    // Таблица device_push_tokens
    await queryRunner.query(`
      CREATE TABLE device_push_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        push_token VARCHAR(255) NOT NULL UNIQUE,
        platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_push_tokens_user ON device_push_tokens(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_push_tokens_active ON device_push_tokens(is_active)`);

    // Таблица notifications
    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_notifications_user ON notifications(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read`);

    // Таблица audit_logs
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_audit_user ON audit_logs(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_time ON audit_logs(created_at)`);
    await queryRunner.query(`CREATE INDEX idx_audit_action ON audit_logs(action)`);

    // Таблица beacon_telemetry
    await queryRunner.query(`
      CREATE TABLE beacon_telemetry (
        id BIGSERIAL PRIMARY KEY,
        beacon_id UUID NOT NULL REFERENCES beacons(id) ON DELETE CASCADE,
        battery_level INT CHECK (battery_level BETWEEN 0 AND 100),
        firmware_version VARCHAR(50),
        temperature FLOAT,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_beacon_telemetry_beacon ON beacon_telemetry(beacon_id)`);
    await queryRunner.query(`CREATE INDEX idx_beacon_telemetry_time ON beacon_telemetry(recorded_at)`);
    await queryRunner.query(`CREATE INDEX idx_beacon_telemetry_battery ON beacon_telemetry(battery_level) WHERE battery_level < 20`);

    // Таблица system_settings
    await queryRunner.query(`
      CREATE TABLE system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) NOT NULL UNIQUE,
        value JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by UUID REFERENCES users(id)
      )
    `);

    // Таблица import_jobs
    await queryRunner.query(`
      CREATE TABLE import_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        type VARCHAR(50) NOT NULL CHECK (type IN ('objects', 'zones', 'beacons', 'employees', 'requirements')),
        mode VARCHAR(20) NOT NULL CHECK (mode IN ('add', 'update', 'replace')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        total_rows INT,
        processed_rows INT DEFAULT 0,
        imported_rows INT DEFAULT 0,
        updated_rows INT DEFAULT 0,
        error_rows INT DEFAULT 0,
        errors JSONB,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_import_jobs_user ON import_jobs(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_import_jobs_status ON import_jobs(status)`);
    await queryRunner.query(`CREATE INDEX idx_import_jobs_time ON import_jobs(created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS import_jobs`);
    await queryRunner.query(`DROP TABLE IF EXISTS system_settings`);
    await queryRunner.query(`DROP TABLE IF EXISTS beacon_telemetry`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS device_push_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_devices`);
    await queryRunner.query(`DROP TABLE IF EXISTS fraud_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS requirement_violations`);
  }
}
