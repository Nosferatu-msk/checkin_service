# Статус сборки APK

**Дата:** 11.11.2026  
**Версия:** 1.0.0  
**Статус:** ⚠️ Требуется Android Studio для сборки

---

## 📊 Текущий статус

| Компонент | Статус | Примечания |
|-----------|--------|------------|
| **Исходный код** | ✅ Готов | Все файлы на месте |
| **Gradle конфигурация** | ✅ Готов | build.gradle.kts настроен |
| **Gradle Wrapper** | ⚠️ Частично | Создан gradle-wrapper.properties, но нет gradlew |
| **Android SDK** | ❌ Не настроен | Требуется Android Studio |
| **APK** | ❌ Не собран | Требуется сборка через Android Studio |

---

## 🚀 Что нужно для сборки

### Вариант 1: Android Studio (рекомендуется)

**Требования:**
- Android Studio (последняя версия)
- Android SDK (устанавливается вместе с Android Studio)
- JDK 17 (устанавливается вместе с Android Studio)

**Инструкция:**
См. `docs/qa/android-studio-build-guide.md`

**Время сборки:** 10-15 минут (включая синхронизацию Gradle)

### Вариант 2: Command Line (если есть Android SDK)

**Требования:**
- Android SDK
- Gradle 8.2+
- JDK 17

**Команды:**
```bash
# Установить Gradle wrapper
gradle wrapper

# Собрать Debug APK
./gradlew assembleDebug

# APK будет здесь:
# mobile/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📁 Созданные файлы

1. **`mobile/gradle/wrapper/gradle-wrapper.properties`** — конфигурация Gradle wrapper
2. **`docs/qa/android-studio-build-guide.md`** — подробная инструкция по сборке через Android Studio

---

## 📋 Чеклист перед сборкой

### Проверить:
- [ ] Android Studio установлен
- [ ] Android SDK настроен
- [ ] JDK 17 установлен
- [ ] Переменная `ANDROID_HOME` указывает на SDK
- [ ] Устройство подключено по USB
- [ ] Отладка по USB включена на устройстве

### После сборки:
- [ ] APK собран без ошибок
- [ ] APK установлен на устройство
- [ ] Приложение запускается
- [ ] Авторизация работает (testic@test.ru / hello2026)

---

## 🎯 Следующие шаги

### 1. Установить Android Studio
Скачать: https://developer.android.com/studio

### 2. Открыть проект
```
File → Open → C:\vibe_coding\checkin_service\mobile
```

### 3. Синхронизировать Gradle
Дождаться завершения синхронизации (5-10 минут)

### 4. Собрать APK
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### 5. Установить на устройство
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 6. Протестировать
Использовать чеклист: `docs/qa/mobile-app-testing-checklist.md`

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверить логи в Android Studio (`Logcat`)
2. Проверить `build.gradle.kts` на ошибки
3. Очистить кэш: `File` → `Invalidate Caches / Restart`
4. Проверить `docs/qa/android-studio-build-guide.md`

---

**Статус:** ⚠️ **Требуется Android Studio для сборки APK**

**Готовность кода:** 95% ✅  
**Готовность к сборке:** 80% ⚠️ (нужен Android Studio)
