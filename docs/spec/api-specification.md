# API Specification — Контроль присутствия

**Версия:** 1.0  
**Дата:** 04.11.2026  
**Base URL:** `/api/v1/`  
**Протокол:** REST over HTTP/HTTPS  
**Формат данных:** JSON

---

## 1. Общие стандарты

### 1.1. Формат ответов

**Успешный ответ (список):**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

**Успешный ответ (объект):**
```json
{
  "data": {
    "id": "uuid",
    "name": "...",
    ...
  }
}
```

**Ошибка:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Описание ошибки",
    "details": [
      {
        "field": "email",
        "message": "Некорректный формат"
      }
    ]
  }
}
```

### 1.2. HTTP коды состояния

| Код | Описание |
|-----|----------|
| 200 | Успех |
| 201 | Создано |
| 204 | Нет содержимого (успешное удаление) |
| 400 | Неверный запрос (валидация) |
| 401 | Не авторизован |
| 403 | Запрещено (нет прав) |
| 404 | Не найдено |
| 409 | Конфликт (дубликат) |
| 429 | Слишком много запросов (rate limit) |
| 500 | Внутренняя ошибка сервера |

### 1.3. Пагинация

**Offset-based:**
```
GET /api/v1/admin/objects?page=1&per_page=20
```

**Cursor-based (для больших объёмов):**
```
GET /api/v1/admin/attendance?cursor=xxx&limit=100
```

### 1.4. Фильтрация и сортировка

```
GET /api/v1/admin/users?search=Иван&role=employee&is_active=true&sort_by=created_at&sort_order=desc
```

### 1.5. Rate Limiting

| Endpoint Group | Limit |
|----------------|-------|
| Auth (`/auth/*`) | 5 req/min на IP |
| Mobile (`/mobile/*`) | 10 req/min на пользователя |
| Admin (`/admin/*`) | 60 req/min на пользователя |
| Import (`/import/*`) | 3 req/min |

**Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699084800
```

### 1.6. Аутентификация

**JWT Token (RS256):**
- `access_token` — 15 минут
- `refresh_token` — 30 дней

**Header:**
```
Authorization: Bearer <access_token>
```

### 1.7. CORS Policy (НОВОЕ)

**Разрешённые источники:**
```
Access-Control-Allow-Origin: https://app.checkin-service.com, https://admin.checkin-service.com
```

**Разрешённые методы:**
```
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

**Разрешённые заголовки:**
```
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

**Expose headers:**
```
Access-Control-Expose-Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

**Max age:**
```
Access-Control-Max-Age: 86400
```

**Credentials:**
```
Access-Control-Allow-Credentials: true
```

**Nginx конфигурация:**
```nginx
location /api/ {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://app.checkin-service.com';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With';
        add_header 'Access-Control-Max-Age' 86400;
        return 204;
    }
    
    proxy_pass http://localhost:3000;
}
```

---

## 2. Endpoints

### 2.1. Аутентификация

#### POST /auth/login
**Описание:** Вход в систему  
**Access:** Public

**Request:**
```json
{
  "login": "string",
  "password": "string",
  "device_fingerprint": "string",
  "push_token": "string"
}
```

**Response 200:**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "login": "admin",
      "email": "admin@example.com",
      "full_name": "Администратор Системы",
      "role": "admin"
    }
  }
}
```

**Response 401:**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Неверный логин или пароль"
  }
}
```

**Response 403 (device mismatch):**
```json
{
  "error": {
    "code": "DEVICE_MISMATCH",
    "message": "Несовпадение отпечатка устройства. Обратитесь к администратору."
  }
}
```

---

#### POST /auth/refresh
**Описание:** Обновление access_token  
**Access:** Public

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**
```json
{
  "data": {
    "access_token": "новый_access_token",
    "expires_in": 900
  }
}
```

**Response 401:**
```json
{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Недействительный или истёкший refresh_token"
  }
}
```

---

#### POST /auth/logout
**Описание:** Выход из системы (инвалидация refresh_token)  
**Access:** Authenticated

**Request:**
```json
{
  "refresh_token": "string"
}
```

**Response 204:** No Content

---

#### POST /auth/forgot-password
**Описание:** Запрос сброса пароля  
**Access:** Public

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response 200:**
```json
{
  "data": {
    "message": "Инструкции по сбросу пароля отправлены на email"
  }
}
```

---

#### POST /auth/reset-password
**Описание:** Сброс пароля по токену  
**Access:** Public

**Request:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePassword123!"
}
```

**Response 200:**
```json
{
  "data": {
    "message": "Пароль успешно изменён"
  }
}
```

---

### 2.2. Мобильное приложение

#### GET /mobile/settings
**Описание:** Получение настроек для клиента  
**Access:** Employee

**Response 200:**
```json
{
  "data": {
    "allowed_beacon_uuids": ["uuid1", "uuid2", "uuid3"],
    "aggregation_interval_sec": 600,
    "sync_interval_sec": 600,
    "scan_duty_cycle": {
      "scan_duration_ms": 3000,
      "pause_duration_ms": 7000
    },
    "security": {
      "require_fingerprint": true,
      "forbid_emulators": true,
      "require_play_integrity": true
    }
  }
}
```

---

#### POST /mobile/attendance
**Описание:** Отправка агрегированных данных присутствия  
**Access:** Employee  
**Rate Limit:** 10 req/min

**Request:**
```json
{
  "request_id": "uuid-для-replay-protection",
  "records": [
    {
      "beacon_uuid": "123e4567-e89b-12d3-a456-426614174000",
      "mac_address": "AA:BB:CC:DD:EE:FF",
      "major": 1,
      "minor": 100,
      "scan_timestamp_start": "2026-11-04T10:00:00Z",
      "scan_timestamp_end": "2026-11-04T10:10:00Z",
      "median_rssi": -65.5,
      "min_rssi": -72,
      "max_rssi": -58,
      "samples_count": 45,
      "device_fingerprint": "sha256_hash_here"
    }
  ]
}
```

**Response 200:**
```json
{
  "data": {
    "accepted": 1,
    "synced_at": "2026-11-04T10:15:00Z"
  }
}
```

**Response 409 (Duplicate):**
```json
{
  "error": {
    "code": "DUPLICATE_REQUEST",
    "message": "Запрос с таким request_id уже был обработан"
  }
}
```

---

#### POST /mobile/beacon-telemetry
**Описание:** Отправка телеметрии маяков (battery_level, firmware)  
**Access:** Employee

**Request:**
```json
{
  "beacons": [
    {
      "beacon_uuid": "123e4567-e89b-12d3-a456-426614174000",
      "mac_address": "AA:BB:CC:DD:EE:FF",
      "battery_level": 85,
      "firmware_version": "1.2.3",
      "temperature": 22.5,
      "last_seen_at": "2026-11-04T10:00:00Z"
    }
  ]
}
```

**Response 200:**
```json
{
  "data": {
    "accepted": 1
  }
}
```

---

#### GET /mobile/my-attendance
**Описание:** История присутствия сотрудника  
**Access:** Employee

**Query Parameters:**
```
?from=2026-11-01T00:00:00Z&to=2026-11-07T23:59:59Z
```

**Response 200:**
```json
{
  "data": [
    {
      "date": "2026-11-04",
      "zones": [
        {
          "zone_id": "uuid",
          "zone_name": "Офис 101",
          "object_name": "БЦ \"Москва\"",
          "enter_time": "2026-11-04T09:00:00Z",
          "exit_time": "2026-11-04T17:30:00Z",
          "duration_minutes": 510
        }
      ],
      "total_duration_minutes": 510,
      "beacons_count": 3
    }
  ]
}
```

---

#### POST /mobile/push-token
**Описание:** Регистрация push-токена для FCM  
**Access:** Employee

**Request:**
```json
{
  "push_token": "fcm_token_here",
  "platform": "android"
}
```

**Response 200:**
```json
{
  "data": {
    "message": "Токен зарегистрирован"
  }
}
```

---

### 2.3. Админ-панель

#### Объекты

**GET /admin/objects**  
**Описание:** Список объектов  
**Access:** Admin, Curator (filtered)

**Query Parameters:**
```
?page=1&per_page=20&search=БЦ&is_active=true
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "БЦ \"Москва\"",
      "address": "г. Москва, ул. Примерная, д. 1",
      "is_active": true,
      "zones_count": 12,
      "beacons_count": 48,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 12,
    "total_pages": 1
  }
}
```

---

**POST /admin/objects**  
**Описание:** Создание объекта  
**Access:** Admin

**Request:**
```json
{
  "name": "БЦ \"Москва\"",
  "address": "г. Москва, ул. Примерная, д. 1"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "name": "БЦ \"Москва\"",
    "address": "г. Москва, ул. Примерная, д. 1",
    "is_active": true,
    "created_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**PUT /admin/objects/{id}**  
**Описание:** Обновление объекта  
**Access:** Admin

**Request:**
```json
{
  "name": "Новое название",
  "address": "Новый адрес",
  "is_active": false
}
```

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Новое название",
    "address": "Новый адрес",
    "is_active": false,
    "updated_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**DELETE /admin/objects/{id}**  
**Описание:** Удаление объекта  
**Access:** Admin

**Response 204:** No Content

---

#### Зоны

**GET /admin/zones**  
**Описание:** Список зон (иерархический)  
**Access:** Admin, Curator (filtered)

**Query Parameters:**
```
?object_id=uuid&zone_type=floor
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Этаж 1",
      "zone_type": "floor",
      "level": 1,
      "parent_zone_id": null,
      "object_id": "uuid",
      "object_name": "БЦ \"Москва\"",
      "beacons_count": 12,
      "children": [
        {
          "id": "uuid",
          "name": "Офис 101",
          "zone_type": "room",
          "level": 2,
          "parent_zone_id": "uuid",
          "beacons_count": 3
        }
      ]
    }
  ]
}
```

---

**POST /admin/zones**  
**Описание:** Создание зоны  
**Access:** Admin

**Request:**
```json
{
  "name": "Этаж 1",
  "zone_type": "floor",
  "object_id": "uuid",
  "parent_zone_id": null,
  "rssi_threshold": -75.0
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Этаж 1",
    "zone_type": "floor",
    "level": 1,
    "path": "uuid",
    "created_at": "2026-11-04T10:00:00Z"
  }
}
```

---

#### Маяки

**GET /admin/beacons**  
**Описание:** Список маяков  
**Access:** Admin, Curator (filtered)

**Query Parameters:**
```
?zone_id=uuid&is_active=true&battery_low=true
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "major": 1,
      "minor": 100,
      "mac_address": "AA:BB:CC:DD:EE:FF",
      "zone_id": "uuid",
      "zone_name": "Офис 101",
      "battery_level": 85,
      "last_seen_at": "2026-11-04T10:00:00Z",
      "is_active": true,
      "installed_at": "2026-01-15"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 48,
    "total_pages": 3
  }
}
```

---

**POST /admin/beacons**  
**Описание:** Создание маяка  
**Access:** Admin

**Request:**
```json
{
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "major": 1,
  "minor": 100,
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "zone_id": "uuid",
  "tx_power": -59
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "major": 1,
    "minor": 100,
    "created_at": "2026-11-04T10:00:00Z"
  }
}
```

---

#### Договоры

**GET /admin/contracts**  
**Описание:** Список договоров  
**Access:** Admin, Curator (filtered)

**Query Parameters:**
```
?is_active=true&curator_id=uuid
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Договор №123",
      "number": "123/2026",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "is_active": true,
      "objects_count": 3,
      "employees_count": 15,
      "curators": [
        {
          "id": "uuid",
          "full_name": "Куратор Иванов И.И."
        }
      ]
    }
  ]
}
```

---

**POST /admin/contracts/{id}/employees**  
**Описание:** Привязка сотрудников к договору  
**Access:** Admin, Curator

**Request:**
```json
{
  "employee_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response 200:**
```json
{
  "data": {
    "added": 3,
    "total": 18
  }
}
```

---

#### Нормативы (SLA)

**GET /admin/requirements**  
**Описание:** Список нормативов  
**Access:** Admin, Curator (filtered)

**Query Parameters:**
```
?zone_id=uuid&contract_id=uuid&period_type=daily
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "zone_id": "uuid",
      "zone_name": "Офис 101",
      "contract_id": "uuid",
      "contract_name": "Договор №123",
      "min_employees": 2,
      "visits_count": 1,
      "period_type": "daily",
      "weekdays_mask": 31,
      "is_active": true
    }
  ]
}
```

---

**POST /admin/requirements**  
**Описание:** Создание норматива  
**Access:** Admin, Curator

**Request:**
```json
{
  "zone_id": "uuid",
  "contract_id": "uuid",
  "min_employees": 2,
  "visits_count": 1,
  "period_type": "daily",
  "weekdays_mask": 31
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "created_at": "2026-11-04T10:00:00Z"
  }
}
```

---

#### Аналитика

**GET /admin/analytics/attendance**  
**Описание:** Табель присутствия  
**Access:** Admin, Curator (filtered)

**Query Parameters:**
```
?from=2026-11-01&to=2026-11-07&employee_id=uuid&object_id=uuid
```

**Response 200:**
```json
{
  "data": [
    {
      "employee_id": "uuid",
      "employee_name": "Петров Иван Иванович",
      "dates": {
        "2026-11-04": {
          "present": true,
          "enter_time": "09:00",
          "exit_time": "17:30",
          "duration_minutes": 510,
          "zones": ["Офис 101", "Переговорная"]
        },
        "2026-11-05": {
          "present": true,
          "enter_time": "08:45",
          "exit_time": "18:00",
          "duration_minutes": 555,
          "zones": ["Офис 101"]
        }
      }
    }
  ]
}
```

---

**GET /admin/analytics/sla**  
**Описание:** Выполнение нормативов  
**Access:** Admin, Curator (filtered)

**Query Parameters:**
```
?from=2026-11-01&to=2026-11-07&contract_id=uuid
```

**Response 200:**
```json
{
  "data": [
    {
      "requirement_id": "uuid",
      "zone_name": "Офис 101",
      "period_date": "2026-11-04",
      "required_count": 2,
      "actual_count": 2,
      "status": "fulfilled",
      "employees": ["Петров И.И.", "Сидоров С.С."]
    },
    {
      "requirement_id": "uuid",
      "zone_name": "Офис 102",
      "period_date": "2026-11-04",
      "required_count": 1,
      "actual_count": 0,
      "status": "violated",
      "deficit": 1,
      "expected_employees": ["Кузнецов К.К."],
      "actual_employees": []
    }
  ]
}
```

---

**GET /admin/analytics/fraud**  
**Описание:** Журнал инцидентов фрода  
**Access:** Admin

**Query Parameters:**
```
?severity=critical&user_id=uuid&from=2026-11-01&to=2026-11-07
```

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid",
      "user_name": "Петров Иван Иванович",
      "fraud_type": "teleportation",
      "severity": "critical",
      "details": {
        "from_zone": "Офис 101 (БЦ Москва)",
        "to_zone": "Склад №3",
        "time_diff_minutes": 3
      },
      "is_reviewed": false,
      "created_at": "2026-11-04T10:15:00Z"
    }
  ]
}
```

---

**POST /admin/fraud/{id}/review**  
**Описание:** Отметить инцидент фрода как просмотренный  
**Access:** Admin

**Request:**
```json
{
  "is_reviewed": true,
  "notes": "Сотрудник подтвердил перемещение"
}
```

**Response 200:**
```json
{
  "data": {
    "id": 1,
    "is_reviewed": true,
    "reviewed_by": "uuid",
    "reviewed_at": "2026-11-04T11:00:00Z"
  }
}
```

---

#### Уведомления

**GET /admin/notifications**  
**Описание:** Список уведомлений  
**Access:** Admin, Curator

**Query Parameters:**
```
?is_read=false&limit=10
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "fraud_alert",
      "title": "Инцидент фрода",
      "body": "Обнаружено перемещение < 5 минут",
      "is_read": false,
      "created_at": "2026-11-04T10:15:00Z"
    }
  ]
}
```

---

**POST /admin/notifications/{id}/read**  
**Описание:** Пометить уведомление как прочитанное  
**Access:** Admin, Curator

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "is_read": true
  }
}
```

---

#### Импорт/Экспорт

**POST /admin/import/excel**  
**Описание:** Импорт данных из Excel  
**Access:** Admin, Curator  
**Rate Limit:** 3 req/min  
**Content-Type:** multipart/form-data

**Request:**
```
file: <excel_file>
type: objects | zones | beacons | employees | requirements
mode: add | update | replace
```

**Response 200:**
```json
{
  "data": {
    "imported": 150,
    "updated": 10,
    "errors": []
  }
}
```

**Response 400 (Validation Errors):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ошибки валидации",
    "details": [
      {
        "row": 5,
        "field": "uuid",
        "message": "Дублируется UUID маяка"
      }
    ]
  }
}
```

---

**GET /admin/export/excel**  
**Описание:** Экспорт данных в Excel  
**Access:** Admin, Curator

**Query Parameters:**
```
?type=objects&format=xlsx
```

**Response 200:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="objects_export.xlsx"
```

---

### 2.4. Дополнительные эндпоинты админ-панели

#### Зоны (полный CRUD)

**PUT /admin/zones/{id}**
**Описание:** Обновление зоны
**Access:** Admin

**Request:**
```json
{
  "name": "Новое название",
  "zone_type": "room",
  "parent_zone_id": "uuid",
  "rssi_threshold": -70.0
}
```

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Новое название",
    "zone_type": "room",
    "level": 2,
    "path": "parent_uuid.uuid",
    "updated_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**DELETE /admin/zones/{id}**
**Описание:** Удаление зоны
**Access:** Admin

**Response 204:** No Content

**Response 409 (есть дочерние зоны):**
```json
{
  "error": {
    "code": "ZONE_HAS_CHILDREN",
    "message": "Невозможно удалить зону с дочерними элементами"
  }
}
```

---

#### Маяки (полный CRUD)

**PUT /admin/beacons/{id}**
**Описание:** Обновление маяка
**Access:** Admin

**Request:**
```json
{
  "zone_id": "uuid",
  "tx_power": -55,
  "is_active": false
}
```

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "zone_id": "uuid",
    "tx_power": -55,
    "is_active": false,
    "updated_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**DELETE /admin/beacons/{id}**
**Описание:** Удаление маяка
**Access:** Admin

**Response 204:** No Content

---

**POST /admin/beacons/{id}/deactivate**
**Описание:** Деактивация маяка
**Access:** Admin

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "is_active": false,
    "deactivated_at": "2026-11-04T10:00:00Z"
  }
}
```

---

#### Договоры (полный CRUD)

**POST /admin/contracts**
**Описание:** Создание договора
**Access:** Admin

**Request:**
```json
{
  "name": "Договор №456",
  "number": "456/2026",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Договор №456",
    "number": "456/2026",
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
    "is_active": true,
    "created_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**PUT /admin/contracts/{id}**
**Описание:** Обновление договора
**Access:** Admin

**Request:**
```json
{
  "name": "Новое название",
  "end_date": "2027-12-31",
  "is_active": false
}
```

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Новое название",
    "end_date": "2027-12-31",
    "is_active": false,
    "updated_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**DELETE /admin/contracts/{id}**
**Описание:** Удаление договора
**Access:** Admin

**Response 204:** No Content

**Response 409 (есть привязки):**
```json
{
  "error": {
    "code": "CONTRACT_HAS_DEPENDENCIES",
    "message": "Невозможно удалить договор с привязанными объектами или сотрудниками"
  }
}
```

---

**POST /admin/contracts/{id}/objects**
**Описание:** Привязка объектов к договору
**Access:** Admin, Curator

**Request:**
```json
{
  "object_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response 200:**
```json
{
  "data": {
    "added": 3,
    "total": 6
  }
}
```

---

**POST /admin/contracts/{id}/curators**
**Описание:** Привязка кураторов к договору
**Access:** Admin

**Request:**
```json
{
  "curator_ids": ["uuid1", "uuid2"]
}
```

**Response 200:**
```json
{
  "data": {
    "added": 2,
    "total": 3
  }
}
```

---

#### Пользователи (полный CRUD)

**GET /admin/users**
**Описание:** Список пользователей
**Access:** Admin

**Query Parameters:**
```
?page=1&per_page=20&search=Иван&role=employee&is_active=true
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "login": "ivanov",
      "email": "ivanov@example.com",
      "full_name": "Иванов Иван Иванович",
      "role": "employee",
      "is_active": true,
      "last_login_at": "2026-11-04T09:00:00Z",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 86,
    "total_pages": 5
  }
}
```

---

**POST /admin/users**
**Описание:** Создание пользователя
**Access:** Admin

**Request:**
```json
{
  "login": "petrov",
  "email": "petrov@example.com",
  "full_name": "Петров Петр Петрович",
  "role": "employee",
  "password": "TempPassword123!"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "login": "petrov",
    "email": "petrov@example.com",
    "full_name": "Петров Петр Петрович",
    "role": "employee",
    "is_active": true,
    "created_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**PUT /admin/users/{id}**
**Описание:** Обновление пользователя
**Access:** Admin

**Request:**
```json
{
  "full_name": "Новое ФИО",
  "role": "curator",
  "is_active": false
}
```

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "full_name": "Новое ФИО",
    "role": "curator",
    "is_active": false,
    "updated_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**DELETE /admin/users/{id}**
**Описание:** Удаление/блокировка пользователя
**Access:** Admin

**Response 204:** No Content

---

**POST /admin/users/{id}/devices**
**Описание:** Управление доверенными устройствами
**Access:** Admin

**Request:**
```json
{
  "action": "trust",
  "device_fingerprint": "sha256_hash"
}
```

**Response 200:**
```json
{
  "data": {
    "user_id": "uuid",
    "device_fingerprint": "sha256_hash",
    "is_trusted": true,
    "trusted_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**GET /admin/users/{id}**
**Описание:** Получение одного пользователя по ID (персональная карточка)
**Access:** Admin

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "login": "ivanov",
    "email": "ivanov@example.com",
    "phone": "+7 (999) 123-45-67",
    "full_name": "Иванов Иван Иванович",
    "role": "employee",
    "is_active": true,
    "last_login_at": "2026-11-04T09:00:00Z",
    "created_at": "2026-01-15T10:00:00Z",
    "devices": [
      {
        "fingerprint_hash": "sha256_hash",
        "device_info": {
          "manufacturer": "Samsung",
          "model": "Galaxy A70",
          "os_version": "Android 11"
        },
        "is_trusted": true,
        "first_seen_at": "2026-01-15T10:00:00Z",
        "last_seen_at": "2026-11-04T09:00:00Z"
      }
    ]
  }
}
```

---

**GET /admin/users/{id}/devices**
**Описание:** Получение списка устройств пользователя
**Access:** Admin

**Response 200:**
```json
{
  "data": [
    {
      "fingerprint_hash": "sha256_hash",
      "device_info": {
        "manufacturer": "Samsung",
        "model": "Galaxy A70",
        "os_version": "Android 11"
      },
      "is_trusted": true,
      "first_seen_at": "2026-01-15T10:00:00Z",
      "last_seen_at": "2026-11-04T09:00:00Z"
    }
  ]
}
```

---

**POST /admin/users/{id}/reset-password**
**Описание:** Сброс пароля пользователя администратором
**Access:** Admin

**Request:**
```json
{
  "new_password": "TempPassword123!"
}
```

**Response 200:**
```json
{
  "data": {
    "message": "Пароль успешно сброшен",
    "temporary_password": "TempPassword123!"
  }
}
```

---

#### Нормативы (полный CRUD)

**PUT /admin/requirements/{id}**
**Описание:** Обновление норматива
**Access:** Admin, Curator

**Request:**
```json
{
  "min_employees": 3,
  "visits_count": 2,
  "period_type": "weekly",
  "weekdays_mask": 31
}
```

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "min_employees": 3,
    "visits_count": 2,
    "period_type": "weekly",
    "weekdays_mask": 31,
    "updated_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**DELETE /admin/requirements/{id}**
**Описание:** Удаление норматива
**Access:** Admin, Curator

**Response 204:** No Content

---

#### Dashboard и аналитика

**GET /admin/dashboard**
**Описание:** Данные для дашборда
**Access:** Admin, Curator (filtered)

**Response 200:**
```json
{
  "data": {
    "objects_count": 12,
    "beacons_count": 248,
    "employees_count": 86,
    "sla_violations": 7,
    "weekly_attendance": [
      {"date": "2026-10-29", "count": 82},
      {"date": "2026-10-30", "count": 85},
      {"date": "2026-10-31", "count": 80}
    ],
    "top_sla_violations": [
      {"zone_name": "Офис 102", "violations_count": 3},
      {"zone_name": "Склад №1", "violations_count": 2}
    ],
    "low_battery_beacons": [
      {"beacon_name": "Маяк #015", "battery_level": 12},
      {"beacon_name": "Маяк #023", "battery_level": 8}
    ]
  }
}
```

---

#### Аудит и настройки

**GET /admin/audit-logs**
**Описание:** Журнал аудита
**Access:** Admin

**Query Parameters:**
```
?page=1&per_page=50&user_id=uuid&action=UPDATE&entity_type=beacons&from=2026-11-01&to=2026-11-07
```

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid",
      "user_name": "Администратор",
      "action": "UPDATE",
      "entity_type": "beacons",
      "entity_id": "uuid",
      "old_values": {"battery_level": 85},
      "new_values": {"battery_level": 15},
      "ip_address": "192.168.1.1",
      "created_at": "2026-11-04T10:15:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 156,
    "total_pages": 4
  }
}
```

---

**GET /admin/settings**
**Описание:** Получение системных настроек
**Access:** Admin

**Response 200:**
```json
{
  "data": {
    "aggregation_interval_sec": 600,
    "sync_interval_sec": 600,
    "scan_duty_cycle": {
      "scan_duration_ms": 3000,
      "pause_duration_ms": 7000
    },
    "fraud_thresholds": {
      "teleportation_minutes": 5,
      "min_samples_count": 3
    },
    "smtp": {
      "host": "smtp.example.com",
      "port": 587,
      "from_email": "noreply@checkin-service.com",
      "from_name": "Контроль присутствия"
    }
  }
}
```

---

**PUT /admin/settings**
**Описание:** Обновление системных настроек
**Access:** Admin

**Request:**
```json
{
  "aggregation_interval_sec": 900,
  "fraud_thresholds": {
    "teleportation_minutes": 3
  }
}
```

**Response 200:**
```json
{
  "data": {
    "updated_at": "2026-11-04T10:00:00Z"
  }
}
```

---

**GET /admin/templates/{type}**
**Описание:** Скачивание шаблона Excel
**Access:** Admin, Curator

**Path Parameters:**
- `type`: `objects`, `zones`, `beacons`, `employees`, `requirements`

**Response 200:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="template_objects.xlsx"
```

**Response 404:**
```json
{
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Шаблон для типа 'invalid' не найден"
  }
}
```

---

### 2.5. Health Check

**GET /health**  
**Описание:** Проверка состояния системы  
**Access:** Public

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-04T10:00:00Z",
  "checks": {
    "database": "connected",
    "redis": "connected",
    "queue": "active"
  }
}
```

**Response 503:**
```json
{
  "status": "unhealthy",
  "timestamp": "2026-11-04T10:00:00Z",
  "checks": {
    "database": "connected",
    "redis": "disconnected",
    "queue": "inactive"
  }
}
```

---

## 3. WebSocket

**Endpoint:** `ws://server/api/v1/ws`

**Аутентификация:** через query parameter
```
ws://server/api/v1/ws?token=<access_token>
```

**События от сервера:**

### fraud_alert
```json
{
  "event": "fraud_alert",
  "data": {
    "id": 1,
    "user_name": "Петров И.И.",
    "fraud_type": "teleportation",
    "severity": "critical",
    "created_at": "2026-11-04T10:15:00Z"
  }
}
```

### sla_violation
```json
{
  "event": "sla_violation",
  "data": {
    "zone_name": "Офис 102",
    "period_date": "2026-11-04",
    "required_count": 1,
    "actual_count": 0
  }
}
```

### beacon_status
```json
{
  "event": "beacon_status",
  "data": {
    "beacon_uuid": "uuid",
    "beacon_name": "Маяк #001",
    "status": "battery_low",
    "battery_level": 15
  }
}
```

### employee_presence
```json
{
  "event": "employee_presence",
  "data": {
    "employee_name": "Петров И.И.",
    "action": "entered",
    "zone_name": "Офис 101",
    "timestamp": "2026-11-04T09:00:00Z"
  }
}
```

### notification
```json
{
  "event": "notification",
  "data": {
    "id": "uuid",
    "type": "fraud_alert",
    "title": "Инцидент фрода",
    "body": "Обнаружено перемещение < 5 минут"
  }
}
```

**События от клиента:**

### ping
```json
{
  "event": "ping",
  "timestamp": "2026-11-04T10:00:00Z"
}
```

**Ответ сервера:**
```json
{
  "event": "pong",
  "timestamp": "2026-11-04T10:00:01Z"
}
```

### subscribe
```json
{
  "event": "subscribe",
  "data": {
    "channels": ["fraud_alerts", "sla_violations"]
  }
}
```

### unsubscribe
```json
{
  "event": "unsubscribe",
  "data": {
    "channels": ["fraud_alerts"]
  }
}
```

---

## 4. Коды ошибок

### 4.1. Основные коды ошибок

| Код | HTTP | Описание |
|-----|------|----------|
| `VALIDATION_ERROR` | 400 | Ошибка валидации данных |
| `INVALID_CREDENTIALS` | 401 | Неверный логин или пароль |
| `INVALID_REFRESH_TOKEN` | 401 | Недействительный refresh_token |
| `TOKEN_EXPIRED` | 401 | Токен истёк |
| `DEVICE_MISMATCH` | 403 | Несовпадение отпечатка устройства |
| `ACCOUNT_DISABLED` | 403 | Аккаунт заблокирован |
| `DUPLICATE_REQUEST` | 409 | Дублирующийся запрос (replay) |
| `NOT_FOUND` | 404 | Ресурс не найден |
| `FORBIDDEN` | 403 | Доступ запрещён |
| `RATE_LIMIT_EXCEEDED` | 429 | Превышен лимит запросов |
| `INTERNAL_ERROR` | 500 | Внутренняя ошибка сервера |

### 4.2. Коды ошибок валидации

| Код | HTTP | Описание | Применимо к |
|-----|------|----------|-------------|
| `INVALID_UUID_FORMAT` | 400 | Неверный формат UUID | Все эндпоинты с UUID |
| `INVALID_DATE_FORMAT` | 400 | Неверный формат даты | Аналитика, фильтры |
| `INVALID_PAGINATION` | 400 | Неверные параметры пагинации | Все списки |
| `WEAK_PASSWORD` | 400 | Слишком слабый пароль | Password reset |
| `INVALID_EMAIL_FORMAT` | 400 | Неверный формат email | Users |
| `INVALID_PHONE_FORMAT` | 400 | Неверный формат телефона | Users |

### 4.3. Коды ошибок импорта/экспорта

| Код | HTTP | Описание |
|-----|------|----------|
| `FILE_TOO_LARGE` | 413 | Файл больше лимита (10 МБ) |
| `INVALID_FILE_FORMAT` | 400 | Неверный формат файла |
| `IMPORT_PARTIAL_FAILURE` | 207 | Частичная ошибка импорта |
| `TEMPLATE_NOT_FOUND` | 404 | Шаблон не найден |

### 4.4. Коды ошибок бизнес-логики

| Код | HTTP | Описание |
|-----|------|----------|
| `ZONE_HAS_CHILDREN` | 409 | Нельзя удалить зону с дочерними элементами |
| `BEACON_UUID_NOT_UNIQUE` | 409 | Дубликат UUID маяка |
| `CONTRACT_HAS_DEPENDENCIES` | 409 | Нельзя удалить договор с привязками |
| `USER_ALREADY_IN_CONTRACT` | 409 | Пользователь уже привязан к договору |
| `OBJECT_ALREADY_IN_CONTRACT` | 409 | Объект уже привязан к договору |
| `ZONE_NOT_FOUND` | 404 | Зона не найдена |
| `BEACON_NOT_FOUND` | 404 | Маяк не найден |
| `CONTRACT_NOT_FOUND` | 404 | Договор не найден |
| `USER_NOT_FOUND` | 404 | Пользователь не найден |
| `REQUIREMENT_NOT_FOUND` | 404 | Норматив не найден |

### 4.5. Коды ошибок безопасности

| Код | HTTP | Описание |
|-----|------|----------|
| `MOCK_BLE_DETECTED` | 403 | Обнаружен mock BLE/Location |
| `EMULATOR_DETECTED` | 403 | Запуск на эмуляторе |
| `ROOT_DETECTED` | 403 | Устройство с root-правами |
| `BEACON_CLONE_DETECTED` | 409 | Обнаружен клон маяка |
| `CLOCK_SKEW_DETECTED` | 400 | Расхождение времени > 5 минут |

---

## 5. Примеры использования

### 5.1. Вход и получение данных

```bash
# 1. Вход
curl -X POST https://server/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "admin",
    "password": "password123",
    "device_fingerprint": "sha256_hash",
    "push_token": "fcm_token"
  }'

# Response: { "data": { "access_token": "..." } }

# 2. Получение списка объектов
curl -X GET https://server/api/v1/admin/objects \
  -H "Authorization: Bearer <access_token>"

# 3. Создание маяка
curl -X POST https://server/api/v1/admin/beacons \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "major": 1,
    "minor": 100,
    "zone_id": "uuid"
  }'
```

### 5.2. Мобильное приложение

```bash
# 1. Получение настроек
curl -X GET https://server/api/v1/mobile/settings \
  -H "Authorization: Bearer <access_token>"

# 2. Отправка данных присутствия
curl -X POST https://server/api/v1/mobile/attendance \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "uuid",
    "records": [...]
  }'

# 3. Получение истории
curl -X GET "https://server/api/v1/mobile/my-attendance?from=2026-11-01&to=2026-11-07" \
  -H "Authorization: Bearer <access_token>"
```

---

**Конец спецификации**
