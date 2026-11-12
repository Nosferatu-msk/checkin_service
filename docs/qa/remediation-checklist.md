# Checklist устранения замечаний

**Обновлено:** 10.11.2026  
**Прогресс:** 0 / 27 (0%)

---

## 🔴 ПРИОРИТЕТ 1: Критические блокирующие проблемы

### 1.1 TypeScript Errors (5 ошибок)
- [ ] **TS-1** Исправить `attendance.controller.ts:61` — добавить тип для `req`
- [ ] **TS-2** Исправить `attendance.controller.ts:83` — добавить тип для `req`
- [ ] **TS-3** Исправить `attendance.controller.ts:100` — добавить тип для `req`
- [ ] **TS-4** Исправить `fraud.controller.ts:85` — добавить тип для `req`
- [ ] **TS-5** Исправить `analytics.controller.ts:19` — добавить тип для `req`
- [ ] **TS-6** Исправить `notifications.controller.ts:33,43,53,62` — добавить тип для `req` (4 ошибки)
- [ ] **TS-7** Исправить `jwt.strategy.ts:13` — обработать `undefined` для `secretOrKey`

**Прогресс:** 0 / 7  
**Оценка:** 4 часа

---

### 1.2 WebSocket Authentication
- [ ] **WS-1** Добавить хранение роли пользователя в `connectedUsers`
- [ ] **WS-2** Добавить валидацию прав на подписку в `handleSubscribe`
- [ ] **WS-3** Запретить подписку на чужие `user:{id}` channels
- [ ] **WS-4** Добавить проверку роли для admin-only channels
- [ ] **WS-5** Написать unit tests для WebSocket authentication

**Прогресс:** 0 / 5  
**Оценка:** 8 часов

---

### 1.3 CORS Configuration
- [ ] **CORS-1** Изменить `main.ts` — использовать environment-based origins
- [ ] **CORS-2** Удалить localhost из production config
- [ ] **CORS-3** Добавить `allowedHeaders` для `X-Device-Fingerprint`
- [ ] **CORS-4** Протестировать CORS на staging environment

**Прогресс:** 0 / 4  
**Оценка:** 2 часа

---

### 1.4 JWT Token Blacklist
- [ ] **JWT-1** Раскомментировать проверку blacklist в `jwt.strategy.ts`
- [ ] **JWT-2** Реализовать获取 токена из request в `validate()`
- [ ] **JWT-3** Добавить `logout()` endpoint в `auth.controller.ts`
- [ ] **JWT-4** Добавить `logout()` метод в `auth.service.ts`
- [ ] **JWT-5** Добавить blacklist проверку в `auth.guard.ts`
- [ ] **JWT-6** Написать unit test для logout + blacklist

**Прогресс:** 0 / 6  
**Оценка:** 6 часов

---

## 🟠 ПРИОРИТЕТ 2: Security Hardening

### 2.1 Rate Limiting
- [ ] **RL-1** Добавить `ThrottleGuard` в `app.module.ts`
- [ ] **RL-2** Добавить `@Throttle()` для `auth.controller.ts` (login endpoint)
- [ ] **RL-3** Добавить `@Throttle()` для `attendance.controller.ts` (mobile endpoints)
- [ ] **RL-4** Настроить rate limit в `.env` (THROTTLE_TTL, THROTTLE_LIMIT)
- [ ] **RL-5** Написать unit test для rate limiting

**Прогресс:** 0 / 5  
**Оценка:** 4 часа

---

### 2.2 Device Fingerprint Validation
- [ ] **DF-1** Добавить проверку fingerprint в `auth.guard.ts`
- [ ] **DF-2** Добавить `X-Device-Fingerprint` header в CORS `allowedHeaders`
- [ ] **DF-3** Добавить endpoint для смены device fingerprint
- [ ] **DF-4** Написать unit test для fingerprint validation
- [ ] **DF-5** Обновить mobile app — добавить fingerprint header в запросы

**Прогресс:** 0 / 5  
**Оценка:** 6 часов

---

### 2.3 Security Headers
- [ ] **SH-1** Установить `helmet` package
- [ ] **SH-2** Добавить `app.use(helmet())` в `main.ts`
- [ ] **SH-3** Настроить Content Security Policy (CSP)
- [ ] **SH-4** Протестировать security headers через security scanner

**Прогресс:** 0 / 4  
**Оценка:** 2 часа

---

## 🟡 ПРИОРИТЕТ 3: Test Coverage

### 3.1 Worker Tests
- [ ] **WRK-1** Написать tests для `attendance.worker.ts` (8 часов)
  - [ ] Тест агрегации данных
  - [ ] Тест обработки дубликатов
  - [ ] Тест ошибок БД
  - [ ] Тест retry logic
- [ ] **WRK-2** Написать tests для `fraud.worker.ts` (6 часов)
  - [ ] Тест детекции фрода
  - [ ] Тест классификации severity
  - [ ] Тест notification logic
- [ ] **WRK-3** Написать tests для `sla.worker.ts` (6 часов)
  - [ ] Тест расчёта SLA metrics
  - [ ] Тест violation detection
  - [ ] Тест grace period logic

**Прогресс:** 0 / 3  
**Оценка:** 20 часов

---

### 3.2 Controller Tests
- [ ] **CTRL-1** Написать tests для `attendance.controller.ts` (8 часов)
- [ ] **CTRL-2** Написать tests для `auth.controller.ts` (6 часов)
- [ ] **CTRL-3** Написать tests для `fraud.controller.ts` (6 часов)
- [ ] **CTRL-4** Написать tests для `notifications.controller.ts` (4 часа)
- [ ] **CTRL-5** Написать tests для `objects.controller.ts` (4 часа)
- [ ] **CTRL-6** Написать tests для `users.controller.ts` (4 часа)
- [ ] **CTRL-7** Написать tests для `beacons.controller.ts` (4 часа)
- [ ] **CTRL-8** Написать tests для `zones.controller.ts` (4 часа)
- [ ] **CTRL-9** Написать tests для `contracts.controller.ts` (4 часа)
- [ ] **CTRL-10** Написать tests для `analytics.controller.ts` (4 часа)

**Прогресс:** 0 / 10  
**Оценка:** 48 часов

---

### 3.3 Integration Tests
- [ ] **INT-1** Auth flow (login → refresh → logout) (8 часов)
- [ ] **INT-2** Attendance submission + BLE aggregation (12 часов)
- [ ] **INT-3** Fraud detection pipeline (8 часов)
- [ ] **INT-4** SLA violation tracking (6 часов)
- [ ] **INT-5** WebSocket real-time updates (6 часов)

**Прогресс:** 0 / 5  
**Оценка:** 40 часов

---

### 3.4 Mobile App Tests
- [ ] **MOB-1** Написать tests для `AuthRepository` (4 часа)
- [ ] **MOB-2** Написать tests для `BleManager` (8 часов)
- [ ] **MOB-3** Написать tests для `BleScanningService` (6 часов)
- [ ] **MOB-4** Написать tests для `SyncWorker` (4 часа)
- [ ] **MOB-5** Написать tests для `TokenManager` (4 часа)
- [ ] **MOB-6** Integration test: Auth flow (6 часов)
- [ ] **MOB-7** Integration test: BLE scanning (8 часов)

**Прогресс:** 0 / 7  
**Оценка:** 40 часов

---

## 🟢 ПРИОРИТЕТ 4: Infrastructure

### 4.1 Docker Configuration
- [ ] **DOCK-1** Создать `server/Dockerfile` (multi-stage build)
- [ ] **DOCK-2** Создать `web/Dockerfile` (nginx + static files)
- [ ] **DOCK-3** Создать `docker-compose.yml` (postgres, redis, server, web)
- [ ] **DOCK-4** Создать `.dockerignore` файлы
- [ ] **DOCK-5** Протестировать docker-compose локально

**Прогресс:** 0 / 5  
**Оценка:** 8 часов

---

### 4.2 Environment Configuration
- [ ] **ENV-1** Создать `.env.example` с всеми переменными
- [ ] **ENV-2** Создать `.env.development` для локальной разработки
- [ ] **ENV-3** Создать `.env.production` template
- [ ] **ENV-4** Добавить валидацию env variables в `app.module.ts`

**Прогресс:** 0 / 4  
**Оценка:** 2 часа

---

### 4.3 Deployment Guide
- [ ] **DEP-1** Создать `docs/DEPLOYMENT.md`
- [ ] **DEP-2** Описать prerequisites
- [ ] **DEP-3** Описать production deployment steps
- [ ] **DEP-4** Добавить troubleshooting section
- [ ] **DEP-5** Добавить rollback instructions

**Прогресс:** 0 / 5  
**Оценка:** 4 часа

---

## 📊 Сводный прогресс

| Приоритет | Задач | Выполнено | Прогресс |
|-----------|-------|-----------|----------|
| 🔴 Приоритет 1 | 22 | 0 | 0% |
| 🟠 Приоритет 2 | 14 | 0 | 0% |
| 🟡 Приоритет 3 | 25 | 0 | 0% |
| 🟢 Приоритет 4 | 14 | 0 | 0% |
| **ИТОГО** | **75** | **0** | **0%** |

---

## 🎯 Definition of Done

### Production Ready Criteria:

- [ ] Все TypeScript errors исправлены (0 errors)
- [ ] WebSocket authentication реализован
- [ ] CORS configured правильно (no localhost in production)
- [ ] JWT blacklist работает
- [ ] Rate limiting включён
- [ ] Device fingerprint validation добавлен
- [ ] Security headers добавлены
- [ ] Test coverage ≥ 70%
- [ ] Workers протестированы (80%+ coverage)
- [ ] Controllers протестированы (70%+ coverage)
- [ ] Integration tests проходят
- [ ] Mobile app tests написаны
- [ ] Docker configuration готов
- [ ] `.env.example` создан
- [ ] Deployment guide написан
- [ ] CI/CD pipeline настроен

---

**Обновляйте этот checklist по мере выполнения задач!**
