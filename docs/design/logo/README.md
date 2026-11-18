# 🎨 Логотип проекта "Контроль присутствия"

## ✅ Финальный логотип

**Файл:** `logo.svg` (1092×1092)

### Описание

Логотип состоит из трёх элементов:

1. **📍 Map Pin (локация)** — символизирует контроль присутствия
   - Голубой градиент (#4ECDC4 → #45B7D1)
   - Плавные скруглённые формы

2. **✅ Check Mark (галочка)** — символизирует подтверждение/отметку
   - Белый цвет
   - Круглая подложка с прозрачностью

3. **⚙️ Gear (шестерёнка)** — символизирует техническое обслуживание/инженерию
   - Контурный стиль (outline)
   - Тёмно-синий цвет (#2C3E50)
   - 12 зубцов
   - Внутренний круг и центральное отверстие

---

## 📁 Файлы

| Файл | Размер | Назначение |
|------|--------|-----------|
| `logo.svg` | 1092×1092 | Основной файл (масштабируемый) |
| `logo-final-original.svg` | 512×512 | Синий вариант (альтернатива) |
| `logo-final-green.svg` | 512×512 | Зелёный вариант (альтернатива) |

---

## 🎨 Цветовая палитра

```css
--logo-primary: #4ECDC4;      /* Светлый бирюзовый (верх pin) */
--logo-secondary: #45B7D1;    /* Голубой (низ pin) */
--logo-accent: #2C3E50;       /* Тёмно-синий (шестерёнка) */
--logo-white: #FFFFFF;        /* Белый (галочка, фон) */
```

---

## 📱 Использование

### Web приложение

```html
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/logo.svg" />

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" href="/logo-192.png" />

<!-- OG Image -->
<meta property="og:image" content="/logo-512.png" />
```

### Android приложение

```xml
<!-- res/mipmap-anydpi-v26/ic_launcher.xml -->
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

**Рекомендуемые размеры:**
- 512×512 - Google Play Store
- 192×192 - Android launcher (xxxhdpi)
- 144×144 - xxhdpi
- 96×96 - xhdpi
- 72×72 - hdpi
- 48×48 - mdpi

### iOS приложение

**Рекомендуемые размеры:**
- 1024×1024 - App Store
- 180×180 - iPhone (@3x)
- 120×120 - iPhone (@2x)
- 167×167 - iPad Pro (@2x)
- 152×152 - iPad (@2x)

---

## 🔧 Конвертация в PNG

### Использование ImageMagick

```bash
# Конвертация SVG в PNG (512×512)
convert logo.svg -resize 512x512 logo-512.png

# Конвертация в разные размеры
convert logo.svg -resize 192x192 logo-192.png
convert logo.svg -resize 64x64 logo-64.png
convert logo.svg -resize 32x32 logo-32.png
```

### Использование Inkscape

```bash
# Экспорт в PNG
inkscape logo.svg --export-png=logo-512.png --export-width=512 --export-height=512
```

---

## ✅ Рекомендации по использованию

### ✅ Делать

- Использовать SVG для web (масштабируемость)
- Использовать PNG для мобильных приложений
- Соблюдать минимальные размеры
- Использовать белый или светлый фон
- Сохранять пропорции

### ❌ Не делать

- Не растягивать логотип
- Не менять цвета без необходимости
- Не добавлять эффекты (тени, градиенты) к готовому логотипу
- Не размещать на тёмном фоне без контрастной рамки
- Не использовать в размере меньше минимального

---

## 📐 Минимальные размеры

| Контекст | Минимальный размер |
|----------|-------------------|
| Печать | 25×25 мм |
| Web | 32×32 px |
| Mobile | 24×24 dp |
| Favicon | 16×16 px |

---

## 📝 Лицензия

Логотип создан для проекта "Контроль присутствия"  
© 2026 Все права защищены
