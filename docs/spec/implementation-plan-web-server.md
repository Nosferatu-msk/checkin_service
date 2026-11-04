# План реализации Web-сервера

**Версия:** 1.0  
**Дата:** 04.11.2026  
**Статус:** Готов к реализации

---

## 1. Архитектура и стек технологий

### 1.1. Стек технологий

| Компонент | Технология | Обоснование |
|-----------|------------|-------------|
| **Backend Framework** | NestJS (TypeScript) | Из ТЗ, enterprise-grade, модульная архитектура |
| **Database** | PostgreSQL 15+ | Из ТЗ, поддержка JSONB, партицирования, RLS |
| **ORM** | TypeORM | Интеграция с NestJS, миграции |
| **Cache/Queue** | Redis + Bull | Из ТЗ, очереди для фоновых задач |
| **Authentication** | JWT (RS256) | Из security-specification |
| **API Documentation** | OpenAPI/Swagger | Автоматическая генерация из DTO |
| **WebSocket** | Socket.IO | Real-time уведомления |
| **File Processing** | ExcelJS | Импорт/экспорт Excel |
| **Validation** | class-validator | Валидация DTO в NestJS |

### 1.2. Структура проекта

```
server/
├── src/
│   ├── main.ts                          # Точка входа
│   ├── app.module.ts                    # Корневой модуль
│   ├── config/                          # Конфигурация
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── jwt.config.ts
│   ├── common/                          # Общие модули
│   │   ├── decorators/                  # Кастомные декораторы
│   │   ├── guards/                      # Guards (Auth, Roles)
│   │   ├── interceptors/                # Interceptors (Logging, Transform)
│   │   ├── filters/                     # Exception filters
│   │   ├── pipes/                       # Validation pipes
│   │   └── middleware/                  # Middleware (CORS, Rate Limit)
│   ├── modules/
│   │   ├── auth/                        # Аутентификация
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/              # JWT, Local strategies
│   │   │   └── dto/                     # LoginDto, RefreshTokenDto
│   │   ├── users/                       # Пользователи
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── entities/                # User entity
│   │   │   └── dto/
│   │   ├── objects/                     # Объекты
│   │   ├── zones/                       # Зоны
│   │   ├── beacons/                     # Маяки
│   │   ├── contracts/                   # Договоры
│   │   ├── attendance/                  # Присутствие
│   │   │   ├── attendance.module.ts
│   │   │   ├── attendance.controller.ts
│   │   │   ├── attendance.service.ts
│   │   │   └── workers/                 # Bull workers
│   │   ├── sla/                         # SLA проверки
│   │   ├── fraud/                       # Фрод-детекция
│   │   ├── notifications/               # Уведомления
│   │   ├── import-export/               # Импорт/экспорт Excel
│   │   └── websocket/                   # WebSocket gateway
│   └── database/
│       ├── migrations/                  # TypeORM миграции
│       └── seeds/                       # Начальные данные
├── test/                                # E2E тесты
├── docker-compose.yml                   # PostgreSQL, Redis
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 2. Декомпозиция задач

### 2.1. Этап 1: Infrastructure (5 дней)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 1.1 | Инициализация проекта | NestJS CLI, TypeScript, ESLint, Prettier | 4ч | — |
| 1.2 | Docker Compose | PostgreSQL 15, Redis 7 | 4ч | — |
| 1.3 | Конфигурация БД | TypeORM, миграции, connection pool | 8ч | 1.1, 1.2 |
| 1.4 | Конфигурация Redis | Bull queue, cache manager | 4ч | 1.1, 1.2 |
| 1.5 | Базовая структура модулей | Auth, Users, Health | 8ч | 1.3 |
| 1.6 | Logging & Monitoring | Winston, Prometheus metrics | 8ч | 1.5 |
| 1.7 | CI/CD pipeline | GitHub Actions: lint, test, build | 8ч | 1.6 |

**Итого:** 5 дней (40 часов)

---

### 2.2. Этап 2: Database Schema (3 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 2.1 | Миграция: objects | Таблица objects + индексы | 2ч | 1.3 |
| 2.2 | Миграция: zones | Таблица zones + ltree + триггеры | 8ч | 2.1 |
| 2.3 | Миграция: beacons | Таблица beacons + индексы | 4ч | 2.2 |
| 2.4 | Миграция: users | Таблица users + индексы | 4ч | 1.3 |
| 2.5 | Миграция: contracts | Таблицы contracts, contract_objects, contract_employees, contract_curators | 8ч | 2.1, 2.4 |
| 2.6 | Миграция: zone_requirements | Таблица нормативов + CHECK constraints | 4ч | 2.2, 2.5 |
| 2.7 | Миграция: attendance_raw | Партицированная таблица + индексы | 8ч | 2.3, 2.4 |
| 2.8 | Миграция: attendance_calculated | Партицированная таблица + индексы | 8ч | 2.7 |
| 2.9 | Миграция: fraud_logs | Таблица фрода + индексы | 4ч | 2.4 |
| 2.10 | Миграция: notifications | Таблица уведомлений | 2ч | 2.4 |
| 2.11 | Миграция: audit_logs | Таблица аудита + индексы | 4ч | 1.5 |
| 2.12 | Миграция: beacon_telemetry | Таблица телеметрии маяков | 2ч | 2.3 |
| 2.13 | Миграция: system_settings | Таблица настроек | 2ч | 1.5 |
| 2.14 | Миграция: import_jobs | Таблица задач импорта | 2ч | 2.4 |
| 2.15 | Seed data | Начальные данные: admin user, system settings | 4ч | 2.1-2.14 |

**Итого:** 3 дня (24 часа + 4ч seed = 28 часов)

---

### 2.3. Этап 3: Authentication & Authorization (4 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 3.1 | JWT генерация | RS256 ключи, access/refresh tokens | 8ч | 1.5, 2.4 |
| 3.2 | Login endpoint | POST /auth/login, password validation | 8ч | 3.1 |
| 3.3 | Refresh token | POST /auth/refresh, token rotation | 8ч | 3.2 |
| 3.4 | Logout | POST /auth/logout, blacklist в Redis | 4ч | 3.3 |
| 3.5 | Password reset | POST /auth/forgot-password, /auth/reset-password | 8ч | 3.2 |
| 3.6 | Device fingerprint | Проверка fingerprint, device_mismatch detection | 8ч | 3.2 |
| 3.7 | Roles Guard | Role-based access control decorator | 8ч | 3.1 |
| 3.8 | Contract Access Guard | Проверка доступа к договорам для кураторов | 8ч | 3.7, 2.5 |
| 3.9 | Rate Limiting | Throttler module, different limits per endpoint | 8ч | 1.5 |
| 3.10 | CORS configuration | CORS policy из api-specification | 2ч | 1.5 |

**Итого:** 4 дня (32 часа)

---

### 2.4. Этап 4: Core CRUD Modules (8 дней)

#### 4.1. Users Module (2 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 4.1.1 | Users Service | CRUD операции, поиск, фильтрация | 8ч | 2.4, 3.7 |
| 4.1.2 | Users Controller | GET/POST/PUT/DELETE /admin/users | 8ч | 4.1.1 |
| 4.1.3 | User DTOs | CreateUserDto, UpdateUserDto, UserResponseDto | 4ч | 4.1.2 |
| 4.1.4 | User Devices | POST /admin/users/{id}/devices | 8ч | 4.1.2 |
| 4.1.5 | Password Reset by Admin | POST /admin/users/{id}/reset-password | 4ч | 4.1.2 |

**Итого:** 2 дня (16 часов)

#### 4.2. Objects Module (1 день)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 4.2.1 | Objects Service | CRUD операции | 8ч | 2.1, 3.7 |
| 4.2.2 | Objects Controller | GET/POST/PUT/DELETE /admin/objects | 8ч | 4.2.1 |
| 4.2.3 | Objects DTOs | CreateObjectDto, UpdateObjectDto | 4ч | 4.2.2 |

**Итого:** 1 день (8 часов)

#### 4.3. Zones Module (2 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 4.3.1 | Zones Service | CRUD + иерархия, path calculation | 12ч | 2.2, 3.7 |
| 4.3.2 | Zones Controller | GET/POST/PUT/DELETE /admin/zones | 8ч | 4.3.1 |
| 4.3.3 | Zones DTOs | CreateZoneDto, UpdateZoneDto, ZoneTreeResponseDto | 8ч | 4.3.2 |
| 4.3.4 | Recursive queries | LTREE queries, children loading | 8ч | 4.3.1 |

**Итого:** 2 дня (16 часов)

#### 4.4. Beacons Module (1 день)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 4.4.1 | Beacons Service | CRUD + deactivate | 8ч | 2.3, 3.7 |
| 4.4.2 | Beacons Controller | GET/POST/PUT/DELETE /admin/beacons | 8ч | 4.4.1 |
| 4.4.3 | Beacons DTOs | CreateBeaconDto, UpdateBeaconDto | 4ч | 4.4.2 |

**Итого:** 1 день (8 часов)

#### 4.5. Contracts Module (2 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 4.5.1 | Contracts Service | CRUD + привязки объектов/сотрудников/кураторов | 12ч | 2.5, 3.7 |
| 4.5.2 | Contracts Controller | GET/POST/PUT/DELETE /admin/contracts | 8ч | 4.5.1 |
| 4.5.3 | Contract Objects | POST /admin/contracts/{id}/objects | 4ч | 4.5.2 |
| 4.5.4 | Contract Employees | POST /admin/contracts/{id}/employees | 4ч | 4.5.2 |
| 4.5.5 | Contract Curators | POST /admin/contracts/{id}/curators | 4ч | 4.5.2 |

**Итого:** 2 дня (16 часов)

---

### 2.5. Этап 5: Attendance Processing (5 дней)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 5.1 | Mobile Settings | GET /mobile/settings | 4ч | 2.13, 3.1 |
| 5.2 | Attendance Raw Submit | POST /mobile/attendance, replay protection | 12ч | 2.7, 3.1 |
| 5.3 | Beacon Telemetry | POST /mobile/beacon-telemetry | 8ч | 2.12, 5.2 |
| 5.4 | Attendance Worker | Bull worker: обработка raw → calculated | 16ч | 5.2, business-logic-spec |
| 5.5 | RSSI Filtering | Алгоритм фильтрации выбросов, медиана | 8ч | 5.4 |
| 5.6 | Session Grouping | Логика сессий с 5-минутным окном | 8ч | 5.4 |
| 5.7 | Zone Hierarchy | Рекурсивный подсчёт по иерархии зон | 8ч | 5.4, 4.3.4 |
| 5.8 | My Attendance | GET /mobile/my-attendance | 8ч | 5.2 |
| 5.9 | Push Token | POST /mobile/push-token | 4ч | 2.4 |

**Итого:** 5 дней (40 часов)

---

### 2.6. Этап 6: SLA & Fraud Detection (4 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 6.1 | SLA Worker | Bull worker: проверка нормативов | 12ч | 5.4, 2.6, business-logic-spec |
| 6.2 | SLA Violations | Создание записей о нарушениях | 8ч | 6.1 |
| 6.3 | Fraud Detection Worker | Bull worker: детекция фрода | 16ч | 5.4, business-logic-spec |
| 6.4 | Teleportation Detection | Алгоритм детекции телепортации | 8ч | 6.3 |
| 6.5 | Simultaneous Presence | Алгоритм детекции одновременного присутствия | 8ч | 6.3 |
| 6.6 | Beacon Clone Detection | Проверка MAC-адресов | 4ч | 6.3 |
| 6.7 | Fraud Review | POST /admin/fraud/{id}/review | 4ч | 6.3 |
| 6.8 | Fraud Analytics | GET /admin/analytics/fraud | 8ч | 6.3 |

**Итого:** 4 дня (32 часа)

---

### 2.7. Этап 7: Notifications & WebSocket (3 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 7.1 | Notifications Service | Создание, отправка, маркировка прочитанного | 8ч | 2.10 |
| 7.2 | Email Notifications | SMTP integration, шаблоны | 8ч | 7.1 |
| 7.3 | Push Notifications | FCM integration | 8ч | 7.1, 5.9 |
| 7.4 | WebSocket Gateway | Socket.IO server, аутентификация | 12ч | 3.1 |
| 7.5 | WebSocket Events | fraud_alert, sla_violation, beacon_status | 8ч | 7.4 |
| 7.6 | WebSocket Client Events | ping/pong, subscribe/unsubscribe | 4ч | 7.4 |

**Итого:** 3 дня (24 часа)

---

### 2.8. Этап 8: Import/Export & Analytics (3 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 8.1 | Excel Import | POST /admin/import/excel, валидация | 12ч | 2.14 |
| 8.2 | Import Templates | GET /admin/templates/{type} | 4ч | 8.1 |
| 8.3 | Excel Export | GET /admin/export/excel | 8ч | 4.1-4.5 |
| 8.4 | Dashboard | GET /admin/dashboard | 8ч | 4.1-4.5, 6.2 |
| 8.5 | Attendance Analytics | GET /admin/analytics/attendance | 8ч | 5.4 |
| 8.6 | SLA Analytics | GET /admin/analytics/sla | 8ч | 6.2 |
| 8.7 | Audit Logs | GET /admin/audit-logs | 4ч | 2.11 |

**Итого:** 3 дня (24 часа)

---

### 2.9. Этап 9: Testing & Documentation (3 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 9.1 | Unit Tests | Coverage 80%+ для services | 16ч | 4.1-8.7 |
| 9.2 | Integration Tests | API endpoints testing | 16ч | 9.1 |
| 9.3 | E2E Tests | Critical flows (login, attendance, fraud) | 16ч | 9.2 |
| 9.4 | Swagger Documentation | Автоматическая генерация из DTO | 4ч | 9.1 |
| 9.5 | API Examples | Примеры запросов/ответов в Swagger | 8ч | 9.4 |

**Итого:** 3 дня (24 часа)

---

### 2.10. Этап 10: Deployment & Monitoring (2 дня)

| ID | Задача | Описание | Сложность | Зависимости |
|----|--------|----------|-----------|-------------|
| 10.1 | Dockerfile | Multi-stage build, optimization | 4ч | 9.3 |
| 10.2 | Docker Compose Production | PostgreSQL, Redis, app, nginx | 8ч | 10.1 |
| 10.3 | Nginx Configuration | Reverse proxy, SSL, CORS | 4ч | 10.2 |
| 10.4 | Health Checks | GET /health, database, redis checks | 4ч | 10.2 |
| 10.5 | Monitoring Setup | Prometheus, Grafana dashboards | 8ч | 10.4 |
| 10.6 | Backup Strategy | pg_dump, retention policy | 4ч | 10.2 |

**Итого:** 2 дня (16 часов)

---

## 3. Сводная таблица

| Этап | Задач | Часов | Дней | Зависимости |
|------|-------|-------|------|-------------|
| 1. Infrastructure | 7 | 40 | 5 | — |
| 2. Database Schema | 15 | 28 | 3 | Этап 1 |
| 3. Authentication | 10 | 32 | 4 | Этап 2 |
| 4. Core CRUD | 18 | 56 | 8 | Этап 3 |
| 5. Attendance | 9 | 40 | 5 | Этап 4 |
| 6. SLA & Fraud | 8 | 32 | 4 | Этап 5 |
| 7. Notifications | 6 | 24 | 3 | Этап 5 |
| 8. Import/Export | 7 | 24 | 3 | Этап 4 |
| 9. Testing | 5 | 24 | 3 | Этап 4-8 |
| 10. Deployment | 6 | 16 | 2 | Этап 9 |
| **ИТОГО** | **91** | **316** | **40** | — |

---

## 4. План-график (Gantt Chart)

```
Неделя 1:  [████████████████████] Этап 1: Infrastructure (5 дней)
Неделя 2:  [████████████████████] Этап 2: Database Schema (3 дня)
           [████████████████████] Этап 3: Authentication (4 дня)
Неделя 3:  [████████████████████] Этап 3: Authentication (продолжение)
           [████████████████████] Этап 4: Core CRUD (начало)
Неделя 4:  [████████████████████] Этап 4: Core CRUD (продолжение)
Неделя 5:  [████████████████████] Этап 5: Attendance Processing (5 дней)
Неделя 6:  [████████████████████] Этап 6: SLA & Fraud (4 дня)
           [████████████████████] Этап 7: Notifications (3 дня)
Неделя 7:  [████████████████████] Этап 8: Import/Export (3 дня)
           [████████████████████] Этап 9: Testing (начало)
Неделя 8:  [████████████████████] Этап 9: Testing (продолжение)
           [████████████████████] Этап 10: Deployment (2 дня)
```

**Общая длительность:** 8 недель (40 рабочих дней)

---

## 5. MVP Scope (Minimum Viable Product)

### MVP-1 (2 недели): Базовая функциональность
- ✅ Этап 1: Infrastructure
- ✅ Этап 2: Database Schema
- ✅ Этап 3: Authentication
- ✅ Этап 4.1-4.3: Users, Objects, Zones

**Результат:** Можно создавать пользователей, объекты, зоны. Есть аутентификация.

### MVP-2 (2 недели): Core функциональность
- ✅ Этап 4.4-4.5: Beacons, Contracts
- ✅ Этап 5.1-5.3: Mobile endpoints (settings, attendance submit)

**Результат:** Мобильное приложение может отправлять данные присутствия.

### MVP-3 (2 недели): Обработка данных
- ✅ Этап 5.4-5.9: Attendance processing
- ✅ Этап 6.1-6.2: SLA checks

**Результат:** Данные обрабатываются, SLA проверяется.

### MVP-4 (2 недели): Full functional
- ✅ Этап 6.3-6.8: Fraud detection
- ✅ Этап 7: Notifications & WebSocket
- ✅ Этап 8: Import/Export & Analytics

**Результат:** Полная функциональность системы.

---

## 6. Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Сложность партицирования | Средняя | Высокое | Использовать pg_partman, тестировать на больших объёмах |
| Производительность SLA worker | Средняя | Среднее | Оптимизировать SQL запросы, добавить индексы |
| Фрод-детекция (false positives) | Высокая | Среднее | Тонкая настройка порогов, A/B тестирование |
| WebSocket scalability | Низкая | Высокое | Использовать Redis adapter для Socket.IO |
| Excel import (большие файлы) | Средняя | Среднее | Ограничить размер, использовать streaming |

---

## 7. Definition of Done (DoD)

### Для каждой задачи:
- [ ] Код написан и соответствует TypeScript strict mode
- [ ] Unit tests написаны (coverage 80%+)
- [ ] API endpoint документирован в Swagger
- [ ] Код прошёл code review
- [ ] Интеграционные тесты проходят
- [ ] Нет console.log, закомментированного кода
- [ ] Соответствует api-specification.md
- [ ] Соответствует business-logic-specification.md

### Для каждого этапа:
- [ ] Все задачи этапа завершены
- [ ] E2E тесты проходят
- [ ] Производительность соответствует SLA (< 200ms для 95% запросов)
- [ ] Документация обновлена
- [ ] Деплой на staging успешен

---

## 8. Команда и роли

| Роль | Количество | Ответственность |
|------|------------|-----------------|
| Backend Developer | 2 | API, бизнес-логика, воркеры |
| Database Engineer | 1 | Миграции, оптимизация, партицирование |
| QA Engineer | 1 | Тестирование, автоматизация |
| DevOps Engineer | 0.5 | Docker, CI/CD, мониторинг |
| Tech Lead | 0.5 | Архитектура, code review |

---

**Статус:** ✅ Готово к реализации  
**Следующий шаг:** Начать с Этапа 1 (Infrastructure)
