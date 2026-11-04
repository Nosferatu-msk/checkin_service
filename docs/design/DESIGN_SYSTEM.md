# Дизайн-система: Контроль присутствия

**Версия:** 1.0  
**Дата:** 04.11.2026  
**Тема:** Emerald (Изумрудный)  
**Платформы:** Web (React + Ant Design), Mobile (Android/Kotlin)

---

## 📋 Содержание

1. [Цветовая палитра](#цветовая-палитра)
2. [Типографика](#типографика)
3. [Отступы и размеры](#отступы-и-размеры)
4. [Компоненты](#компоненты)
5. [Иконки](#иконки)
6. [Примеры использования](#примеры-использования)

---

## 🎨 Цветовая палитра

### Primary Colors (Emerald)

Основной цвет бренда — **Emerald 500** (`#10b981`).

| Токен | HEX | RGB | Использование |
|-------|-----|-----|---------------|
| `primary-50` | `#ecfdf5` | 236, 253, 245 | Светлый фон для акцентов |
| `primary-100` | `#d1fae5` | 209, 250, 229 | Фон для status badges |
| `primary-200` | `#a7f3d0` | 167, 243, 208 | Hover состояния |
| `primary-300` | `#6ee7b7` | 110, 231, 183 | Light акценты |
| `primary-400` | `#34d399` | 52, 211, 153 | Light кнопки |
| **`primary-500`** | **`#10b981`** | **16, 185, 129** | **Основной цвет бренда** |
| `primary-600` | `#059669` | 5, 150, 105 | Hover/Active состояния |
| `primary-700` | `#047857` | 4, 120, 87 | Темные акценты |
| `primary-800` | `#065f46` | 6, 95, 70 | Текст на светлом фоне |
| `primary-900` | `#064e3b` | 6, 78, 59 | Самый темный |

### Neutral Colors

| Токен | HEX | Использование |
|-------|-----|---------------|
| `neutral-50` | `#f9fafb` | Фон страницы |
| `neutral-100` | `#f3f4f6` | Фон карточек |
| `neutral-200` | `#e5e7eb` | Границы, разделители |
| `neutral-300` | `#d1d5db` | Border для inputs |
| `neutral-400` | `#9ca3af` | Placeholder текст |
| `neutral-500` | `#6b7280` | Вторичный текст |
| `neutral-600` | `#4b5563` | Основной текст |
| `neutral-700` | `#374151` | Заголовки |
| `neutral-800` | `#1f2937` | Темный текст |
| `neutral-900` | `#111827` | Самый темный |

### Semantic Colors

| Токен | HEX | Назначение |
|-------|-----|------------|
| `success-500` | `#10b981` | Успех, подтверждение |
| `warning-500` | `#f59e0b` | Предупреждение |
| `error-500` | `#ef4444` | Ошибка, опасность |
| `info-500` | `#3b82f6` | Информация |

---

## 📝 Типографика

**Шрифт:** Системный стек
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, sans-serif;
```

### Размеры шрифтов

| Токен | Размер | Вес | Использование |
|-------|--------|-----|---------------|
| `font-size-4xl` | 36px | 700 | Заголовки страниц |
| `font-size-3xl` | 30px | 600 | Заголовки разделов |
| `font-size-2xl` | 24px | 600 | Заголовки карточек |
| `font-size-xl` | 20px | 500 | Подзаголовки |
| `font-size-lg` | 18px | 400 | Увеличенный текст |
| `font-size-base` | 16px | 400 | Основной текст (body) |
| `font-size-sm` | 14px | 400 | Вспомогательный текст |
| `font-size-xs` | 12px | 400 | Мелкий текст, подписи |

### Примеры

```css
/* Заголовок страницы */
h1 {
  font-size: 36px;
  font-weight: 700;
  color: #111827;
}

/* Основной текст */
body {
  font-size: 16px;
  font-weight: 400;
  color: #4b5563;
  line-height: 1.5;
}

/* Подпись */
.caption {
  font-size: 12px;
  color: #6b7280;
}
```

---

## 📏 Отступы и размеры

### Spacing Scale

| Токен | Значение | Использование |
|-------|----------|---------------|
| `spacing-1` | 4px | Минимальные отступы |
| `spacing-2` | 8px | Отступы между элементами |
| `spacing-3` | 12px | Padding в кнопках |
| `spacing-4` | 16px | Стандартный padding |
| `spacing-5` | 20px | Увеличенный padding |
| `spacing-6` | 24px | Padding карточек |
| `spacing-8` | 32px | Section padding |
| `spacing-10` | 40px | Большие отступы |
| `spacing-12` | 48px | Section margins |

### Border Radius

| Токен | Значение | Использование |
|-------|----------|---------------|
| `radius-sm` | 6px | Маленькие элементы (badges) |
| `radius-md` | 8px | Кнопки, inputs |
| `radius-lg` | 12px | Карточки |
| `radius-xl` | 16px | Большие карточки, модальные окна |
| `radius-full` | 9999px | Круглые элементы |

### Shadows

| Токен | Значение | Использование |
|-------|----------|---------------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Карточки в покое |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Hover состояния |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Dropdowns, modals |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Большие модальные окна |

---

## 🧩 Компоненты

### Кнопки

#### Primary Button
```css
.btn-primary {
  background: #10b981;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: white;
  color: #374151;
  padding: 12px 24px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}
```

#### Размеры кнопок
```css
.btn-sm { padding: 8px 16px; font-size: 12px; }
.btn-base { padding: 12px 24px; font-size: 14px; }
.btn-lg { padding: 16px 32px; font-size: 16px; }
```

### Карточки

```css
.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border: 1px solid #e5e7eb;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}
```

### Поля ввода

```css
.input {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  background: white;
}

.input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px #d1fae5;
}

.input::placeholder {
  color: #9ca3af;
}
```

### Status Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-error {
  background: #fee2e2;
  color: #991b1b;
}
```

---

## 🎯 Иконки

### Стиль: Outlined (Тонкие линии)

**Характеристики:**
- Stroke width: `1.5px`
- Fill: `none`
- Color: `#10b981` (primary-500)
- ViewBox: `0 0 24 24`

### Основные иконки

| Иконка | SVG | Использование |
|--------|-----|---------------|
| Маяк | `<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83..."/>` | BLE-устройство |
| Сотрудник | `<circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>` | Пользователь |
| Объект | `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18..."/>` | Здание/помещение |
| Договор | `<path d="M14 2H6a2 2 0 0 0-2 2v16..."/><polyline points="14 2 14 8 20 8"/>` | Документ |
| Подтвердить | `<polyline points="20 6 9 17 4 12"/>` | Успех, готово |
| Отменить | `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>` | Закрыть, отмена |
| Настройки | `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82..."/>` | Настройки |
| Уведомления | `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>` | Алерты, уведомления |

### Дополнительные иконки

| Иконка | Описание |
|--------|----------|
| Поиск | Лупа (circle + line) |
| Добавить | Плюс (line + line) |
| Удалить | Корзина (polyline + path) |
| Редактировать | Карандаш (path + path) |
| Просмотр | Глаз (path + circle) |
| Безопасность | Замок (rect + path) |
| Активность | Импульс (polyline) |
| Время | Часы (circle + polyline) |

### Размеры иконок

```css
.icon-sm { width: 16px; height: 16px; }      /* Маленькие (в тексте) */
.icon-base { width: 24px; height: 24px; }    /* Базовые (в кнопках) */
.icon-lg { width: 32px; height: 32px; }      /* Большие (в карточках) */
.icon-xl { width: 48px; height: 48px; }      /* Очень большие (акценты) */
```

### Пример использования (React)

```jsx
// Компонент иконки
const Icon = ({ name, size = 24, color = '#10b981' }) => {
  const icons = {
    beacon: (
      <svg viewBox="0 0 24 24" width={size} height={size} stroke={color} strokeWidth="1.5" fill="none">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" width={size} height={size} stroke={color} strokeWidth="1.5" fill="none">
        <circle cx="12" cy="8" r="4"/>
        <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
      </svg>
    ),
    // ... другие иконки
  };
  
  return icons[name] || null;
};

// Использование
<Icon name="beacon" size={32} />
<Icon name="user" size={24} color="#059669" />
```

### Преимущества Outlined стиля

✓ **Современный вид** — тонкие линии создают легкий, профессиональный стиль  
✓ **Масштабируемость** — отлично читаются в размерах от 16px до 48px  
✓ **Универсальность** — подходят для SaaS, корпоративных и consumer-приложений  
✓ **Популярность** — используются в Ant Design, Material Icons, Feather Icons

---

## 📱 Мобильные компоненты

### Touch Targets
- **Минимальный размер:** 48x48dp (Android)
- **Рекомендуемый размер:** 56x56dp для основных действий

### Bottom Navigation
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-around;
  align-items: center;
}
```

### Mobile Cards
```css
.mobile-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
}
```

---

## 💡 Примеры использования

### Web: Карточка объекта

```jsx
<Card>
  <CardHeader>
    <CardTitle>Объект "Бизнес-центр"</CardTitle>
    <Badge status="success">Активен</Badge>
  </CardHeader>
  <CardContent>
    <Text>г. Москва, ул. Примерная, д. 1</Text>
    <Text>12 зон • 48 маяков • 24 сотрудника</Text>
  </CardContent>
  <CardFooter>
    <Button variant="secondary">Подробнее</Button>
  </CardFooter>
</Card>
```

### Mobile: Список маяков

```kotlin
LazyColumn {
    items(beacons) { beacon ->
        MobileCard(
            title = beacon.name,
            subtitle = "Заряд: ${beacon.batteryLevel}%",
            status = if (beacon.batteryLevel < 15) Status.Warning else Status.Success
        )
    }
}
```

---

## 🎨 Figma ресурсы

**Ссылка на Figma:** [Будет добавлена после создания]

### Структура Figma-файла:
- **Colors** — все цветовые токены
- **Typography** — стили текста
- **Components** — библиотеки компонентов
- **Icons** — набор иконок
- **Mobile Screens** — макеты мобильных экранов
- **Web Screens** — макеты веб-интерфейса

---

## 📚 Дополнительные ресурсы

- **HTML-превью:** `design-system-emerald.html`
- **Сравнение вариантов:** `design-system-comparison.html`
- **Ant Design документация:** https://ant.design/docs/react/customize-theme

---

## 🔄 Обновления

| Версия | Дата | Изменения |
|--------|------|-----------|
| 1.0 | 04.11.2026 | Первоначальная версия (Emerald theme) |

---

**Создано:** 04.11.2026  
**Автор:** Дизайн-система для проекта "Контроль присутствия"
