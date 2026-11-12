# План устранения замечаний IT Council

**Дата:** 10.11.2026  
**Статус:** Утверждён  
**Приоритет:** Критический

---

## 📊 Сводка отклонений

| Категория | Критических | Высоких | Средних | Всего |
|-----------|-------------|---------|---------|-------|
| TypeScript Errors | 5 | - | - | 5 |
| Security Vulnerabilities | 3 | 2 | - | 5 |
| Test Coverage Gaps | 8 | 4 | - | 12 |
| Infrastructure | - | 3 | 2 | 5 |
| **ИТОГО** | **16** | **9** | **2** | **27** |

---

## 🔴 ПРИОРИТЕТ 1: Критические блокирующие проблемы (Неделя 1)

### 1.1 Исправление TypeScript errors

**Проблема:** 5 controllers с implicit `any` types блокируют compilation  
**Влияние:** Невозможно собрать production build  
**Приоритет:** **БЛОКИРУЮЩЕЕ**

#### Файлы для исправления:

| Файл | Строка | Параметр | Ошибка |
|------|--------|----------|--------|
| `attendance.controller.ts` | 61 | `req` | TS7006: implicit any |
| `attendance.controller.ts` | 83 | `req` | TS7006: implicit any |
| `attendance.controller.ts` | 100 | `req` | TS7006: implicit any |
| `fraud.controller.ts` | 85 | `req` | TS7006: implicit any |
| `analytics.controller.ts` | 19 | `req` | TS7006: implicit any |
| `notifications.controller.ts` | 33, 43, 53, 62 | `req` | TS7006: implicit any (4x) |
| `jwt.strategy.ts` | 13 | `secretOrKey` | TS2345: can be undefined |

#### Решение:

**Шаг 1:** Добавить тип `Request` для всех `req` параметров:
```typescript
// Было:
async submitAttendance(@Request() req, @Body() submitDto: SubmitAttendanceDto)

// Стало:
async submitAttendance(@Request() req: any, @Body() submitDto: SubmitAttendanceDto)
// ИЛИ лучше:
async submitAttendance(@Request() req: Request & { user: JwtPayload }, @Body() submitDto: SubmitAttendanceDto)
```

**Шаг 2:** Исправить `jwt.strategy.ts`:
```typescript
// Было:
secretOrKey: configService.get('JWT_PUBLIC_KEY'),

// Стало:
secretOrKey: configService.getOrThrow('JWT_PUBLIC_KEY'),
```

**Оценка:** 4 часа  
**Ответственный:** Backend Developer

---

### 1.2 Реализовать WebSocket Authentication Guard

**Проблема:** WebSocket connection принимает любой клиент без валидации  
**Влияние:** Критическая уязвимость безопасности  
**Приоритет:** **КРИТИЧЕСКИЙ**

#### Текущее состояние:
```typescript
// events.gateway.ts - есть аутентификация, но нет защиты channels
@SubscribeMessage('subscribe')
handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { channels: string[] }) {
  data.channels.forEach((channel) => {
    client.join(channel); // Любой может подписаться на любой channel!
  });
}
```

#### Решение:

**Шаг 1:** Добавить валидацию прав на подписку:
```typescript
handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { channels: string[] }) {
  const userId = this.connectedUsers.get(client.id);
  
  data.channels.forEach((channel) => {
    // Проверка прав
    if (channel.startsWith('user:') && channel !== `user:${userId}`) {
      this.logger.warn(`User ${userId} attempted to subscribe to another user's channel`);
      return;
    }
    
    // Admin-only channels
    if (['fraud_alerts', 'sla_violations'].includes(channel)) {
      // Проверить роль пользователя (нужно хранить роль в connectedUsers)
      // ...
    }
    
    client.join(channel);
  });
}
```

**Шаг 2:** Хранить роль пользователя:
```typescript
private connectedUsers: Map<string, { userId: string; role: string }> = new Map();
```

**Оценка:** 8 часов  
**Ответственный:** Backend Developer

---

### 1.3 Исправить CORS конфигурацию

**Проблема:** Localhost origins в production config  
**Влияние:** Security risk — локальные URL не должны быть в production  
**Приоритет:** **КРИТИЧЕСКИЙ**

#### Текущее состояние:
```typescript
// main.ts
app.enableCors({
  origin: [
    'https://app.checkin-service.com',
    'https://admin.checkin-service.com',
    'http://localhost:3001',  // ❌ Production only
    'http://localhost:5173',  // ❌ Production only
  ],
});
```

#### Решение:
```typescript
// main.ts
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://app.checkin-service.com', 'https://admin.checkin-service.com']
  : ['http://localhost:3001', 'http://localhost:5173'];

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
});
```

**Оценка:** 2 часа  
**Ответственный:** Backend Developer

---

### 1.4 Включить JWT Token Blacklist

**Проблема:** Blacklist реализован, но не используется  
**Влияние:** Невозможно отзывать токены  
**Приоритет:** **КРИТИЧЕСКИЙ**

#### Текущее состояние:
```typescript
// jwt.strategy.ts
async validate(payload: any) {
  // Проверка blacklist (для access token)
  // В production нужно проверять access token в blacklist
  // const token = ExtractJwt.fromAuthHeaderAsBearerToken();
  // const isBlacklisted = await this.redisService.isBlacklisted(token);
  // if (isBlacklisted) {
  //   throw new UnauthorizedException('Токен отозван');
  // }
  // ...
}
```

#### Решение:

**Шаг 1:** Раскомментировать и реализовать проверку:
```typescript
async validate(payload: any) {
  if (!payload.sub) {
    throw new UnauthorizedException('Недействительный токен');
  }

  // Получаем токен из request
  const request = payload as any;
  const token = request.headers?.authorization?.replace('Bearer ', '');
  
  if (token) {
    const isBlacklisted = await this.redisService.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Токон отозван');
    }
  }

  return {
    id: payload.sub,
    login: payload.login,
    role: payload.role,
    email: payload.email,
    device_fingerprint: payload.device_fingerprint,
  };
}
```

**Шаг 2:** Добавить endpoint для logout с blacklist:
```typescript
// auth.service.ts
async logout(userId: string, token: string): Promise<void> {
  // Добавляем токен в blacklist до истечения срока действия
  const payload = this.jwtService.decode(token) as any;
  const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
  
  if (expiresIn > 0) {
    await this.redisService.addToBlacklist(token, expiresIn);
  }
}
```

**Оценка:** 6 часов  
**Ответственный:** Backend Developer

---

## 🟠 ПРИОРИТЕТ 2: Security Hardening (Неделя 2)

### 2.1 Добавить Rate Limiting для критических endpoints

**Проблема:** `@nestjs/throttler` добавлен, но не применяется  
**Влияние:** API уязвим к brute-force attacks  
**Приоритет:** **ВЫСОКИЙ**

#### Решение:

**Шаг 1:** Добавить глобальный throttling:
```typescript
// app.module.ts - уже есть ThrottlerModule.forRootAsync()

// main.ts
import { ThrottlerGuard } from '@nestjs/throttler';

app.useGlobalGuards(new ThrottlerGuard());
```

**Шаг 2:** Добавить строгий rate limit для auth endpoints:
```typescript
// auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 попыток в минуту
async login(@Body() loginDto: LoginDto) {
  // ...
}
```

**Оценка:** 4 часа  
**Ответственный:** Backend Developer

---

### 2.2 Добавить Device Fingerprint Validation

**Проблема:** Device fingerprint сохраняется, но не проверяется  
**Влияние:** Нет защиты от session hijacking  
**Приоритет:** **ВЫСОКИЙ**

#### Решение:

**Шаг 1:** Добавить проверку fingerprint при каждом запросе:
```typescript
// auth.guard.ts
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const token = request.headers.authorization?.replace('Bearer ', '');
  
  if (!token) return false;
  
  const payload = this.jwtService.verify(token);
  
  // Проверка device fingerprint
  const storedFingerprint = await this.redisService.getDeviceFingerprint(payload.sub);
  const requestFingerprint = request.headers['x-device-fingerprint'];
  
  if (storedFingerprint && storedFingerprint !== requestFingerprint) {
    throw new UnauthorizedException('Несоответствие device fingerprint');
  }
  
  request.user = payload;
  return true;
}
```

**Оценка:** 6 часов  
**Ответственный:** Backend Developer

---

### 2.3 Добавить Security Headers

**Проблема:** Отсутствуют HTTP security headers  
**Влияние:** Уязвимость к XSS, clickjacking, MIME sniffing  
**Приоритет:** **ВЫСОКИЙ**

#### Решение:
```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet());
```

**Дополнительно:**
```typescript
// CORS уже настроен, добавить:
app.enableCors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // 24 часа
});
```

**Оценка:** 2 часа  
**Ответственный:** Backend Developer

---

## 🟡 ПРИОРИТЕТ 3: Test Coverage (Недели 3-4)

### 3.1 Написать unit tests для Workers

**Проблема:** 0% покрытие для критической бизнес-логики  
**Файлы:**
- `attendance.worker.ts` (208 строк)
- `fraud.worker.ts` (158 строк)
- `sla.worker.ts` (146 строк)

**Целевое покрытие:** 80%+  
**Приоритет:** **ВЫСОКИЙ**

#### Тест-кейсы для `attendance.worker.ts`:

```typescript
describe('AttendanceWorker', () => {
  describe('processAttendance', () => {
    it('должен корректно агрегировать данные присутствия', async () => {
      // Arrange
      const job = createMockJob({
        user_id: 'user-uuid',
        beacon_uuid: 'beacon-uuid',
        rssi_values: [-50, -55, -60],
        timestamps: [/* ... */],
      });
      
      // Act
      const result = await worker.processAttendance(job);
      
      // Assert
      expect(result.status).toBe('processed');
      expect(result.duration).toBeGreaterThan(0);
    });
    
    it('должен отклонять дублирующиеся запросы', async () => {
      // ...
    });
    
    it('должен обрабатывать ошибки базы данных', async () => {
      // ...
    });
  });
});
```

**Оценка:** 16 часов (все 3 worker'а)  
**Ответственный:** QA Engineer + Backend Developer

---

### 3.2 Написать tests для Controllers

**Проблема:** 0% покрытие для всех controllers  
**Файлы:** 10 controllers (0 строк покрытия)

#### Приоритет controllers для тестирования:

| Controller | Критичность | Оценка |
|------------|-------------|--------|
| `attendance.controller.ts` | Высокая | 8 часов |
| `auth.controller.ts` | Высокая | 6 часов |
| `fraud.controller.ts` | Высокая | 6 часов |
| `notifications.controller.ts` | Средняя | 4 часа |
| `objects.controller.ts` | Средняя | 4 часа |
| `users.controller.ts` | Средняя | 4 часа |
| `beacons.controller.ts` | Средняя | 4 часа |
| `zones.controller.ts` | Средняя | 4 часа |
| `contracts.controller.ts` | Средняя | 4 часа |
| `analytics.controller.ts` | Низкая | 4 часа |

**Итого:** 48 часов  
**Ответственный:** QA Engineer

---

### 3.3 Написать integration tests

**Проблема:** E2E тесты существуют, но не покрывают критические сценарии

#### Необходимые integration tests:

| Сценарий | Приоритет | Оценка |
|----------|-----------|--------|
| Auth flow (login → refresh → logout) | Высокий | 8 часов |
| Attendance submission + BLE aggregation | Высокий | 12 часов |
| Fraud detection pipeline | Высокий | 8 часов |
| SLA violation tracking | Средний | 6 часов |
| WebSocket real-time updates | Средний | 6 часов |

**Итого:** 40 часов  
**Ответственный:** QA Engineer

---

### 3.4 Написать Mobile App tests

**Проблема:** 0 тестов для Kotlin mobile app

#### Необходимые tests:

| Компонент | Тип теста | Оценка |
|-----------|-----------|--------|
| `AuthRepository` | Unit | 4 часа |
| `BleManager` | Unit | 8 часов |
| `BleScanningService` | Unit | 6 часов |
| `SyncWorker` | Unit | 4 часа |
| `TokenManager` | Unit | 4 часа |
| Auth flow | Integration | 6 часов |
| BLE scanning | Integration | 8 часов |

**Итого:** 40 часов  
**Ответственный:** Mobile Developer

---

## 🟢 ПРИОРИТЕТ 4: Infrastructure (Неделя 5)

### 4.1 Добавить Docker configuration

**Проблема:** Нет контейнеризации  
**Влияние:** Сложности с deployment и scaling  
**Приоритет:** **СРЕДНИЙ**

#### Файлы для создания:

**`server/Dockerfile`:**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
CMD ["node", "dist/main"]
```

**`docker-compose.yml`:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: checkin_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  server:
    build: ./server
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: postgres
      DB_PASSWORD: postgres
      DB_DATABASE: checkin_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  web:
    build: ./web
    ports:
      - "3001:80"
    depends_on:
      - server

volumes:
  postgres_data:
  redis_data:
```

**Оценка:** 8 часов  
**Ответственный:** Backend Developer

---

### 4.2 Добавить Environment Configuration

**Проблема:** Отсутствует `.env.example`  
**Влияние:** Новые разработчики не знают какие переменные нужны  
**Приоритет:** **СРЕДНИЙ**

#### Файл `.env.example`:
```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=checkin_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_PUBLIC_KEY=
JWT_PRIVATE_KEY=

# Security
BCRYPT_SALT_ROUNDS=12
THROTTLE_TTL=60
THROTTLE_LIMIT=60

# CORS
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5173

# Mobile App Settings
AGGREGATION_INTERVAL_SEC=600
SYNC_INTERVAL_SEC=600

# Logging
LOG_LEVEL=debug
```

**Оценка:** 2 часа  
**Ответственный:** Backend Developer

---

### 4.3 Добавить Deployment Guide

**Проблема:** Нет документации по deployment  
**Влияние:** Невозможно развернуть production  
**Приоритет:** **СРЕДНИЙ**

#### Файл `docs/DEPLOYMENT.md`:
```markdown
# Deployment Guide

## Prerequisites
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+
- Node.js 20+

## Production Deployment

### 1. Clone repository
```bash
git clone https://github.com/your-org/checkin-service.git
cd checkin-service
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with production values
```

### 3. Build and run
```bash
docker-compose up -d
```

### 4. Run migrations
```bash
docker-compose exec server npm run migration:run
```

### 5. Create admin user
```bash
docker-compose exec server npm run seed
```
```

**Оценка:** 4 часа  
**Ответственный:** Backend Developer

---

## 📅 Timeline

| Неделя | Задачи | Оценка | Результат |
|--------|--------|--------|-----------|
| **Неделя 1** | TypeScript errors + Security critical | 20 часов | Блокирующие проблемы устранены |
| **Неделя 2** | Security hardening | 12 часов | Security vulnerabilities закрыты |
| **Неделя 3-4** | Test coverage (Backend) | 104 часа | Покрытие 70%+ |
| **Неделя 5** | Infrastructure + Mobile tests | 48 часов | Production-ready |
| **ИТОГО** | | **184 часа** | **Production Ready** |

---

## ✅ Definition of Done

### Критерии готовности к production:

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

## 📊 Метрики успеха

| Метрика | До | После |
|---------|-----|-------|
| TypeScript Errors | 5+ | 0 |
| Test Coverage | 20% | 70%+ |
| Security Vulnerabilities | 5 critical | 0 |
| Production Ready | ❌ | ✅ |

---

## 🎯 Риски и митигации

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Недостаточно времени на тесты | Средняя | Высокое | Приоритизация критических paths |
| Mobile developer заболеет | Низкая | Высокое | Cross-training backend developer |
| BLE scanning нестабильность | Средняя | Среднее | Расширенное тестирование на разных устройствах |
| Production incident после deployment | Средняя | Высокое | Rollback plan + monitoring |

---

**Создано:** 10.11.2026  
**Автор:** IT Council  
**Статус:** Готово к выполнению
