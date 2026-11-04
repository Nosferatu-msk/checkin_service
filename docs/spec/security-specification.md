# Security Specification — Контроль присутствия

**Версия:** 1.0  
**Дата:** 04.11.2026

---

## 1. Аутентификация

### 1.1. JWT Token (RS256)

**Алгоритм:** RS256 (RSA Signature with SHA-256)  
**Размер ключа:** 2048-bit  
**Issuer:** `checkin-service`  
**Audience:** `checkin-client`

#### Access Token
```json
{
  "sub": "user-uuid",
  "role": "admin",
  "email": "admin@example.com",
  "device_fingerprint": "sha256_hash",
  "iat": 1699084800,
  "exp": 1699085700,  // 15 минут
  "iss": "checkin-service",
  "aud": "checkin-client"
}
```

#### Refresh Token
```json
{
  "sub": "user-uuid",
  "token_type": "refresh",
  "device_fingerprint": "sha256_hash",
  "iat": 1699084800,
  "exp": 1699344000,  // 30 дней
  "iss": "checkin-service"
}
```

### 1.2. Flow аутентификации

```
┌──────────┐                              ┌──────────┐
│  Client  │                              │  Server  │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  1. POST /auth/login                    │
     │  { login, password, fingerprint }       │
     │────────────────────────────────────────>│
     │                                         │
     │  2. Validate credentials                │
     │  3. Check fingerprint                   │
     │  4. Generate tokens                     │
     │                                         │
     │  5. { access_token, refresh_token }     │
     │<────────────────────────────────────────│
     │                                         │
     │  6. Store tokens                        │
     │                                         │
     │  7. API request                         │
     │  Authorization: Bearer <access_token>   │
     │────────────────────────────────────────>│
     │                                         │
     │  8. Validate token                      │
     │  9. Check blacklist (Redis)             │
     │                                         │
     │  10. Response                           │
     │<────────────────────────────────────────│
     │                                         │
```

### 1.3. Password Hashing

**Алгоритм:** bcrypt  
**Cost factor:** 12  
**Salt rounds:** 12

```typescript
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 1.4. Token Refresh

```typescript
async function refreshToken(refreshToken: string) {
  // 1. Verify token signature
  const payload = jwt.verify(refreshToken, PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: 'checkin-service'
  });
  
  // 2. Check if token is blacklisted
  const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
  if (isBlacklisted) {
    throw new UnauthorizedException('Token is blacklisted');
  }
  
  // 3. Check device fingerprint
  const user = await getUserById(payload.sub);
  if (user.device_fingerprint_hash !== payload.device_fingerprint) {
    throw new ForbiddenException('Device mismatch');
  }
  
  // 4. Generate new access token
  const newAccessToken = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      device_fingerprint: payload.device_fingerprint
    },
    PRIVATE_KEY,
    {
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'checkin-service'
    }
  );
  
  return { access_token: newAccessToken, expires_in: 900 };
}
```

### 1.5. Logout

```typescript
async function logout(refreshToken: string) {
  // 1. Add refresh token to blacklist
  const payload = jwt.decode(refreshToken);
  const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
  
  await redis.setex(`blacklist:${refreshToken}`, expiresIn, '1');
  
  // 2. Invalidate all sessions for this user (optional)
  // await redis.del(`sessions:${payload.sub}`);
}
```

---

## 2. Авторизация

### 2.1. Ролевая модель (RBAC)

| Роль | Описание | Права |
|------|----------|-------|
| `admin` | Администратор | Полный доступ ко всем функциям |
| `curator` | Куратор | Доступ только к своим договорам |
| `employee` | Сотрудник | Только свой табель и настройки |

### 2.2. Permissions Matrix

| Resource | Action | Admin | Curator | Employee |
|----------|--------|:-----:|:-------:|:--------:|
| objects | create, read, update, delete | ✅ | ❌ | ❌ |
| zones | create, read, update, delete | ✅ | ❌ | ❌ |
| beacons | create, read, update, delete | ✅ | ❌ | ❌ |
| contracts | create, read, update, delete | ✅ | ❌ | ❌ |
| contracts (own) | read | ✅ | ✅ | ❌ |
| employees | create, read, update, delete | ✅ | ❌ | ❌ |
| employees (own contract) | create, read, update, delete | ✅ | ✅ | ❌ |
| attendance (all) | read | ✅ | ❌ | ❌ |
| attendance (own contract) | read | ✅ | ✅ | ❌ |
| attendance (own) | read | ✅ | ✅ | ✅ |
| sla | create, read, update, delete | ✅ | ❌ | ❌ |
| sla (own contract) | create, read, update, delete | ✅ | ✅ | ❌ |
| fraud | read, review | ✅ | ❌ | ❌ |
| settings | read, update | ✅ | ❌ | ❌ |
| notifications | read, mark_read | ✅ | ✅ | ✅ |

### 2.3. Middleware авторизации

```typescript
// middleware/auth.middleware.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    if (!requiredRoles) {
      return true;  // No roles required
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return requiredRoles.includes(user.role);
  }
}

// middleware/contract-access.middleware.ts
@Injectable()
export class ContractAccessGuard implements CanActivate {
  constructor(private contractsService: ContractsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const contractId = request.params.contractId;
    
    if (user.role === 'admin') {
      return true;  // Admin has access to all contracts
    }
    
    if (user.role === 'curator') {
      // Check if curator is assigned to this contract
      return this.contractsService.isCuratorAssigned(contractId, user.id);
    }
    
    return false;
  }
}
```

### 2.4. Row Level Security (RLS)

```sql
-- Включение RLS для таблицы contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Политика для кураторов (только свои договоры)
CREATE POLICY curator_contracts ON contracts
  FOR SELECT
  USING (
    id IN (
      SELECT contract_id FROM contract_curators
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Политика для админов (все договоры)
CREATE POLICY admin_contracts ON contracts
  FOR ALL
  USING (
    current_setting('app.current_user_role') = 'admin'
  );
```

---

## 3. Защита от атак

### 3.1. Replay Attacks

**Механизм:** Уникальный `request_id` для каждого запроса

```typescript
// middleware/replay-protection.middleware.ts
async function checkReplayAttack(requestId: string, userId: string) {
  const key = `replay:${userId}:${requestId}`;
  const exists = await redis.get(key);
  
  if (exists) {
    throw new ConflictException('Duplicate request detected');
  }
  
  // Store request ID for 24 hours
  await redis.setex(key, 86400, '1');
}

// Использование
POST /api/v1/mobile/attendance
{
  "request_id": "uuid-v4",  // Уникальный ID
  "records": [...]
}
```

### 3.2. Rate Limiting

```typescript
// middleware/rate-limit.middleware.ts
import * as rateLimit from 'express-rate-limit';

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 60,  // 60 requests per minute
  message: 'Too many requests, please try again later'
});

// Auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 5,  // 5 requests per minute
  message: 'Too many login attempts, please try again later'
});

// Mobile endpoints
const mobileLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,  // 10 requests per minute per user
  keyGenerator: (req) => req.user?.id || req.ip
});

// Import endpoints
const importLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,  // 3 requests per minute
  message: 'Import limit exceeded'
});
```

### 3.3. Device Fingerprint

**Алгоритм генерации:**
```typescript
import * as crypto from 'crypto';

function generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
  const data = [
    deviceInfo.androidId,
    deviceInfo.manufacturer,
    deviceInfo.model,
    deviceInfo.hardware,
    deviceInfo.board,
    deviceInfo.serial || '',
    deviceInfo.bleMacAddress || ''
  ].join('|');
  
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

**Проверка:**
```typescript
async function validateDeviceFingerprint(userId: string, fingerprint: string) {
  const user = await getUserById(userId);
  
  if (!user.device_fingerprint_hash) {
    // First login — save fingerprint
    await updateUserFingerprint(userId, fingerprint);
    return true;
  }
  
  if (user.device_fingerprint_hash !== fingerprint) {
    // Fingerprint mismatch — potential fraud
    await logFraudEvent(userId, 'device_mismatch', {
      expected: user.device_fingerprint_hash,
      actual: fingerprint
    });
    
    // Block session
    await revokeAllSessions(userId);
    
    return false;
  }
  
  return true;
}
```

### 3.4. Timestamp Validation

```typescript
function validateTimestamps(record: AttendanceRecord) {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Check for future timestamps
  if (record.scan_timestamp_end > fiveMinutesFromNow) {
    throw new BadRequestException('Timestamp from future detected');
  }
  
  // Check for old timestamps
  if (record.scan_timestamp_start < twentyFourHoursAgo) {
    throw new BadRequestException('Timestamp too old');
  }
  
  // Check for invalid range
  if (record.scan_timestamp_start >= record.scan_timestamp_end) {
    throw new BadRequestException('Invalid timestamp range');
  }
  
  // Check clock skew
  const clockSkew = Math.abs(now.getTime() - record.scan_timestamp_start.getTime());
  if (clockSkew > 5 * 60 * 1000) {  // 5 minutes
    logFraudEvent(record.user_id, 'clock_skew_detected', {
      skew_minutes: clockSkew / 60000
    });
  }
}
```

---

## 4. Защита данных

### 4.1. Шифрование at rest

**Чувствительные данные:**
- Пароли (bcrypt)
- Device fingerprints (SHA-256)
- JWT tokens (RS256)

**Database encryption:**
```sql
-- PostgreSQL Transparent Data Encryption (TDE)
-- Включается на уровне сервера БД

-- Шифрование чувствительных колонок
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Пример шифрования email (опционально)
UPDATE users SET email = pgp_sym_encrypt(email, 'encryption_key');
```

### 4.2. Защита от XSS

```typescript
// Middleware: Helmet
import * as helmet from 'helmet';

app.use(helmet());

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "wss://server"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  }
}));
```

### 4.3. Защита от CSRF

```typescript
// Для Web UI используется SameSite cookies
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));

// CSRF token для форм
app.use(csurf());
```

### 4.4. SQL Injection Protection

```typescript
// Использование parameterized queries (ORM)
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// NestJS + TypeORM
const user = await userRepository.findOne({
  where: { id: userId }
});
```

---

## 5. Аудит и логирование

### 5.1. Audit Log

```typescript
// services/audit.service.ts
async function logAuditEvent(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValues?: any,
  newValues?: any
) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId, action, entityType, entityId, oldValues, newValues, req.ip, req.headers['user-agent']]
  );
}

// Использование
await logAuditEvent(
  user.id,
  'UPDATE',
  'beacons',
  beacon.id,
  { battery_level: 85 },
  { battery_level: 15 }
);
```

### 5.2. Security Events

```typescript
// Логирование security-событий
async function logSecurityEvent(type: string, details: any) {
  await logger.warn({
    type: 'security_event',
    event_type: type,
    details,
    timestamp: new Date()
  });
}

// Примеры
await logSecurityEvent('login_failed', { login: 'admin', ip: '192.168.1.1' });
await logSecurityEvent('device_mismatch', { user_id: 'uuid', expected: 'hash1', actual: 'hash2' });
await logSecurityEvent('rate_limit_exceeded', { ip: '192.168.1.1', endpoint: '/auth/login' });
```

---

## 6. HTTPS и TLS

### 6.1. Требования

- **TLS 1.2** минимум (TLS 1.3 рекомендуется)
- **HSTS** (HTTP Strict Transport Security)
- **Certificate Pinning** (для мобильного приложения)

### 6.2. Nginx конфигурация

```nginx
server {
    listen 443 ssl http2;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # TLS settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## 7. Мобильная безопасность

### 7.1. Mock BLE/Location Detection (НОВОЕ из ТЗ)

**Обязательная проверка из ТЗ (п. 2.4.2):**

```kotlin
// Mobile App: Android
fun isMockLocation(location: Location): Boolean {
    return location.isFromMockProvider
}

fun isMockBleScan(scanResult: ScanResult): Boolean {
    // Проверка на mock BLE сканирование
    return scanResult.device.address.startsWith("00:00:00") ||
           scanResult.device.address == "02:00:00:00:00:00"
}

// Middleware на сервере
async function checkMockBle(records: AttendanceRecord[]) {
    for (const record of records) {
        if (record.is_from_mock_provider) {
            await logFraudEvent(record.user_id, 'mock_location', {
                beacon_uuid: record.beacon_uuid,
                timestamp: record.scan_timestamp_start
            });
            throw new ForbiddenException('Mock BLE/Location detected');
        }
    }
}
```

### 7.2. Certificate Pinning (ДЕТАЛИ из ТЗ)

**Обязательное требование из ТЗ (п. 2.4.2):**

```kotlin
// Mobile App: Android (OkHttp)
val certificatePinner = CertificatePinner.Builder()
    // Production certificates
    .add("api.checkin-service.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    .add("api.checkin-service.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")
    // Backup certificate
    .add("api.checkin-service.com", "sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=")
    .build()

val client = OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .build()
```

**iOS (Swift):**
```swift
// URLSessionDelegate
func urlSession(_ session: URLSession, 
                didReceive challenge: URLAuthenticationChallenge,
                completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    
    guard let serverTrust = challenge.protectionSpace.serverTrust,
          let certificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
        completionHandler(.cancelAuthenticationChallenge, nil)
        return
    }
    
    // Pin validation
    let pinnedHash = "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    let remoteHash = sha256Fingerprint(certificate)
    
    if remoteHash == pinnedHash {
        completionHandler(.useCredential, URLCredential(trust: serverTrust))
    } else {
        completionHandler(.cancelAuthenticationChallenge, nil)
        logSecurityEvent('certificate_pin_failed', ['expected': pinnedHash, 'actual': remoteHash])
    }
}
```

### 7.3. Local Authentication (PIN/Биометрия) (НОВОЕ из ТЗ)

**Обязательное требование из ТЗ (п. 2.1.2, 3.2):**

```kotlin
// Mobile App: Android (AndroidX Biometric)
class LoginActivity : AppCompatActivity() {
    
    private lateinit var biometricPrompt: BiometricPrompt
    
    fun setupBiometricAuth() {
        val executor = ContextCompat.getMainExecutor(this)
        
        biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    // Успешная биометрическая аутентификация
                    navigateToHome()
                }
                
                override fun onAuthenticationFailed() {
                    // Неудачная попытка — предложить PIN
                    showPinInput()
                }
            })
        
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Биометрическая аутентификация")
            .setSubtitle("Используйте отпечаток пальца или лицо")
            .setNegativeButtonText("Использовать PIN")
            .build()
        
        biometricPrompt.authenticate(promptInfo)
    }
    
    fun setupPinAuth() {
        // PIN-код хранится в EncryptedSharedPreferences
        val encryptedPrefs = EncryptedSharedPreferences.create(
            "secure_prefs",
            "master_key_alias",
            applicationContext,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV
        )
        
        val savedPinHash = encryptedPrefs.getString("pin_hash", null)
        
        // Показать PIN-экран
        showPinScreen { enteredPin ->
            val enteredHash = hashPin(enteredPin)
            if (enteredHash == savedPinHash) {
                navigateToHome()
            } else {
                showError("Неверный PIN-код")
            }
        }
    }
}
```

### 7.4. EncryptedSharedPreferences (НОВОЕ из ТЗ)

**Обязательное требование из ТЗ (п. 4.3):**

```kotlin
// Mobile App: Android
class SecureStorage(context: Context) {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        "secure_auth_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV
    )
    
    fun saveTokens(accessToken: String, refreshToken: String) {
        encryptedPrefs.edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .apply()
    }
    
    fun getAccessToken(): String? {
        return encryptedPrefs.getString("access_token", null)
    }
    
    fun getRefreshToken(): String? {
        return encryptedPrefs.getString("refresh_token", null)
    }
    
    fun clearTokens() {
        encryptedPrefs.edit()
            .remove("access_token")
            .remove("refresh_token")
            .apply()
    }
}
```

### 7.5. Logout по команде с сервера (НОВОЕ из ТЗ)

**Обязательное требование из ТЗ (п. 2.1.3):**

```kotlin
// Mobile App: Android (Firebase Cloud Messaging)
class PushNotificationService : FirebaseMessagingService() {
    
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val type = remoteMessage.data["type"]
        
        when (type) {
            "force_logout" -> {
                // Принудительный logout по команде с сервера
                val reason = remoteMessage.data["reason"] ?: "Security violation"
                
                // Очистить токены
                SecureStorage(this).clearTokens()
                
                // Очистить локальную БД
                AppDatabase.getInstance(this).clearAllData()
                
                // Показать уведомление
                showNotification("Сессия завершена", reason)
                
                // Перенаправить на экран входа
                navigateToLogin()
            }
            
            "session_expired" -> {
                // Сессия истекла
                SecureStorage(this).clearTokens()
                navigateToLogin()
            }
        }
    }
}
```

### 7.6. FLAG_SECURE (запрет скриншотов) (НОВОЕ из ТЗ)

**Опциональное требование из ТЗ (п. 4.3):**

```kotlin
// Mobile App: Android
class SecureActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Запрет скриншотов и записи экрана
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
        
        setContentView(R.layout.activity_main)
    }
}
```

### 7.7. Play Integrity API

```kotlin
// Mobile App: Android
val integrityTokenResponse = integrityManager.requestIntegrityToken(
    IntegrityTokenRequest.builder()
        .setCloudProjectNumber(PROJECT_NUMBER)
        .setNonce(nonce)
        .build()
)

integrityTokenResponse.addOnSuccessListener { response ->
    val token = response.token()
    // Send token to server for verification
}
```

**Server-side verification:**
```typescript
async function verifyPlayIntegrity(token: string) {
  const response = await playIntegrityApi.verify(token);
  
  const verdict = response.deviceRecognitionVerdict;
  
  if (!verdict.includes('MEETS_DEVICE_INTEGRITY')) {
    throw new ForbiddenException('Device integrity check failed');
  }
  
  if (verdict.includes('RECENT_APP_INTEGRITY_ISSUE')) {
    logSecurityEvent('integrity_issue', { verdict });
  }
  
  return true;
}
```

### 7.2. Root Detection

```kotlin
// Mobile App: Android
fun isDeviceRooted(): Boolean {
    return checkRootFiles() || checkSuBinary() || checkDangerousProps()
}

fun checkRootFiles(): Boolean {
    val paths = arrayOf(
        "/system/app/Superuser.apk",
        "/system/xbin/su",
        "/system/bin/su"
    )
    return paths.any { File(it).exists() }
}
```

### 7.3. Emulator Detection

```kotlin
fun isEmulator(): Boolean {
    return (Build.FINGERPRINT.startsWith("generic")
        || Build.MODEL.contains("google_sdk")
        || Build.MODEL.contains("Emulator")
        || Build.MANUFACTURER.contains("Genymotion"))
}
```

---

## 8. Incident Response

### 8.1. Fraud Review Workflow

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Fraud   │      │  Admin   │      │  Action  │
│  Alert   │─────>│  Review  │─────>│          │
└──────────┘      └──────────┘      └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  Block   │
                 │  User    │
                 └──────────┘
```

### 8.2. Automated Actions

```typescript
// Автоматические действия при критическом фроде
async function handleCriticalFraud(fraudLog: FraudLog) {
  // 1. Блокировка пользователя
  await updateUser(fraudLog.user_id, { is_active: false });
  
  // 2. Отзыв всех сессий
  await revokeAllSessions(fraudLog.user_id);
  
  // 3. Уведомление администратора
  await notifyAdmin({
    type: 'critical_fraud',
    fraud_log: fraudLog,
    action_taken: 'user_blocked'
  });
  
  // 4. Логирование
  await logAuditEvent(
    'system',
    'AUTO_BLOCK',
    'users',
    fraudLog.user_id,
    null,
    { reason: fraudLog.fraud_type }
  );
}
```

---

**Конец спецификации**
