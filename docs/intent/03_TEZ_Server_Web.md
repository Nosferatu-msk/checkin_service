# ТЕХНИЧЕСКОЕ ЗАДАНИЕ
## Серверная часть и Web-интерфейс администратора

**Версия документа:** 1.0
**Дата:** 04.11.2026
**Архитектура:** Клиент-серверная, REST API
**Тип приложения:** Монолит (с возможностью миграции на микросервисы)

---

## 1. ОБЩИЕ СВЕДЕНИЯ

### 1.1. Назначение системы
Серверная часть выполняет функции:
- Хранения справочников (объекты, зоны, маяки, договоры, пользователи).
- Приёма и обработки данных от мобильных приложений.
- Расчёта фактического присутствия сотрудников.
- Контроля выполнения нормативов (SLA).
- Детекции фрода.
- Предоставления Web-интерфейса для администраторов и кураторов.

### 1.2. Стек технологий (зафиксировано)
| Компонент | Технология |
|-----------|------------|
| Backend | **Node.js + NestJS** (единый язык с фронтендом, зрелая экосистема) |
| База данных | PostgreSQL 15+ |
| Кэш | Redis (для сессий, настроек, rate limiting) |
| Web-frontend | React + TypeScript + Ant Design |
| Очереди задач | Bull (Node.js) |
| Аутентификация | JWT (RS256, access + refresh tokens) |
| Push-уведомления | Firebase Cloud Messaging (FCM) |
| Хостинг | VPS (Timeweb, Selectel) или Free Tier (Oracle Cloud) |
| Reverse Proxy | Nginx + Let's Encrypt (SSL) |

---

## 2. АРХИТЕКТУРА СИСТЕМЫ

### 2.1. Компоненты
```
┌─────────────────┐         ┌──────────────────┐
│ Mobile App      │ ──API──▶│   REST API       │
│ (Android)       │◀─JSON──│   (Backend)      │
└─────────────────┘         └────────┬─────────┘
                                     │
┌─────────────────┐         ┌────────▼─────────┐
│ Web UI          │ ──API──▶│   PostgreSQL     │
│ (Admin/Curator) │◀─JSON──│   (БД)           │
└─────────────────┘         └──────────────────┘
                                     │
                            ┌────────▼─────────┐
                            │ Worker (фон)     │
                            │ - SLA-проверки   │
                            │ - Агрегация      │
                            │ - Фрод-детектор  │
                            └──────────────────┘
```

### 2.2. Принципы
- **Stateless API:** сервер не хранит состояние сессий (кроме blacklist токенов в Redis).
- **Асинхронная обработка:** тяжёлые задачи (SLA-проверки, агрегация) выполняются в фоне через очередь.
- **Масштабируемость:** возможность горизонтального масштабирования API-сервера.

---

## 3. СТРУКТУРА БАЗЫ ДАННЫХ

### 3.1. Справочники объектов и зон

```sql
-- Объекты
CREATE TABLE objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Зоны (универсальная иерархия: этаж/помещение/зона)
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
    parent_zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(20) NOT NULL CHECK (zone_type IN ('floor', 'room', 'zone')),
    level INT NOT NULL DEFAULT 1,
    rssi_threshold FLOAT DEFAULT -75.0,
    path LTREE,  -- для быстрых рекурсивных запросов
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_zones_object ON zones(object_id);
CREATE INDEX idx_zones_parent ON zones(parent_zone_id);
CREATE INDEX idx_zones_path ON zones USING GIST(path);

-- Маяки
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
```

### 3.2. Договоры и пользователи

```sql
-- Пользователи (расширенная версия)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,  -- для сброса пароля и уведомлений
    phone VARCHAR(20),  -- опционально
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'curator', 'employee')),
    device_fingerprint_hash VARCHAR(64),  -- SHA-256 (текущий)
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- История устройств пользователя (для фрод-расследования)
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint_hash VARCHAR(64) NOT NULL,
    device_info JSONB,  -- manufacturer, model, OS version
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    is_trusted BOOLEAN DEFAULT false,  -- подтверждено админом
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_user_devices_fingerprint ON user_devices(fingerprint_hash);

-- Договоры
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

-- Связь Договор ↔ Объект (многие-ко-многим)
CREATE TABLE contract_objects (
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
    PRIMARY KEY (contract_id, object_id)
);

-- Связь Договор ↔ Сотрудник
CREATE TABLE contract_employees (
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (contract_id, user_id)
);

-- Кураторы договоров (может быть несколько на договор)
CREATE TABLE contract_curators (
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (contract_id, user_id)
);
```

### 3.2.1. Дополнительные таблицы

```sql
-- Audit log (кто, когда, что изменил)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type VARCHAR(50) NOT NULL,  -- users, beacons, zones, contracts
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

-- Уведомления для пользователей
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- fraud_alert, sla_violation, beacon_battery, system
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- Push-токены для FCM
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

### 3.3. Нормативы (SLA)

```sql
CREATE TABLE zone_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    min_employees INT NOT NULL DEFAULT 1,
    visits_count INT NOT NULL DEFAULT 1,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    weekdays_mask INT DEFAULT 127,  -- битовая маска: пн=1, вт=2, ..., вс=64
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (zone_id, contract_id)
);
CREATE INDEX idx_req_zone ON zone_requirements(zone_id);
CREATE INDEX idx_req_contract ON zone_requirements(contract_id);
```

### 3.4. Данные присутствия

```sql
-- Сырые данные с мобильных приложений (ПАРТИЦИОНИРОВАНИЕ)
CREATE TABLE attendance_raw (
    id BIGSERIAL,
    user_id UUID NOT NULL,
    beacon_uuid VARCHAR(36) NOT NULL,
    mac_address VARCHAR(17),  -- MAC-адрес маяка для защиты от клонирования
    scan_timestamp_start TIMESTAMPTZ NOT NULL,
    scan_timestamp_end TIMESTAMPTZ NOT NULL,
    median_rssi FLOAT NOT NULL,
    min_rssi FLOAT,
    max_rssi FLOAT,
    samples_count INT,
    device_fingerprint_hash VARCHAR(64),
    request_id UUID,  -- для защиты от replay-атак
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, scan_timestamp_start)
) PARTITION BY RANGE (scan_timestamp_start);

-- Создание партиций по месяцам (автоматически через pg_partman или cron)
CREATE TABLE attendance_raw_2026_11 PARTITION OF attendance_raw
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE attendance_raw_2026_12 PARTITION OF attendance_raw
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
-- ... автоматическое создание следующих партиций

CREATE INDEX idx_raw_user_time ON attendance_raw(user_id, scan_timestamp_start);
CREATE INDEX idx_raw_beacon ON attendance_raw(beacon_uuid);
CREATE INDEX idx_raw_request_id ON attendance_raw(request_id);

-- Рассчитанное присутствие (агрегированное, ПАРТИЦИОНИРОВАНИЕ)
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
-- ... аналогично

CREATE INDEX idx_calc_user_time ON attendance_calculated(user_id, enter_time);
CREATE INDEX idx_calc_zone_time ON attendance_calculated(zone_id, enter_time);

-- Нарушения нормативов
CREATE TABLE requirement_violations (
    id BIGSERIAL PRIMARY KEY,
    requirement_id UUID NOT NULL REFERENCES zone_requirements(id),
    period_date DATE NOT NULL,
    required_count INT NOT NULL,
    actual_count INT NOT NULL,
    deficit INT NOT NULL,
    details JSONB,  -- кто должен был быть, кто был
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Журнал фрода (расширенный)
CREATE TABLE fraud_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    fraud_type VARCHAR(50) NOT NULL CHECK (fraud_type IN (
        'device_mismatch',           -- несовпадение fingerprint
        'device_changed',            -- смена устройства (подтверждено админом)
        'simultaneous_presence',     -- одновременное присутствие на 2 объектах
        'teleportation',             -- перемещение < 5 минут
        'emulator_detected',         -- запуск на эмуляторе
        'root_detected',             -- устройство с root-правами
        'mock_location',             -- mock BLE/Location
        'beacon_clone_detected',     -- клонирование маяка
        'clock_skew_detected'        -- расхождение времени > 5 минут
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
```

### 3.4.1. Триггер для ltree path

```sql
-- Расширение для ltree
CREATE EXTENSION IF NOT EXISTS ltree;

-- Функция для вычисления path
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

-- Триггер для автоматического заполнения path
CREATE TRIGGER zones_path_trigger
    BEFORE INSERT OR UPDATE ON zones
    FOR EACH ROW
    EXECUTE FUNCTION zones_update_path();
```

---

## 4. REST API

### 4.0. Общие стандарты API

**Версионирование:** все эндпоинты используют префикс `/api/v1/` (например, `/api/v1/auth/login`).

**Формат ответов (envelope):**
```json
// Успешный ответ (список)
{
  "data": [...],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}

// Успешный ответ (объект)
{
  "data": { "id": "...", ... }
}

// Ошибка
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Описание ошибки",
    "details": [
      { "field": "email", "message": "Некорректный формат" }
    ]
  }
}
```

**Пагинация:** `?page=1&per_page=20` (offset-based) или `?cursor=xxx&limit=20` (cursor-based для больших объёмов).

**Фильтрация и сортировка:** `?search=...&status=...&from=...&to=...&sort_by=...&sort_order=asc|desc`.

**Rate limiting:**
- Auth endpoints: 5 req/min на IP.
- Mobile endpoints: 10 req/min на пользователя.
- Admin endpoints: 60 req/min на пользователя.
- Import endpoints: 3 req/min.

**Health check:** `GET /api/v1/health` — проверка БД, Redis, очереди.

### 4.1. Аутентификация
**POST /api/v1/auth/login**
```json
// Request
{ "login": "string", "password": "string", "device_fingerprint": "string", "push_token": "string" }

// Response 200
{
  "data": {
    "access_token": "jwt...",
    "refresh_token": "jwt...",
    "user": { "id": "uuid", "role": "employee", "full_name": "...", "email": "..." }
  }
}

// Response 401 (неверные данные)
// Response 403 (несовпадение fingerprint)
```

**POST /api/v1/auth/refresh**
```json
{ "refresh_token": "jwt..." }
// Response: новый access_token
```

**POST /api/v1/auth/logout** — инвалидация refresh_token.

**POST /api/v1/auth/forgot-password** — запрос сброса пароля.
```json
{ "email": "user@example.com" }
// Response 200: { "message": "Инструкции отправлены на email" }
```

**POST /api/v1/auth/reset-password** — сброс пароля по токену.
```json
{ "token": "...", "new_password": "..." }
// Response 200: { "message": "Пароль успешно изменён" }
```

**POST /api/v1/mobile/push-token** — регистрация push-токена.
```json
{ "push_token": "fcm_token...", "platform": "android" }
// Response 200: { "message": "Токен зарегистрирован" }
```

### 4.2. Мобильное приложение (эндпоинты для сотрудника)

**GET /api/v1/mobile/settings** — настройки для клиента:
```json
{
  "data": {
    "allowed_beacon_uuids": ["uuid1", "uuid2"],
    "aggregation_interval_sec": 600,
    "sync_interval_sec": 600,
    "scan_duty_cycle": { "scan_duration_ms": 3000, "pause_duration_ms": 7000 },
    "security": {
      "require_fingerprint": true,
      "forbid_emulators": true,
      "require_play_integrity": true
    }
  }
}
```

**POST /api/v1/mobile/attendance** — отправка агрегированных данных:
```json
// Request
{
  "request_id": "uuid-для-replay-protection",
  "records": [
    {
      "beacon_uuid": "...",
      "mac_address": "AA:BB:CC:DD:EE:FF",
      "major": 1,
      "minor": 100,
      "scan_timestamp_start": "2026-11-04T10:00:00Z",
      "scan_timestamp_end": "2026-11-04T10:10:00Z",
      "median_rssi": -65.5,
      "min_rssi": -72,
      "max_rssi": -58,
      "samples_count": 45,
      "device_fingerprint": "sha256..."
    }
  ]
}

// Response 200
{ "data": { "accepted": 1, "synced_at": "..." } }
// Response 409 Conflict: { "error": { "code": "DUPLICATE_REQUEST", "message": "..." } }
```

**POST /api/v1/mobile/beacon-telemetry** — отправка телеметрии маяков (battery_level):
```json
// Request
{
  "beacons": [
    {
      "beacon_uuid": "...",
      "mac_address": "AA:BB:CC:DD:EE:FF",
      "battery_level": 85,
      "firmware_version": "1.2.3",
      "temperature": 22.5,
      "last_seen_at": "2026-11-04T10:00:00Z"
    }
  ]
}

// Response 200
{ "data": { "accepted": 1 } }
```

**GET /api/v1/mobile/my-attendance?from=&to=** — история сотрудника.

### 4.3. Админ-панель (эндпоинты для администратора)

**Объекты и зоны:**
- `GET/POST/PUT/DELETE /api/v1/admin/objects`
- `GET/POST/PUT/DELETE /api/v1/admin/zones`
- `GET/POST/PUT/DELETE /api/v1/admin/beacons`
- `POST /api/v1/admin/import/excel` — массовый импорт (объекты, зоны, маяки)
- `GET /api/v1/admin/export/excel` — экспорт справочников

**Договоры и пользователи:**
- `GET/POST/PUT/DELETE /api/v1/admin/contracts`
- `GET/POST/PUT/DELETE /api/v1/admin/users`
- `POST /api/v1/admin/users/{id}/devices` — управление доверенными устройствами
- `POST /api/v1/admin/contracts/{id}/employees` — привязка сотрудников
- `POST /api/v1/admin/contracts/{id}/objects` — привязка объектов
- `POST /api/v1/admin/contracts/{id}/curators` — привязка кураторов

**Нормативы:**
- `GET/POST/PUT/DELETE /api/v1/admin/requirements`

**Аналитика:**
- `GET /api/v1/admin/analytics/attendance` — табель присутствия
- `GET /api/v1/admin/analytics/sla` — выполнение нормативов
- `GET /api/v1/admin/analytics/fraud` — журнал инцидентов

**Уведомления:**
- `GET /api/v1/admin/notifications` — список уведомлений
- `POST /api/v1/admin/notifications/{id}/read` — пометить как прочитанное
- `POST /api/v1/admin/fraud/{id}/review` — просмотр инцидента фрода

### 4.4. Куратор (эндпоинты для куратора)
Те же эндпоинты, что и у админа, но с **автоматической фильтрацией** по `contract_id`, к которым привязан куратор. Реализация через middleware, проверяющий `contract_curators`.

---

## 5. WEB-ИНТЕРФЕЙС (ФРОНТЕНД)

### 5.1. Ролевая модель доступа

| Раздел | Администратор | Куратор | Сотрудник |
|--------|:---:|:---:|:---:|
| Дашборд | ✅ Полный | ✅ Только свои договоры | ❌ |
| Объекты / Зоны / Маяки | ✅ CRUD | 👁 Только связанные | ❌ |
| Договоры | ✅ CRUD | 👁 Только свои | ❌ |
| Сотрудники | ✅ CRUD | ✅ CRUD в своих договорах | ❌ |
| Нормативы (SLA) | ✅ CRUD | ✅ CRUD в своих зонах | ❌ |
| Табель присутствия | ✅ Все | ✅ Только свои сотрудники | 👁 Только свой |
| Журнал фрода | ✅ Полный | ✅ Только свои сотрудники | ❌ |
| Импорт/Экспорт Excel | ✅ | ✅ В своих договорах | ❌ |
| Настройки системы | ✅ | ❌ | ❌ |

### 5.2. Структура Web-интерфейса

#### 5.2.1. Дашборд (главная страница)
- **Для администратора:**
  - Количество активных объектов, договоров, сотрудников.
  - График посещений за последние 7 дней.
  - Топ-5 нарушений SLA за неделю.
  - Топ-5 инцидентов фрода.
  - Статус маяков (низкий заряд батареи).

- **Для куратора:**
  - Список своих договоров.
  - По каждому договору: выполнение SLA (зелёный/жёлтый/красный индикатор).
  - Кто из сотрудников сейчас на объекте (онлайн).
  - Пропуски нормативов за сегодня.

#### 5.2.2. Раздел "Объекты и Зоны"
- Древовидное представление: `Объект → Этаж/Зона → Помещение`.
- Для каждой зоны:
  - Список маяков с индикацией заряда батареи.
  - Нормативы по всем договорам.
  - История посещений за период.
- Кнопка "Импорт из Excel" (скачать шаблон, загрузить файл).

#### 5.2.3. Раздел "Договоры"
- Таблица договоров с фильтрами (статус, куратор, даты).
- Для каждого договора:
  - Вкладка "Объекты" (привязанные объекты).
  - Вкладка "Сотрудники" (CRUD для куратора).
  - Вкладка "Нормативы" (SLA по зонам).
  - Вкладка "Отчёты" (табель, выполнение SLA).

#### 5.2.4. Раздел "Сотрудники"
- Таблица сотрудников с фильтрами (договор, объект, роль).
- Для каждого сотрудника:
  - Персональная карточка.
  - История посещений.
  - Инциденты фрода.
  - Device fingerprint.

#### 5.2.5. Раздел "Табель присутствия"
- Календарь с выбором периода.
- Таблица: `Сотрудник × Дата` с ячейками (время прихода/ухода, отработано часов).
- Детализация по клику: список зон, время в каждой зоне.
- Экспорт в Excel.

#### 5.2.6. Раздел "Выполнение SLA"
- Таблица нормативов с индикаторами выполнения.
- Фильтры: договор, объект, период, статус (выполнен/не выполнен).
- Детализация: по каждому пропущенному периоду — кто должен был быть, кто был.

#### 5.2.7. Раздел "Фрод-контроль"
- Лента инцидентов с цветовой индикацией по severity.
- Фильтры: тип фрода, сотрудник, период.
- Детализация: полная информация о событии.
- Кнопки: "Просмотрено", "Заблокировать сотрудника".

#### 5.2.8. Раздел "Настройки системы" (только администратор)
- **Глобальные параметры:**
  - Интервал агрегации данных (по умолчанию 10 мин).
  - Интервал синхронизации (по умолчанию 10 мин).
  - Scan duty cycle (scan_duration_ms, pause_duration_ms).
  - Пороги фрода (время телепортации, минимальное количество замеров).
- **Настройки email (SMTP):**
  - SMTP host, port, user, password.
  - From email, from name.
- **Управление пользователями:**
  - Список пользователей с фильтрами.
  - Создание нового пользователя (с генерацией временного пароля).
  - Сброс пароля пользователя.
  - Блокировка/разблокировка пользователя.
  - Управление доверенными устройствами (подтверждение смены устройства).
- **Системные параметры:**
  - SLA check schedule (cron expression).
  - Backup settings.
  - Beacon health check interval.

### 5.4. Real-time обновления

**WebSocket-эндпоинт:** `ws://server/api/v1/ws`

**События для real-time обновлений:**
- `fraud_alert` — новый инцидент фрода (для администратора).
- `sla_violation` — нарушение SLA (для куратора).
- `beacon_status` — изменение статуса маяка (онлайн/оффлайн, низкий заряд).
- `employee_presence` — сотрудник пришёл/ушёл (для куратора).
- `notification` — новое уведомление.

**Реализация:**
- Мобильное приложение подключается к WebSocket при запуске.
- Web-интерфейс подключается при входе.
- Сервер отправляет события через Bull queue → WebSocket gateway.

### 5.5. Система уведомлений

**In-app уведомления (колокольчик):**
- Отображаются в правом верхнем углу Web-интерфейса.
- Счётчик непрочитанных уведомлений.
- Выпадающий список с последними 10 уведомлениями.
- Переход на страницу уведомлений для просмотра всех.

**Email-уведомления:**
- Критические события: fraud (critical), SLA violation, beacon offline.
- Настраиваются в профиле пользователя.

### 5.3. Импорт из Excel

#### 5.3.1. Шаблоны файлов
Система предоставляет шаблоны Excel для скачивания:
- `template_objects.xlsx` — объекты.
- `template_zones.xlsx` — зоны (с указанием родителя).
- `template_beacons.xlsx` — маяки (UUID, Major, Minor, зона).
- `template_employees.xlsx` — сотрудники.
- `template_requirements.xlsx` — нормативы.

#### 5.3.2. Валидация
При загрузке файла:
1. Проверка структуры (названия колонок, типы данных).
2. Проверка ссылок (существует ли родительская зона, объект).
3. Проверка уникальности (UUID маяка, логин сотрудника).
4. В случае ошибок — возврат файла с подсветкой проблемных строк.

#### 5.3.3. Режимы импорта
- **Добавление** — только новые записи.
- **Обновление** — обновление существующих по ключу.
- **Полная замена** — удаление старых, вставка новых (с подтверждением).

#### 5.3.4. Лимиты
- Максимальный размер файла: 10 МБ.
- Максимальное количество строк: 10 000.
- Использовать streaming-парсинг (xlsx streaming) для больших файлов.

#### 5.2.5. Раздел "Табель присутствия" (улучшенный)
- Календарь с выбором периода.
- Таблица: `Сотрудник × Дата` с ячейками (время прихода/ухода, отработано часов).
- **Виртуализация:** использование Ant Design Table с virtual scroll для 100+ сотрудников.
- **Фиксированная первая колонка** (имя сотрудника) при горизонтальной прокрутке.
- Детализация по клику: список зон, время в каждой зоне.
- Экспорт в Excel (с учётом виртуализации — экспорт только видимых данных или полный).

---

## 6. БИЗНЕС-ЛОГИКА И АЛГОРИТМЫ

### 6.1. Алгоритм расчёта присутствия (Worker)

**Входные данные:** сырые записи `attendance_raw` за последние 10 минут.

**Алгоритм:**
```python
def process_raw_attendance(raw_records):
    for record in raw_records:
        # 0. Валидация timestamps
        if record.scan_timestamp_end > NOW() + INTERVAL('5 minutes'):
            continue  # timestamp из будущего
        if record.scan_timestamp_start < NOW() - INTERVAL('24 hours'):
            continue  # timestamp старше 24 часов
        if record.scan_timestamp_start >= record.scan_timestamp_end:
            continue  # некорректный диапазон
        
        # 0.1. Валидация RSSI
        if not (-100 <= record.median_rssi <= -30):
            continue  # RSSI вне разумного диапазона
        if record.samples_count < 3:
            continue  # недостаточно замеров (защита от случайных срабатываний)
        
        # 1. Найти маяк по UUID
        beacon = Beacon.get_by_uuid(record.beacon_uuid)
        if not beacon:
            continue  # неизвестный маяк
        
        # 1.1. Проверка активности маяка
        if not beacon.is_active:
            continue  # маяк деактивирован
        
        # 1.2. Проверка MAC-адреса (защита от клонирования)
        if beacon.mac_address and record.mac_address:
            if beacon.mac_address != record.mac_address:
                log_fraud('beacon_clone_detected', {
                    'expected_mac': beacon.mac_address,
                    'actual_mac': record.mac_address,
                    'beacon_uuid': record.beacon_uuid
                })
                continue
        
        # 2. Проверить порог RSSI
        zone = beacon.zone
        threshold = zone.rssi_threshold or zone.get_inherited_threshold()
        
        if record.median_rssi > threshold:  # RSSI сильнее порога
            # 3. Зафиксировать присутствие в зоне
            create_or_extend_session(
                user_id=record.user_id,
                zone_id=zone.id,
                enter_time=record.scan_timestamp_start,
                exit_time=record.scan_timestamp_end,
                rssi=record.median_rssi
            )
        
        # 4. Обновить last_seen_at для маяка
        beacon.last_seen_at = NOW()
```

**Логика сессий:**
- Если между двумя записями одного пользователя в одной зоне разрыв < 5 минут — считать одной сессией.
- Иначе — две разные сессии.

**Обработка переходных зон:**
- Если сотрудник одновременно в нескольких зонах одного объекта — учитывать только в зоне с более сильным RSSI.

### 6.2. Алгоритм агрегации по иерархии зон

Если норматив задан на **этаж**, а посещения фиксируются в **помещениях**:
```sql
WITH RECURSIVE zone_tree AS (
    SELECT id FROM zones WHERE id = :target_zone_id
    UNION ALL
    SELECT z.id FROM zones z
    INNER JOIN zone_tree zt ON z.parent_zone_id = zt.id
)
SELECT COUNT(DISTINCT ac.user_id)
FROM attendance_calculated ac
WHERE ac.zone_id IN (SELECT id FROM zone_tree)
  AND ac.enter_time BETWEEN :start AND :end;
```

### 6.3. Алгоритм проверки SLA (ежедневный Worker)

**Запускается:** ежедневно в 00:30 по прошедшему дню.

**Определение функции `count_visit_groups`:**
```python
def count_visit_groups(visits, min_employees):
    """
    Подсчитывает количество уникальных сотрудников за период.
    
    visits: список записей attendance_calculated с полями user_id, enter_time, exit_time
    min_employees: минимальное количество сотрудников, которое должно быть одновременно
    
    Возвращает: количество уникальных сотрудников за период
    """
    unique_users = set()
    for visit in visits:
        unique_users.add(visit.user_id)
    return len(unique_users)
```

**Алгоритм проверки:**
```python
def check_sla_for_date(date):
    requirements = ZoneRequirement.get_active()

    for req in requirements:
        if req.period_type == 'daily':
            if not matches_weekday(date, req.weekdays_mask):
                continue

            # Собрать посещения за день во всей иерархии зоны
            visits = get_visits_in_zone_hierarchy(req.zone_id, date, date)
            unique_employees = count_visit_groups(visits, req.min_employees)

            if unique_employees < req.visits_count:
                create_violation(req, date, req.visits_count, unique_employees)
        
        elif req.period_type == 'weekly':
            # Проверка в понедельник 00:30 за прошедшую неделю (пн-вс)
            if date.weekday() == 0:  # понедельник
                week_start = date - timedelta(days=7)
                week_end = date - timedelta(days=1)
                visits = get_visits_in_zone_hierarchy(req.zone_id, week_start, week_end)
                unique_employees = count_visit_groups(visits, req.min_employees)
                
                if unique_employees < req.visits_count:
                    create_violation(req, week_end, req.visits_count, unique_employees)
        
        elif req.period_type == 'monthly':
            # Проверка 1-го числа за прошедший месяц
            if date.day == 1:
                month_start = (date - timedelta(days=1)).replace(day=1)
                month_end = date - timedelta(days=1)
                visits = get_visits_in_zone_hierarchy(req.zone_id, month_start, month_end)
                unique_employees = count_visit_groups(visits, req.min_employees)
                
                if unique_employees < req.visits_count:
                    create_violation(req, month_end, req.visits_count, unique_employees)
```

### 6.4. Алгоритм детекции фрода

**Триггер:** при каждом приёме `attendance_raw`.

```python
def detect_fraud(user_id, raw_record):
    # 1. Проверка fingerprint
    user = User.get(user_id)
    if user.device_fingerprint_hash and \
       user.device_fingerprint_hash != raw_record.device_fingerprint_hash:
        log_fraud(user_id, 'device_mismatch', {...})

    # 2. Проверка одновременного присутствия
    recent_sessions = get_active_sessions(user_id, raw_record.scan_timestamp_start)
    current_zone = get_zone_by_beacon(raw_record.beacon_uuid)
    current_object = current_zone.object

    for session in recent_sessions:
        session_object = session.zone.object
        if session_object.id != current_object.id:
            log_fraud(user_id, 'simultaneous_presence', {
                'object_1': session_object.id,
                'object_2': current_object.id,
                'timestamp': raw_record.scan_timestamp_start
            })

    # 3. Проверка телепортации (< 5 минут между объектами)
    last_session = get_last_session(user_id, exclude_object=current_object.id)
    if last_session:
        time_diff = raw_record.scan_timestamp_start - last_session.exit_time
        if time_diff < timedelta(minutes=5):
            log_fraud(user_id, 'teleportation', {
                'from_object': last_session.zone.object.id,
                'to_object': current_object.id,
                'minutes': time_diff.total_seconds() / 60
            })
```

### 6.5. Push-инфраструктура (FCM)

**Интеграция с Firebase Cloud Messaging:**

```python
# Worker для отправки push-уведомлений
class PushNotificationWorker:
    def send_to_user(self, user_id, title, body, data=None):
        """Отправить push-уведомление пользователю на все его устройства"""
        tokens = DevicePushToken.get_active_tokens(user_id)
        for token in tokens:
            try:
                send_fcm_message(
                    token=token.push_token,
                    title=title,
                    body=body,
                    data=data or {}
                )
            except Exception as e:
                # Если токен невалиден — пометить как неактивный
                if 'invalid-registration' in str(e):
                    token.is_active = False
                    token.save()
    
    def send_logout_command(self, user_id):
        """Отправить команду logout на все устройства пользователя"""
        self.send_to_user(
            user_id=user_id,
            title="Сессия завершена",
            body="Администратор завершил вашу сессию",
            data={"action": "logout"}
        )
```

**Обработка push-токенов:**
- При логине мобильное приложение отправляет FCM-токен через `POST /api/v1/mobile/push-token`.
- Токен сохраняется в `device_push_tokens` с привязкой к `user_id`.
- При logout — токен помечается как неактивный.

### 6.6. Мониторинг состояния маяков

**Worker для детекции "мёртвых" маяков:**

```python
class BeaconHealthWorker:
    def check_beacons_health(self):
        """Запускается каждые 10 минут"""
        now = NOW()
        
        # Маяки, которые не обнаруживались > 24 часов
        dead_beacons = Beacon.query.filter(
            Beacon.is_active == True,
            Beacon.last_seen_at < now - INTERVAL('24 hours')
        ).all()
        
        for beacon in dead_beacons:
            # Создать уведомление для администраторов
            create_notification(
                user_id=get_admin_users(),
                type='beacon_offline',
                title=f"Маяк {beacon.name} не отвечает",
                body=f"Маяк в зоне {beacon.zone.name} не обнаруживается более 24 часов"
            )
        
        # Маяки с низким зарядом батареи
        low_battery_beacons = Beacon.query.filter(
            Beacon.is_active == True,
            Beacon.battery_level < 15,
            Beacon.battery_level > 0
        ).all()
        
        for beacon in low_battery_beacons:
            create_notification(
                user_id=get_admin_users(),
                type='beacon_low_battery',
                title=f"Низкий заряд маяка {beacon.name}",
                body=f"Заряд батареи {beacon.battery_level}%. Требуется замена."
            )
```

---

## 7. НЕФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ

### 7.1. Производительность
- API-ответ: < 500 мс для 95% запросов.
- Обработка 10 000 записей `attendance_raw` за 1 минуту.
- Web-интерфейс: первая загрузка < 3 сек.

### 7.2. Масштабируемость
- Поддержка до 10 000 сотрудников.
- До 1 000 объектов, 10 000 зон, 50 000 маяков.
- До 1 млн записей `attendance_raw` в день.

### 7.3. Надёжность
- Доступность: 99.5% (допускается плановое обслуживание ночью).
- Резервное копирование БД: ежедневно, хранение 30 дней.
- Логирование всех критических операций.

### 7.4. Безопасность
- **Пароли:** Argon2id с параметрами: memory=64MB, iterations=3, parallelism=4. Минимум 8 символов, хотя бы 1 цифра + 1 буква.
- **JWT:** RS256, срок жизни access_token 15 мин, refresh_token 30 дней.
- **HTTPS обязательно** (TLS 1.2+).
- **Защита от brute-force:** лимит 5 попыток входа за 15 минут. Блокировка аккаунта на 30 минут после 5 неудачных попыток.
- **Защита от CSRF, XSS, SQL-инъекций** (через ORM и middleware).
- **Audit log:** кто, когда, что изменил (таблица `audit_logs`).
- **Валидация входных данных:** DTO validation (class-validator для NestJS). Лимит размера upload-файлов (10 МБ).
- **CORS-политика:** список разрешённых доменов (web-ui domain).
- **Certificate Pinning** для мобильного приложения.

### 7.5. Резервное копирование
- Автоматический бэкап PostgreSQL раз в сутки.
- Возможность point-in-time recovery.

---

## 8. ТРЕБОВАНИЯ К РАЗВЁРТЫВАНИЮ

### 8.1. Минимальные требования к серверу
- CPU: 2 ядра
- RAM: 4 ГБ
- Disk: 40 ГБ SSD
- OS: Ubuntu 22.04 LTS

### 8.2. Компоненты для установки
- Docker + Docker Compose (рекомендуется)
- PostgreSQL 15
- Redis 7
- Node.js 20 / Python 3.11
- Nginx (reverse proxy)
- Let's Encrypt (SSL)

### 8.3. Переменные окружения
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/presence
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
ADMIN_EMAIL=...
```

---

## 9. ЭТАПЫ РАЗРАБОТКИ

| Этап | Срок | Результат |
|------|------|-----------|
| 1. Проектирование БД и API | 1 неделя | Схема БД (с партиционированием), OpenAPI-спецификация (v1) |
| 2. Базовый backend (auth, CRUD) | 2 недели | Работающие эндпоинты, аутентификация, push-токены |
| 3. Обработка attendance_raw | 2 недели | Расчёт присутствия, валидация, защита от клонирования |
| 4. SLA-контроль и фрод | 2 недели | Workers, детекторы, мониторинг маяков |
| 5. Push-инфраструктура | 1 неделя | FCM интеграция, уведомления, remote logout |
| 6. Web-интерфейс (базовый) | 3 недели | Админка с CRUD, настройки системы |
| 7. Web-интерфейс (аналитика) | 2 недели | Дашборды, отчёты, real-time обновления |
| 8. Импорт/экспорт Excel | 1 неделя | Массовые операции с лимитами |
| 9. Тестирование и отладка | 2 недели | Интеграция с мобильным приложением |
| 10. Развёртывание | 3 дня | Прод |

**Итого:** ~17 недель до промышленного релиза.

---

## 10. SUMMARY ИСПРАВЛЕНИЙ (v2.0)

**Критические проблемы, устранённые в этой версии:**

1. ✅ **Добавлена push-инфраструктура (FCM)** — таблицы `device_push_tokens`, эндпоинты для регистрации токенов, worker для отправки команд.
2. ✅ **Синхронизированы алгоритмы присутствия** — добавлена проверка `samples_count >= 3` на сервере (согласовано с мобильным ТЗ).
3. ✅ **Определена функция `count_visit_groups`** — явное определение: подсчёт уникальных сотрудников за период.
4. ✅ **Добавлено партиционирование БД** — `attendance_raw` и `attendance_calculated` партиционированы по месяцам.
5. ✅ **Добавлено версионирование API** — все эндпоинты используют `/api/v1/`.
6. ✅ **Добавлена защита от клонирования маяков** — проверка MAC-адреса в алгоритме расчёта присутствия.
7. ✅ **Добавлена валидация данных** — проверка timestamps, RSSI, MAC-адресов, request_id для replay-атак.

**Дополнительные улучшения:**

- ✅ Добавлены недостающие таблицы: `audit_logs`, `user_devices`, `notifications`, `device_push_tokens`.
- ✅ Расширена таблица `users` — добавлены `email`, `phone`.
- ✅ Добавлен триггер для автоматического заполнения `ltree path`.
- ✅ Зафиксирован стек технологий: Node.js + NestJS + PostgreSQL + Redis + Bull + React + Ant Design.
- ✅ Добавлены стандарты API: формат ответов (envelope), пагинация, фильтрация, rate limiting.
- ✅ Добавлена push-инфраструктура для remote logout и уведомлений.
- ✅ Добавлен мониторинг состояния маяков (worker для детекции "мёртвых" маяков).
- ✅ Добавлена система уведомлений (in-app + email).
- ✅ Добавлены real-time обновления через WebSocket.
- ✅ Добавлен раздел "Настройки системы" для администратора.
- ✅ Улучшена политика безопасности: Argon2id, валидация входных данных, CORS.
- ✅ Добавлены лимиты для Excel-импорта (10 МБ / 10 000 строк).
- ✅ Добавлена виртуализация для табеля присутствия (100+ сотрудников).

---

## 10. КРИТЕРИИ ПРИЁМКИ

| № | Критерий | Метод проверки |
|---|----------|----------------|
| 1 | API соответствует OpenAPI-спецификации | Автотесты |
| 2 | Все роли имеют корректные права доступа | Ручное тестирование |
| 3 | Расчёт присутствия совпадает с ручной выборкой | Сравнительный анализ |
| 4 | SLA-нарушения фиксируются корректно | Тестовые сценарии |
| 5 | Фрод детектируется во всех 5 сценариях | Тестовые сценарии |
| 6 | Импорт Excel валидирует данные | Загрузка некорректных файлов |
| 7 | Web-интерфейс работает во всех современных браузерах | Ручное тестирование |
| 8 | Нагрузка 1000 RPS выдерживается | JMeter / k6 |
