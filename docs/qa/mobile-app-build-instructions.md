# Инструкция по сборке и тестированию мобильного приложения

**Дата:** 11.11.2026  
**Версия:** 1.0.0

---

## 📦 Сборка APK

### Вариант 1: Через Android Studio (рекомендуется)

1. **Открыть проект в Android Studio:**
   ```
   File → Open → C:\vibe_coding\checkin_service\mobile
   ```

2. **Синхронизировать Gradle:**
   ```
   File → Sync Project with Gradle Files
   ```

3. **Собрать Debug APK:**
   ```
   Build → Build Bundle(s) / APK(s) → Build APK(s)
   ```

4. **Найти APK:**
   ```
   mobile/app/build/outputs/apk/debug/app-debug.apk
   ```

5. **Установить на устройство:**
   ```bash
   adb install app-debug.apk
   ```

### Вариант 2: Через командную строку (если есть Gradle wrapper)

```bash
cd C:\vibe_coding\checkin_service\mobile

# Создать Gradle wrapper (если отсутствует)
gradle wrapper

# Собрать Debug APK
./gradlew assembleDebug

# Установить на устройство
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Вариант 3: Через EAS Build (облачная сборка)

**Требует Expo CLI и настройки проекта.**

---

## 🧪 Тестирование на устройстве

### Подготовка устройства

1. **Включить режим разработчика:**
   - Настройки → О телефоне → Тапнуть по "Номер сборки" 7 раз

2. **Включить отладку по USB:**
   - Настройки → Система → Для разработчиков → Отладка по USB

3. **Подключить устройство:**
   ```bash
   adb devices
   # Должно появиться ваше устройство
   ```

### Установка приложения

```bash
# Установить APK
adb install app-debug.apk

# Или переустановить (если уже установлено)
adb install -r app-debug.apk
```

### Запуск приложения

```bash
# Запустить приложение
adb shell am start -n com.checkin.mobile/.presentation.MainActivity

# Остановить приложение
adb shell am force-stop com.checkin.mobile
```

---

## 🔍 Отладка

### Просмотр логов

```bash
# Все логи приложения
adb logcat | grep "com.checkin.mobile"

# Только ошибки
adb logcat *:E | grep "com.checkin.mobile"

# Конкретный тег
adb logcat -s BleManager:D
adb logcat -s AuthRepository:D
adb logcat -s TokenManager:D
```

### Проверка базы данных

```bash
# Скопировать базу данных с устройства (требуется root)
adb exec-out run-as com.checkin.mobile cat databases/checkin.db > checkin.db

# Открыть в DB Browser for SQLite
```

### Проверка SharedPreferences

```bash
# Проверить токены (требуется root)
adb shell
run-as com.checkin.mobile
cd shared_prefs
cat com.checkin.mobile_preferences.xml
```

### Очистка данных приложения

```bash
# Очистить данные приложения
adb shell pm clear com.checkin.mobile
```

---

## 📋 Тестовые сценарии

См. `docs/qa/mobile-app-testing-checklist.md`

---

## 🐛 Типичные проблемы

### 1. Certificate Pinning Error
**Симптом:** Ошибка подключения к API  
**Решение:** Обновить certificate hashes в `NetworkModule.kt` или временно отключить pinning для тестирования

### 2. BLE не работает
**Симптом:** Маяки не обнаруживаются  
**Решение:**
- Проверить разрешения (Location, Bluetooth)
- Включить Bluetooth и Location на устройстве
- Проверить, что маяк включён и рекламирует

### 3. Синхронизация не работает
**Симптом:** Данные не отправляются на сервер  
**Решение:**
- Проверить подключение к интернету
- Проверить валидность токенов
- Проверить логи SyncWorker

### 4. Фрод-контроль блокирует вход
**Симптом:** Ошибка "Rooted device detected" или "Emulator detected"  
**Решение:**
- Тестировать на реальном устройстве (не эмуляторе)
- Использовать нерутированное устройство

---

## 📊 Мониторинг

### Проверка Foreground Service

```bash
# Проверить, запущен ли сервис
adb shell dumpsys activity services com.checkin.mobile
```

### Проверка WorkManager

```bash
# Проверить запланированные задачи
adb shell dumpsys job scheduler com.checkin.mobile
```

---

## ✅ Критерии приёмки

- [ ] APK собирается без ошибок
- [ ] Приложение устанавливается на Samsung Galaxy A70
- [ ] Авторизация работает (testic@test.ru / hello2026)
- [ ] PIN setup и повторный вход
- [ ] BLE сканирование обнаруживает маяки
- [ ] Синхронизация данных работает
- [ ] Foreground Service работает
- [ ] Фрод-контроль работает

---

**Готово к тестированию!** 🚀
