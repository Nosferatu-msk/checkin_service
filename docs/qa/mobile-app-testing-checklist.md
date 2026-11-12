# Чеклист проверки мобильного приложения

**Дата:** 11.11.2026  
**Тестируемое устройство:** Samsung Galaxy A70  
**Версия приложения:** 1.0.0

---

## 📋 Предварительная проверка

### 1. Структура проекта ✅
- [x] Все файлы на месте (util, domain/usecase, data, presentation)
- [x] RootDetector, EmulatorDetector, MockBleDetector, PlayIntegrityManager, DeviceFingerprintManager
- [x] Use cases: SetPinUseCase, EnableBiometricUseCase, GetCurrentUserUseCase, LoginUseCase
- [x] BleManager с whitelist фильтрацией и duty cycle
- [x] PresenceAlgorithm для определения присутствия
- [x] AuthInterceptor для 401/403
- [x] Certificate Pinning (placeholder hashes)
- [x] BootCompletedReceiver
- [x] SelfWatchdog

### 2. Конфигурация ✅
- [x] baseUrl: `https://api.checkin-service.com/`
- [x] Certificate Pinning настроен (placeholder hashes)
- [x] Hilt DI настроен
- [x] Room Database настроена
- [x] Retrofit настроен

---

## 🧪 Тестовые сценарии

### Сценарий 1: Авторизация

**Шаги:**
1. Запустить приложение
2. Ввести тестовые данные:
   - Email: `testic@test.ru`
   - Пароль: `hello2026`
3. Нажать "Войти"

**Ожидаемое поведение:**
- ✅ Запрос на `POST /auth/login`
- ✅ Получение access_token и refresh_token
- ✅ Сохранение токенов в EncryptedSharedPreferences
- ✅ Переход на PinSetupScreen (первичный вход)

**Проверка:**
```bash
adb logcat | grep -E "(LoginUseCase|AuthRepository|TokenManager)"
```

---

### Сценарий 2: Настройка PIN

**Шаги:**
1. После успешного входа ввести PIN (например, `1234`)
2. Подтвердить PIN
3. Нажать "Установить PIN"

**Ожидаемое поведение:**
- ✅ PIN сохранён в EncryptedSharedPreferences
- ✅ Переход на BiometricSetupScreen

**Проверка:**
```bash
adb logcat | grep -E "(SetPinUseCase|TokenManager)"
```

---

### Сценарий 3: Настройка биометрии

**Шаги:**
1. На BiometricSetupScreen нажать "Включить биометрию"
2. Подтвердить биометрическую аутентификацию
3. Нажать "Пропустить" (если не хотите использовать биометрию)

**Ожидаемое поведение:**
- ✅ BiometricPrompt диалог показан
- ✅ Флаг biometric_enabled сохранён
- ✅ Переход на HomeScreen

**Проверка:**
```bash
adb logcat | grep -E "(EnableBiometricUseCase|BiometricPrompt)"
```

---

### Сценарий 4: Повторный вход (по PIN)

**Шаги:**
1. Закрыть приложение
2. Открыть приложение снова
3. Ввести PIN `1234`

**Ожидаемое поведение:**
- ✅ Проверка isLoggedIn() при старте
- ✅ Переход на PinLoginScreen (если есть PIN)
- ✅ Проверка PIN через TokenManager.getPin()
- ✅ Переход на HomeScreen при успешном входе

**Проверка:**
```bash
adb logcat | grep -E "(CheckInNavHost|PinLoginViewModel)"
```

---

### Сценарий 5: Повторный вход (по биометрии)

**Шаги:**
1. Закрыть приложение
2. Открыть приложение снова
3. Использовать биометрию (отпечаток пальца)

**Ожидаемое поведение:**
- ✅ BiometricPrompt диалог показан автоматически
- ✅ При успешной аутентификации — переход на HomeScreen
- ✅ При ошибке — fallback на PIN

**Проверка:**
```bash
adb logcat | grep -E "(BiometricLoginScreen|BiometricPrompt)"
```

---

### Сценарий 6: BLE сканирование

**Шаги:**
1. На HomeScreen проверить статус BLE-сканирования
2. Убедиться, что сканирование активно
3. Поднести тестовый маяк ESP32-C3

**Ожидаемое поведение:**
- ✅ Статус: "Сбор данных активен"
- ✅ Счётчик обнаруженных маяков увеличивается
- ✅ Whitelist фильтрация работает (только маяки из allowed_beacon_uuids)
- ✅ Duty cycle работает (3 сек сканирование / 7 сек пауза)
- ✅ PresenceAlgorithm определяет присутствие (минимум 3 замера)

**Проверка:**
```bash
adb logcat | grep -E "(BleManager|PresenceAlgorithm|SettingsRepository)"
```

---

### Сценарий 7: Синхронизация данных

**Шаги:**
1. Подождать 15 минут (или нажать "Синхронизировать сейчас")
2. Проверить статус синхронизации

**Ожидаемое поведение:**
- ✅ SyncWorker запускается каждые 15 минут
- ✅ Данные из Room отправляются на `POST /mobile/attendance`
- ✅ Device fingerprint передаётся в запросе
- ✅ При успехе — записи помечаются как synced
- ✅ При 401 — автоматический refresh token
- ✅ При 403 — принудительный logout

**Проверка:**
```bash
adb logcat | grep -E "(SyncWorker|AuthInterceptor|DeviceFingerprintManager)"
```

---

### Сценарий 8: Фрод-контроль

**Шаги:**
1. Попробовать запустить приложение на эмуляторе
2. Попробовать запустить приложение на рутированном устройстве
3. Попробовать использовать mock BLE приложение

**Ожидаемое поведение:**
- ✅ EmulatorDetector определяет эмулятор
- ✅ RootDetector определяет root
- ✅ MockBleDetector определяет mock BLE
- ✅ LoginUseCase возвращает ошибку

**Проверка:**
```bash
adb logcat | grep -E "(EmulatorDetector|RootDetector|MockBleDetector)"
```

---

### Сценарий 9: Logout

**Шаги:**
1. Перейти на SettingsScreen
2. Нажать "Выйти"

**Ожидаемое поведение:**
- ✅ Вызов `POST /auth/logout`
- ✅ Очистка токенов из EncryptedSharedPreferences
- ✅ Переход на LoginScreen

**Проверка:**
```bash
adb logcat | grep -E "(SettingsViewModel|AuthRepository|TokenManager)"
```

---

### Сценарий 10: Foreground Service

**Шаги:**
1. Запустить приложение
2. Свернуть приложение
3. Проверить уведомление в статус-баре

**Ожидаемое поведение:**
- ✅ BleScanningService запущен как Foreground Service
- ✅ Уведомление в статус-баре
- ✅ SelfWatchdog проверяет сервис каждые 5 минут
- ✅ При остановке сервиса — автоматический перезапуск

**Проверка:**
```bash
adb logcat | grep -E "(BleScanningService|SelfWatchdog|WatchdogWorker)"
```

---

### Сценарий 11: Boot Completed

**Шаги:**
1. Перезагрузить устройство
2. Дождаться загрузки Android
3. Проверить, запустился ли BleScanningService

**Ожидаемое поведение:**
- ✅ BootCompletedReceiver получает broadcast
- ✅ Проверка isLoggedIn()
- ✅ Если авторизован — запуск BleScanningService

**Проверка:**
```bash
adb logcat | grep -E "(BootCompletedReceiver|BleScanningService)"
```

---

## 🔍 Отладка

### Логи приложения
```bash
# Все логи
adb logcat | grep "com.checkin.mobile"

# Только ошибки
adb logcat *:E | grep "com.checkin.mobile"

# Конкретный тег
adb logcat -s BleManager:D
```

### Проверка базы данных
```bash
# Скопировать базу данных с устройства
adb exec-out run-as com.checkin.mobile cat databases/checkin.db > checkin.db

# Открыть в DB Browser for SQLite
```

### Проверка токенов
```bash
# Проверить EncryptedSharedPreferences (требуется root)
adb shell
run-as com.checkin.mobile
cd shared_prefs
cat com.checkin.mobile_preferences.xml
```

---

## 🐛 Известные проблемы

### 1. Certificate Pinning
**Проблема:** Placeholder hashes (`AAA...`, `BBB...`) не соответствуют реальному сертификату.  
**Решение:** Получить реальный сертификат от сервера и обновить hashes в `NetworkModule.kt`.

### 2. Play Integrity API
**Проблема:** `cloudProjectNumber` захардкожен как `123456789L`.  
**Решение:** Заменить на реальный Cloud Project Number из Firebase Console.

### 3. Battery Level
**Проблема:** Симуляция разряда батареи (всегда 100% при первом запуске).  
**Решение:** Для production — подключить внешний ADC или использовать реальный датчик.

---

## ✅ Критерии приёмки

- [ ] Авторизация работает (login + token refresh)
- [ ] PIN setup и повторный вход по PIN
- [ ] Биометрическая аутентификация
- [ ] BLE сканирование с whitelist фильтрацией
- [ ] PresenceAlgorithm определяет присутствие
- [ ] Синхронизация данных работает
- [ ] Фрод-контроль (root, emulator, mock BLE)
- [ ] Logout работает
- [ ] Foreground Service работает
- [ ] Boot Completed запускает сервис
- [ ] SelfWatchdog перезапускает сервис
- [ ] Device fingerprint передаётся в API
- [ ] AuthInterceptor обрабатывает 401/403

---

**Статус:** Готово к тестированию  
**Следующий шаг:** Собрать APK и протестировать на Samsung Galaxy A70
