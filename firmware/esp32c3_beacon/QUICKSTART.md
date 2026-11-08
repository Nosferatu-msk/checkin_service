# Quick Start — Прошивка ESP32-C3 BLE Маяк

## Что вам нужно

1. **Плата ESP32-C3 Super Mini**
2. **USB кабель** (USB-C или Micro-USB, зависит от платы)
3. **Компьютер** с Windows/macOS/Linux
4. **Телефон** с nRF Connect (для проверки)

## Шаг 1: Установите PlatformIO

1. Установите [VS Code](https://code.visualstudio.com/)
2. Откройте VS Code → Extensions (Ctrl+Shift+X)
3. Найдите и установите **"PlatformIO IDE"**
4. Перезапустите VS Code

## Шаг 2: Откройте проект

1. VS Code → File → Open Folder
2. Выберите папку: `firmware/esp32c3_beacon`
3. PlatformIO автоматически инициализирует проект

## Шаг 3: Подключите плату

1. Подключите ESP32-C3 к USB порту
2. Если плата в режиме bootloader, зажмите кнопку **BOOT** перед подключением
3. PlatformIO должен определить COM порт автоматически

## Шаг 4: Прошейте плату

Нажмите кнопку **"Upload" (→)** в нижней панели VS Code

Или через терминал:
```bash
cd firmware/esp32c3_beacon
pio run --target upload
```

## Шаг 5: Откройте Serial Monitor

Нажмите **"Serial Monitor" (🔌)** или:
```bash
pio device monitor
```

Вы увидите:
```
╔═══════════════════════════════════╗
║   ESP32-C3 BLE Beacon v1.0.0     ║
║   CheckIn Service Project         ║
╚═══════════════════════════════════╝

=== Beacon Configuration ===
UUID: 00010203-0405-0607-0809-0A0B0C0D0E0F
Major: 0
Minor: 0
TX Power: -59 dBm
Interval: 1000 ms
===========================

[READY] Beacon is running!
```

## Шаг 6: Проверьте с телефона

1. Установите **nRF Connect** на телефон
2. Включите Bluetooth
3. Нажмите **Scan**
4. Найдите устройство с именем **"CheckIn-Beacon"**
5. Вы увидите iBeacon пакет:
   - UUID: `00010203-0405-0607-0809-0A0B0C0D0E0F`
   - Major: 0
   - Minor: 0

## Шаг 7: Настройте маяк

### Вариант А: Через nRF Connect (телефон)

1. В nRF Connect нажмите **CONNECT**
2. Найдите сервис `12345678-1234-1234-1234-123456789abc`
3. Для записи Major:
   - Нажмите на characteristic `...ab2` (Major)
   - Нажмите иконку "Write" (карандаш)
   - Введите значение (например, `00 01` для Major=1)
   - Нажмите **SEND**
4. Аналогично для Minor, UUID, TX Power

### Вариант Б: Через Python скрипт (ПК)

```bash
# Установите зависимость
pip install bleak

# Запустите конфигуратор
cd firmware/esp32c3_beacon/tools
python beacon_configurator.py
```

Интерактивное меню:
```
📝 Commands:
  1. Set UUID
  2. Set Major
  3. Set Minor
  4. Set TX Power
  5. Set Interval
  6. Read current config
  7. Reset to defaults
  8. Quick setup (object/zone)
  0. Exit
```

Выберите **8** для быстрой настройки:
```
  Quick Setup:
  Default UUID: E2C56DB5-DFFB-48D2-B060-D0F5A71096E0
  Object ID (Major, 0-65535): 1
  Zone ID (Minor, 0-65535): 100
  
  ✅ Beacon configured: Object=1, Zone=100
```

## Готово!

Теперь маяк транслирует iBeacon с вашими настройками. Все настройки сохранены в NVS и переживают перезагрузку.

## Рекомендации для тестирования

### Настройка партии маяков

Для тестирования системы с несколькими маяками:

| Маяк | Major | Minor | Зона |
|------|-------|-------|------|
| #1   | 1     | 100   | Вход |
| #2   | 1     | 200   | Кабинет 1 |
| #3   | 1     | 300   | Кабинет 2 |
| #4   | 1     | 400   | Склад |

### Рекомендуемые параметры

- **UUID:** `E2C56DB5-DFFB-48D2-B060-D0F5A71096E0` (стандартный iBeacon UUID)
- **Major:** ID объекта/здания (0-65535)
- **Minor:** ID зоны/помещения (0-65535)
- **TX Power:** -59 dBm (калибровка на 1 метр)
- **Interval:** 1000 мс (для помещений с высокой проходимостью)

## Устранение проблем

### Плата не определяется
- Попробуйте другой USB кабель
- Зажмите BOOT при подключении
- Установите драйверы CP2102 или CH340 (зависит от платы)

### Маяк не виден в nRF Connect
- Убедитесь, что Bluetooth включен
- Подойдите ближе (1-2 метра)
- Перезагрузите плату (отключите и подключите питание)

### Настройки не сохраняются
- Проверьте, что запись в NVS успешна (смотрите Serial Monitor)
- Попробуйте сброс к заводским настройкам (characteristic `...ab8`, значение `0xAA`)

## Следующие шаги

1. Зарегистрируйте маяк в админ-панели (MAC-адрес + UUID)
2. Настройте мобильное приложение для сканирования этого UUID
3. Протестируйте определение присутствия
4. При необходимости настройте несколько маяков с разными Major/Minor

## Дополнительная информация

- [Полная документация](README.md)
- [ТЗ на BLE-маяк](../../docs/intent/02_TEZ_Beacon.md)
- [ТЗ на мобильное приложение](../../docs/intent/01_TEZ_Mobile_App.md)
