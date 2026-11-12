# Инструкция по сборке APK через Android Studio

**Дата:** 11.11.2026  
**Версия приложения:** 1.0.0

---

## 📋 Требования

1. **Android Studio** (последняя версия)
   - Скачать: https://developer.android.com/studio

2. **Android SDK**
   - Устанавливается вместе с Android Studio
   - Минимальная версия: Android 8.0 (API 26)
   - Целевая версия: Android 14 (API 34)

3. **JDK 17**
   - Устанавливается вместе с Android Studio

---

## 🚀 Пошаговая инструкция

### Шаг 1: Открыть проект в Android Studio

1. Запустить Android Studio
2. `File` → `Open`
3. Выбрать папку: `C:\vibe_coding\checkin_service\mobile`
4. Нажать `OK`

### Шаг 2: Синхронизация Gradle

1. Android Studio автоматически начнёт синхронизацию
2. Дождаться завершения (может занять 5-10 минут)
3. Если есть ошибки — проверить интернет-соединение и настройки прокси

### Шаг 3: Проверка конфигурации

**Открыть настройки проекта:**
1. `File` → `Project Structure` (или нажать `Ctrl+Alt+Shift+S`)
2. В открывшемся окне выбрать `SDK Location` в левом меню

**Проверить следующие поля:**

| Поле | Описание | Пример пути |
|------|----------|-------------|
| **Android SDK location** | Путь к Android SDK | `C:\Users\YourUser\AppData\Local\Android\Sdk` |
| **JDK location** | Путь к JDK 17 | `C:\Program Files\Android\Android Studio\jbr` |

**Где найти JDK location:**

В новых версиях Android Studio (Iguana и новее) JDK поставляется вместе с Android Studio и называется **JetBrains Runtime (JBR)**.

**Типичные пути:**
- **Windows:** `C:\Program Files\Android\Android Studio\jbr`
- **macOS:** `/Applications/Android Studio.app/Contents/jbr/Contents/Home`
- **Linux:** `/opt/android-studio/jbr`

**Если JDK не найден:**
1. Android Studio покажет красное предупреждение
2. Нажать кнопку `Download JDK`
3. В выпадающем меню выбрать версию **17**
4. Нажать `OK` и дождаться загрузки

**Альтернативный способ (через Settings):**
1. `File` → `Settings` (или `Ctrl+Alt+S`)
2. `Build, Execution, Deployment` → `Build Tools` → `Gradle`
3. В поле `Gradle JDK` выбрать JDK 17

### Шаг 4: Сборка Debug APK

1. `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. Дождаться завершения сборки (2-5 минут)
3. Внизу появится уведомление: "Build completed successfully"

### Шаг 5: Найти APK

APK будет здесь:
```
C:\vibe_coding\checkin_service\mobile\app\build\outputs\apk\debug\app-debug.apk
```

### Шаг 6: Установка на устройство

**Подготовить устройство:**
1. Включить режим разработчика:
   - Настройки → О телефоне → Тапнуть по "Номер сборки" 7 раз
2. Включить отладку по USB:
   - Настройки → Система → Для разработчиков → Отладка по USB
3. Подключить устройство по USB

**Установить APK:**
```bash
# Проверить подключение устройства
adb devices

# Установить APK
adb install C:\vibe_coding\checkin_service\mobile\app\build\outputs\apk\debug\app-debug.apk

# Или переустановить (если уже установлено)
adb install -r app-debug.apk
```

### Шаг 7: Запуск приложения

```bash
# Запустить приложение
adb shell am start -n com.checkin.mobile/.presentation.MainActivity

# Или просто открыть приложение на устройстве
```

---

## 🧪 Тестирование

### Тестовые данные для входа:
- **Email:** testic@test.ru
- **Пароль:** hello2026

### Чеклист тестирования:
См. `docs/qa/mobile-app-testing-checklist.md`

### Просмотр логов:
```bash
# Все логи приложения
adb logcat | grep "com.checkin.mobile"

# Только ошибки
adb logcat *:E | grep "com.checkin.mobile"

# Конкретный тег
adb logcat -s BleManager:D
```

---

## 🐛 Типичные проблемы

### 1. "SDK location not found"
**Решение:**
- `File` → `Project Structure` → `SDK Location`
- Указать путь к Android SDK

### 2. "Gradle sync failed"
**Решение:**
- Проверить интернет-соединение
- `File` → `Invalidate Caches / Restart`
- Удалить папку `.gradle` и повторить синхронизацию

### 3. "Installation failed - INSTALL_FAILED_TEST_ONLY"
**Решение:**
```bash
adb install -t app-debug.apk
```

### 4. "Certificate pinning error"
**Решение:**
- Временно отключить certificate pinning в `NetworkModule.kt` для тестирования
- Или получить реальный сертификат от сервера

---

## 📊 Мониторинг

### Проверка Foreground Service
```bash
adb shell dumpsys activity services com.checkin.mobile
```

### Проверка WorkManager
```bash
adb shell dumpsys job scheduler com.checkin.mobile
```

### Очистка данных приложения
```bash
adb shell pm clear com.checkin.mobile
```

---

## ✅ Критерии успешной сборки

- [ ] Android Studio открывает проект без ошибок
- [ ] Gradle sync завершается успешно
- [ ] Build APK завершается успешно
- [ ] APK устанавливается на устройство
- [ ] Приложение запускается
- [ ] Авторизация работает (testic@test.ru / hello2026)

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверить логи в Android Studio (`Logcat`)
2. Проверить `build.gradle.kts` на ошибки
3. Очистить кэш: `File` → `Invalidate Caches / Restart`

---

**Готово к сборке!** 🚀
