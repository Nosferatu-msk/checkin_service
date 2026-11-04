# Database Specification — Контроль присутствия

**Версия:** 1.0  
**Дата:** 04.11.2026  
**СУБД:** PostgreSQL 15+  
**Кодировка:** UTF-8  
**Язык:** Русский (данные), English (служебные поля)

---

## 1. Обзор схемы базы данных

### 1.1. Основные сущности

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  contracts  │────────<│ contract_    │>────────│  objects    │
│  (Договоры) │         │  objects     │         │  (Объекты)  │
└─────────────┘         └──────────────┘         └──────┬──────┘
       │                                                │
       │                                                │
       ▼                                                ▼
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ contract_   │         │    zones     │────────<│  beacons    │
│ employees   │         │   (Зоны)     │         │  (Маяки)    │
└─────────────┘         └──────┬───────┘         └─────────────┘
                               │
                               │
                               ▼
                        ┌──────────────┐
                        │ zone_        │
                        │ requirements │
                        │ (Нормативы)  │
                        └──────────────┘
```

### 1.2. Пользователи и устройства

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   users     │────────<│ user_devices │         │ device_push │
│ (Пользоват.)│         │ (Устройства) │         │  _tokens    │
└─────────────┘         └──────────────┘         └─────────────┘
```

### 1.3. Данные присутствия

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ attendance_ │         │ attendance_  │         │ requirement_│
│    raw      │────────>│  calculated  │         │ violations  │
│ (Сырые)     │         │ (Рассчитан.) │         │ (Нарушения) │
└─────────────┘         └──────────────┘         └─────────────┘
```

---

## 2. Таблицы

### 2.1. Справочники

#### objects (Объекты)
```sql
CREATE TABLE objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_objects_active ON objects(is_active);
```

**Описание:** Здания, территории, площадки.

---

#### zones (Зоны)
```sql
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
);

CREATE INDEX idx_zones_object ON zones(object_id);
CREATE INDEX idx_zones_parent ON zones(parent_zone_id);
CREATE INDEX idx_zones_path ON zones USING GIST(path);
CREATE INDEX idx_zones_type ON zones(zone_type);
```

**Описание:** Иерархическая структура: Объект → Этаж → Помещение → Зона.

**LTREE:** Для быстрых рекурсивных запросов (например, получить все зоны объекта).

---

#### beacons (Маяки)
```sql
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
);

CREATE INDEX idx_beacons_uuid ON beacons(uuid);
CREATE INDEX idx_beacons_zone ON beacons(zone_id);
CREATE INDEX idx_beacons_active ON beacons(is_active);
CREATE INDEX idx_beacons_battery ON beacons(battery_level) WHERE battery_level < 20;
```

**Описание:** BLE-маяки формата iBeacon.

---

### 2.2. Пользователи и договоры

#### users (Пользователи)
```sql
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
);

CREATE INDEX idx_users_login ON users(login);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
```

**Описание:** Все пользователи системы (админы, кураторы, сотрудники).

---

#### contracts (Договоры)
```sql
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    number VARCHAR(100),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_active ON contracts(is_active);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);
```

**Описание:** Договоры с заказчиками.

---

#### contract_objects (Связь Договор ↔ Объект)
```sql
CREATE TABLE contract_objects (
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
    PRIMARY KEY (contract_id, object_id)
);
```

---

#### contract_employees (Связь Договор ↔ Сотрудник)
```sql
CREATE TABLE contract_employees (
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (contract_id, user_id)
);
```

---

#### contract_curators (Кураторы договоров)
```sql
CREATE TABLE contract_curators (
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (contract_id, user_id)
);
```

---

### 2.3. Нормативы (SLA)

#### zone_requirements (Нормативы по зонам)
```sql
CREATE TABLE zone_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    min_employees INT NOT NULL DEFAULT 1,
    visits_count INT NOT NULL DEFAULT 1,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    weekdays_mask INT DEFAULT 127,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (zone_id, contract_id)
);

CREATE INDEX idx_req_zone ON zone_requirements(zone_id);
CREATE INDEX idx_req_contract ON zone_requirements(contract_id);
CREATE INDEX idx_req_active ON zone_requirements(is_active);
```

**Описание:** Нормативы присутствия сотрудников в зонах.

**weekdays_mask:** Битовая маска дней недели (пн=1, вт=2, ..., вс=64).

---

### 2.4. Данные присутствия

#### attendance_raw (Сырые данные)
```sql
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
) PARTITION BY RANGE (scan_timestamp_start);

-- Создание партиций по месяцам
CREATE TABLE attendance_raw_2026_11 PARTITION OF attendance_raw
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE attendance_raw_2026_12 PARTITION OF attendance_raw
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE INDEX idx_raw_user_time ON attendance_raw(user_id, scan_timestamp_start);
CREATE INDEX idx_raw_beacon ON attendance_raw(beacon_uuid);
CREATE INDEX idx_raw_request_id ON attendance_raw(request_id);
```

**Описание:** Сырые данные с мобильных приложений.

**Партицирование:** По месяцам для улучшения производительности.

---

#### attendance_calculated (Рассчитанное присутствие)
```sql
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
) PARTITION BY RANGE (enter_time);

-- Создание партиций по месяцам
CREATE TABLE attendance_calculated_2026_11 PARTITION OF attendance_calculated
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE INDEX idx_calc_user_time ON attendance_calculated(user_id, enter_time);
CREATE INDEX idx_calc_zone_time ON attendance_calculated(zone_id, enter_time);
```

**Описание:** Рассчитанное присутствие сотрудников в зонах.

---

#### requirement_violations (Нарушения нормативов)
```sql
CREATE TABLE requirement_violations (
    id BIGSERIAL PRIMARY KEY,
    requirement_id UUID NOT NULL REFERENCES zone_requirements(id),
    period_date DATE NOT NULL,
    required_count INT NOT NULL,
    actual_count INT NOT NULL,
    deficit INT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_violations_req ON requirement_violations(requirement_id);
CREATE INDEX idx_violations_date ON requirement_violations(period_date);
```

---

### 2.5. Фрод-контроль

#### fraud_logs (Журнал инцидентов фрода)
```sql
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
);

CREATE INDEX idx_fraud_user ON fraud_logs(user_id);
CREATE INDEX idx_fraud_time ON fraud_logs(created_at);
CREATE INDEX idx_fraud_unreviewed ON fraud_logs(created_at) WHERE NOT is_reviewed;
CREATE INDEX idx_fraud_severity ON fraud_logs(severity);
```

---

### 2.6. Дополнительные таблицы

#### user_devices (История устройств пользователя)
```sql
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint_hash VARCHAR(64) NOT NULL,
    device_info JSONB,
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    is_trusted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_user_devices_fingerprint ON user_devices(fingerprint_hash);
```

---

#### device_push_tokens (Push-токены для FCM)
```sql
CREATE TABLE device_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user ON device_push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON device_push_tokens(is_active);
```

---

#### notifications (Уведомления)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;
```

---

#### audit_logs (Аудит действий)
```sql
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
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

---

#### beacon_telemetry (История телеметрии маяков)
```sql
CREATE TABLE beacon_telemetry (
    id BIGSERIAL PRIMARY KEY,
    beacon_id UUID NOT NULL REFERENCES beacons(id) ON DELETE CASCADE,
    battery_level INT CHECK (battery_level BETWEEN 0 AND 100),
    firmware_version VARCHAR(50),
    temperature FLOAT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beacon_telemetry_beacon ON beacon_telemetry(beacon_id);
CREATE INDEX idx_beacon_telemetry_time ON beacon_telemetry(recorded_at);
CREATE INDEX idx_beacon_telemetry_battery ON beacon_telemetry(battery_level) WHERE battery_level < 20;

-- Комментарии:
-- Хранит историю изменений батареи, температуры и версии прошивки маяков.
-- Используется для анализа деградации батарей и прогнозирования замен.
```

---

#### system_settings (Системные настройки)
```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Комментарии:
-- Хранит глобальные настройки системы:
-- - aggregation_interval_sec: интервал агрегации данных
-- - sync_interval_sec: интервал синхронизации
-- - scan_duty_cycle: параметры сканирования BLE
-- - fraud_thresholds: пороги детекции фрода
-- - smtp: настройки email
-- - backup: настройки резервного копирования

-- Примеры записей:
-- INSERT INTO system_settings (key, value, description) VALUES
-- ('aggregation_interval_sec', '600', 'Интервал агрегации данных (секунды)'),
-- ('fraud_thresholds', '{"teleportation_minutes": 5, "min_samples_count": 3}', 'Пороги детекции фрода'),
-- ('smtp', '{"host": "smtp.example.com", "port": 587, "from_email": "noreply@checkin-service.com"}', 'Настройки SMTP');
```

---

#### import_jobs (Задачи импорта Excel)
```sql
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
);

CREATE INDEX idx_import_jobs_user ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_time ON import_jobs(created_at);

-- Комментарии:
-- Отслеживает статус задач импорта Excel файлов.
-- Лимиты: max 10 МБ, max 10 000 строк.
-- Режимы: add (только новые), update (обновление существующих), replace (полная замена).
```

---

## 3. Триггеры и функции

### 3.1. Автоматическое обновление path для zones

```sql
CREATE EXTENSION IF NOT EXISTS ltree;

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER zones_path_trigger
    BEFORE INSERT OR UPDATE ON zones
    FOR EACH ROW
    EXECUTE FUNCTION zones_update_path();
```

### 3.2. Автоматическое обновление updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_objects_updated_at
    BEFORE UPDATE ON objects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zone_requirements_updated_at
    BEFORE UPDATE ON zone_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3.3. Каскадное обновление path для дочерних зон

```sql
-- Функция для каскадного обновления path при изменении parent_zone_id
CREATE OR REPLACE FUNCTION zones_update_path_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- Если parent_zone_id изменился, обновить path для всех дочерних зон
    IF OLD.parent_zone_id IS DISTINCT FROM NEW.parent_zone_id THEN
        -- Обновить path для текущей зоны
        IF NEW.parent_zone_id IS NULL THEN
            NEW.path = NEW.id::text::ltree;
        ELSE
            SELECT path || NEW.id::text INTO NEW.path
            FROM zones WHERE id = NEW.parent_zone_id;
        END IF;
        
        -- Рекурсивно обновить path для всех дочерних зон
        WITH RECURSIVE zone_tree AS (
            -- Начальная точка: текущая зона
            SELECT id, path, 1 as depth
            FROM zones
            WHERE id = NEW.id
            
            UNION ALL
            
            -- Рекурсия: дочерние зоны
            SELECT z.id, zt.path || z.id::text, zt.depth + 1
            FROM zones z
            INNER JOIN zone_tree zt ON z.parent_zone_id = zt.id
            WHERE zt.depth < 10  -- Защита от бесконечной рекурсии
        )
        UPDATE zones z
        SET path = zt.path
        FROM zone_tree zt
        WHERE z.id = zt.id AND z.id != NEW.id;  -- Исключить текущую зону (уже обновлена)
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Заменить существующий триггер на каскадный
DROP TRIGGER IF EXISTS zones_path_trigger ON zones;

CREATE TRIGGER zones_path_trigger
    BEFORE INSERT OR UPDATE ON zones
    FOR EACH ROW
    EXECUTE FUNCTION zones_update_path_cascade();
```

---

## 3.4. Авто-партиционирование и Retention Policy (НОВОЕ)

### 3.4.1. Автоматическое создание партиций

**Инструмент:** `pg_partman` (PostgreSQL Partition Manager)

**Установка:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_partman;
```

**Настройка для attendance_raw:**
```sql
SELECT partman.create_parent(
    p_parent_table => 'public.attendance_raw',
    p_control => 'scan_timestamp_start',
    p_type => 'range',
    p_interval => '1 month',
    p_premake => 3  -- Создавать 3 партиции заранее
);

-- Обновление конфигурации
UPDATE partman.part_config
SET retention = '12 months',
    retention_keep_table = false,
    retention_keep_index = false
WHERE parent_table = 'public.attendance_raw';
```

**Настройка для attendance_calculated:**
```sql
SELECT partman.create_parent(
    p_parent_table => 'public.attendance_calculated',
    p_control => 'enter_time',
    p_type => 'range',
    p_interval => '1 month',
    p_premake => 3
);

UPDATE partman.part_config
SET retention = '24 months',
    retention_keep_table = false
WHERE parent_table = 'public.attendance_calculated';
```

**Фоновая задача (cron):**
```bash
# Запускать ежедневно в 00:00
0 0 * * * /usr/bin/psql -U postgres -d checkin_db -c "SELECT partman.run_maintenance();"
```

### 3.4.2. Retention Policy

| Таблица | Срок хранения | Действие |
|---------|---------------|----------|
| `attendance_raw` | 12 месяцев | Удаление старых партиций |
| `attendance_calculated` | 24 месяца | Удаление старых партиций |
| `fraud_logs` | 36 месяцев | Архивация в холодное хранилище |
| `audit_logs` | 24 месяца | Удаление старых записей |
| `beacon_telemetry` | 6 месяцев | Удаление старых записей |
| `import_jobs` | 3 месяца | Удаление завершённых задач |

**SQL для ручной очистки (если не используется pg_partman):**
```sql
-- Удаление партиций старше 12 месяцев
DO $$
DECLARE
    partition_name text;
BEGIN
    FOR partition_name IN 
        SELECT inhrelid::regclass::text 
        FROM pg_inherits 
        WHERE inhparent = 'attendance_raw'::regclass
        AND inhrelid::regclass::text < 'attendance_raw_' || to_char(NOW() - INTERVAL '12 months', 'YYYY_MM')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || partition_name;
    END LOOP;
END $$;
```

---

## 4. Миграции

### 4.1. Структура папок миграций

```
migrations/
├── 001_initial_schema.sql
├── 002_create_indexes.sql
├── 003_create_triggers.sql
├── 004_create_partitions.sql
└── ...
```

### 4.2. Пример миграции

```sql
-- 001_initial_schema.sql

-- Таблицы справочников
CREATE TABLE objects (...);
CREATE TABLE zones (...);
CREATE TABLE beacons (...);

-- Таблицы пользователей
CREATE TABLE users (...);
CREATE TABLE contracts (...);
CREATE TABLE contract_objects (...);
CREATE TABLE contract_employees (...);
CREATE TABLE contract_curators (...);

-- Таблицы нормативов
CREATE TABLE zone_requirements (...);

-- Таблицы данных присутствия
CREATE TABLE attendance_raw (...) PARTITION BY RANGE (...);
CREATE TABLE attendance_calculated (...) PARTITION BY RANGE (...);
CREATE TABLE requirement_violations (...);

-- Таблицы фрод-контроля
CREATE TABLE fraud_logs (...);

-- Дополнительные таблицы
CREATE TABLE user_devices (...);
CREATE TABLE device_push_tokens (...);
CREATE TABLE notifications (...);
CREATE TABLE audit_logs (...);
```

---

## 5. ER-диаграмма

### 5.1. Основные связи

```
objects (1) ──── (N) zones
zones (1) ──── (N) beacons
zones (1) ──── (N) zone_requirements
beacons (1) ──── (N) beacon_telemetry (НОВОЕ)

contracts (M) ──── (N) objects (через contract_objects)
contracts (M) ──── (N) users (через contract_employees)
contracts (M) ──── (N) users (через contract_curators)

users (1) ──── (N) user_devices
users (1) ──── (N) device_push_tokens
users (1) ──── (N) notifications
users (1) ──── (N) fraud_logs
users (1) ──── (N) attendance_raw
users (1) ──── (N) attendance_calculated

zone_requirements (1) ──── (N) requirement_violations

system_settings (отдельная таблица, НОВОЕ)
import_jobs (отдельная таблица, НОВОЕ)
audit_logs (отдельная таблица)
```

### 5.2. Визуальная ER-диаграмма

```
┌─────────────────────────────────────────────────────────────────┐
│                         SCHEMA: public                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐          │
│  │ objects  │1      N│  zones   │1      N│ beacons  │          │
│  │----------│─────────│----------│─────────│----------│          │
│  │ id (PK)  │         │ id (PK)  │         │ id (PK)  │          │
│  │ name     │         │ object_id│         │ zone_id  │          │
│  │ address  │         │ parent_  │         │ uuid     │          │
│  │ is_active│         │  zone_id │         │ major    │          │
│  └──────────┘         │ name     │         │ minor    │          │
│                       │ zone_type│         │ battery  │          │
│                       │ level    │         └──────────┘          │
│                       │ rssi_    │                               │
│                       │  threshold│                              │
│                       │ path     │                               │
│                       └──────────┘                               │
│                            │                                     │
│                            │ 1                                  │
│                            │                                    │
│                            │ N                                  │
│                       ┌──────────┐                              │
│                       │ zone_    │                              │
│                       │ require- │                              │
│                       │ ments    │                              │
│                       │----------│                              │
│                       │ id (PK)  │                              │
│                       │ zone_id  │                              │
│                       │ contract_│                              │
│                       │  id      │                              │
│                       │ min_     │                              │
│                       │  employees│                             │
│                       │ period_  │                              │
│                       │  type    │                              │
│                       └──────────┘                              │
│                                                                    │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐          │
│  │contracts │M      N│contract_ │N      1│ objects  │          │
│  │----------│─────────│ objects  │─────────│          │          │
│  │ id (PK)  │         │----------│         └──────────┘          │
│  │ name     │         │contract_ │                              │
│  │ number   │         │  id      │                              │
│  │ dates    │         │object_id │                              │
│  └──────────┘         └──────────┘                              │
│                                                                    │
│  ┌──────────┐         ┌──────────┐                              │
│  │  users   │1      N│ user_    │                              │
│  │----------│─────────│ devices  │                              │
│  │ id (PK)  │         │----------│                              │
│  │ login    │         │ id (PK)  │                              │
│  │ email    │         │ user_id  │                              │
│  │ role     │         │finger-   │                              │
│  │ password │         │  print   │                              │
│  └──────────┘         └──────────┘                              │
│                                                                    │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐          │
│  │attend-   │         │attend-   │         │ require- │          │
│  │ ance_raw │────────>│ ance_    │         │ ment_    │          │
│  │----------│         │calculated│         │violations│          │
│  │ id       │         │----------│         │----------│          │
│  │ user_id  │         │ id       │         │ require- │          │
│  │ beacon_  │         │ user_id  │         │  ment_id │          │
│  │  uuid    │         │ zone_id  │         │ period_  │          │
│  │ timestamps│        │ enter/   │         │  date    │          │
│  │ rssi     │         │  exit    │         │ deficit  │          │
│  └──────────┘         │ duration │         └──────────┘          │
│                       └──────────┘                               │
│                                                                    │
│  ┌──────────┐                                                    │
│  │ fraud_   │                                                    │
│  │  logs    │                                                    │
│  │----------│                                                    │
│  │ id (PK)  │                                                    │
│  │ user_id  │                                                    │
│  │ fraud_   │                                                    │
│  │  type    │                                                    │
│  │ severity │                                                    │
│  │ details  │                                                    │
│  └──────────┘                                                    │
│                                                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Индексы и производительность

### 6.1. Основные индексы

| Таблица | Индекс | Тип | Описание |
|---------|--------|-----|----------|
| `zones` | `idx_zones_path` | GIST | Быстрые рекурсивные запросы |
| `attendance_raw` | `idx_raw_user_time` | B-tree | Поиск по пользователю и времени |
| `attendance_calculated` | `idx_calc_user_time` | B-tree | Поиск присутствия |
| `fraud_logs` | `idx_fraud_unreviewed` | Partial | Непросмотренные инциденты |
| `notifications` | `idx_notifications_unread` | Partial | Непрочитанные уведомления |

### 6.2. Партицирование

**Таблицы:** `attendance_raw`, `attendance_calculated`

**Стратегия:** По месяцам (RANGE на timestamp)

**Преимущества:**
- Ускорение запросов за счёт исключения старых партиций
- Упрощение архивации и удаления старых данных
- Улучшение производительности INSERT

---

## 7. Безопасность

### 7.1. Ролевая модель (RLS)

```sql
-- Включение RLS
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;

-- Политика для кураторов (только свои договоры)
CREATE POLICY curator_objects ON objects
    FOR SELECT
    USING (
        id IN (
            SELECT object_id FROM contract_objects
            WHERE contract_id IN (
                SELECT contract_id FROM contract_curators
                WHERE user_id = current_user_id()
            )
        )
    );
```

### 7.2. Шифрование

- **Пароли:** bcrypt (cost factor 12)
- **JWT:** RS256 (RSA 2048-bit)
- **Чувствительные данные:** AES-256 at rest

---

**Конец спецификации**
