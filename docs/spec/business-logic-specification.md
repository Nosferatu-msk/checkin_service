# Business Logic Specification — Контроль присутствия

**Версия:** 1.0  
**Дата:** 04.11.2026

---

## 1. Обзор бизнес-логики

### 1.1. Основные процессы

```
┌──────────────────────────────────────────────────────────────┐
│                     МОБИЛЬНОЕ ПРИЛОЖЕНИЕ                      │
│  1. Сканирование BLE маяков                                   │
│  2. Агрегация данных (каждые 10 минут)                       │
│  3. Отправка на сервер                                        │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                         СЕРВЕР                                │
│  4. Приём сырых данных (attendance_raw)                      │
│  5. Расчёт присутствия (attendance_calculated)               │
│  6. Проверка SLA (requirement_violations)                    │
│  7. Детекция фрода (fraud_logs)                              │
│  8. Отправка уведомлений                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Алгоритм расчёта присутствия

### 2.1. Входные данные

**Таблица:** `attendance_raw`

**Период обработки:** каждые 10 минут (настраивается)

**Фильтр:**
```sql
WHERE synced_at >= NOW() - INTERVAL '10 minutes'
  AND scan_timestamp_start >= NOW() - INTERVAL '24 hours'
  AND scan_timestamp_end <= NOW() + INTERVAL '5 minutes'
```

### 2.2. Алгоритм (ИСПРАВЛЕННЫЙ)

```python
def process_raw_attendance(raw_records):
    """
    Обработка сырых записей и расчёт присутствия.
    ИСПРАВЛЕНО: Добавлены проверки из ТЗ
    """
    # Группировка по user_id и beacon_uuid
    grouped = group_by(raw_records, key=['user_id', 'beacon_uuid'])
    
    for (user_id, beacon_uuid), records in grouped.items():
        # 1. Валидация (ИСПРАВЛЕНО: пропускаем невалидные записи, а не всю группу)
        valid_records = validate_records(records)
        if not valid_records:  # Пустой список
            continue
        
        # 2. Проверка минимального количества замеров (НОВОЕ из ТЗ)
        if len(valid_records) < 3:
            log_info(f"Insufficient samples for user {user_id}, beacon {beacon_uuid}")
            continue
        
        # 3. Определение зоны и проверка активности маяка (НОВОЕ из ТЗ)
        beacon = get_beacon_by_uuid(beacon_uuid)
        if not beacon:
            log_warning(f"Beacon not found: {beacon_uuid}")
            continue
        
        if not beacon.is_active:
            log_info(f"Beacon {beacon_uuid} is inactive, skipping")
            continue
        
        # 4. Проверка MAC-адреса для защиты от клонирования (ИСПРАВЛЕНО: Проблема B)
        # Проверяем ВСЕ записи, а не только первую
        for record in valid_records:
            if beacon.mac_address and record.mac_address != beacon.mac_address:
                log_fraud_event('beacon_clone_detected', {
                    'beacon_uuid': beacon_uuid,
                    'expected_mac': beacon.mac_address,
                    'actual_mac': record.mac_address,
                    'user_id': user_id,
                    'timestamp': record.scan_timestamp_start
                })
                # Не прерываем обработку, но логируем инцидент
                break
        
        zone = get_zone_by_id(beacon.zone_id)
        
        # 5. Расчёт времени присутствия (ИСПРАВЛЕНО: сумма интервалов, не разность)
        # Группировка по сессиям (5-минутное окно)
        sessions = group_by_sessions(valid_records, gap_minutes=5)
        
        for session in sessions:
            enter_time = min(r.scan_timestamp_start for r in session)
            exit_time = max(r.scan_timestamp_end for r in session)
            
            # ИСПРАВЛЕНО (Проблема A): Используем время сессии, а не сумму интервалов
            # Это учитывает фактическое время присутствия, включая промежутки между сканами
            duration_minutes = (exit_time - enter_time).total_seconds() / 60
            
            # 6. Расчёт RSSI с фильтрацией выбросов (НОВОЕ из ТЗ)
            avg_rssi = calculate_filtered_rssi(session)
            
            # 7. Проверка порога RSSI (ИСПРАВЛЕНО: наследование от родителя)
            threshold = zone.rssi_threshold or get_inherited_threshold(zone)
            if avg_rssi < threshold:
                log_info(f"RSSI below threshold for user {user_id} in zone {zone.id}")
                continue
            
            # 8. Сохранение рассчитанного присутствия
            save_attendance_calculated(
                user_id=user_id,
                zone_id=zone.id,
                enter_time=enter_time,
                exit_time=exit_time,
                duration_minutes=duration_minutes,
                avg_rssi=avg_rssi
            )
    
    return {"processed": len(grouped)}


def validate_records(records):
    """
    Валидация сырых записей.
    ИСПРАВЛЕНО: Пропускаем невалидные записи, а не возвращаем False
    ИСПРАВЛЕНО (Проблема D): Возвращаем пустой список вместо None
    """
    valid_records = []
    
    for record in records:
        # Проверка timestamps
        if record.scan_timestamp_end > NOW() + INTERVAL('5 minutes'):
            continue  # Timestamp из будущего — пропускаем
        
        if record.scan_timestamp_start < NOW() - INTERVAL('24 hours'):
            continue  # Timestamp старше 24 часов — пропускаем
        
        if record.scan_timestamp_start >= record.scan_timestamp_end:
            continue  # Некорректный диапазон — пропускаем
        
        # Проверка RSSI (ИСПРАВЛЕНО: разумный диапазон -100 до -30 dBm)
        if not (-100 <= record.median_rssi <= -30):
            continue  # Аномальный RSSI — пропускаем
        
        # Проверка fingerprint
        if not record.device_fingerprint_hash:
            continue  # Отсутствует fingerprint — пропускаем
        
        valid_records.append(record)
    
    return valid_records  # ИСПРАВЛЕНО: Возвращаем список (может быть пустым)


def calculate_filtered_rssi(records):
    """
    Расчёт RSSI с фильтрацией выбросов (НОВОЕ из ТЗ).
    Алгоритм:
    1. Отбросить крайние 10% значений
    2. Вычислить медиану
    """
    if not records:
        return 0
    
    # Сортировка по RSSI
    sorted_records = sorted(records, key=lambda r: r.median_rssi)
    
    # Отбрасываем крайние 10%
    trim_count = max(1, len(sorted_records) // 10)
    trimmed = sorted_records[trim_count:-trim_count] if len(sorted_records) > 2 else sorted_records
    
    # Вычисляем медиану
    middle = len(trimmed) // 2
    if len(trimmed) % 2 == 0:
        return (trimmed[middle - 1].median_rssi + trimmed[middle].median_rssi) / 2
    else:
        return trimmed[middle].median_rssi


def group_by_sessions(records, gap_minutes=5):
    """
    Группировка записей по сессиям (НОВОЕ из ТЗ).
    Если между двумя записями разрыв < 5 минут — считать одной сессией.
    """
    if not records:
        return []
    
    # Сортировка по времени входа
    sorted_records = sorted(records, key=lambda r: r.scan_timestamp_start)
    
    sessions = []
    current_session = [sorted_records[0]]
    
    for record in sorted_records[1:]:
        last_record = current_session[-1]
        gap = (record.scan_timestamp_start - last_record.scan_timestamp_end).total_seconds() / 60
        
        if gap <= gap_minutes:
            # Продолжение текущей сессии
            current_session.append(record)
        else:
            # Начало новой сессии
            sessions.append(current_session)
            current_session = [record]
    
    sessions.append(current_session)
    return sessions


def get_inherited_threshold(zone):
    """
    Наследование порога RSSI от родительской зоны (НОВОЕ из ТЗ).
    """
    if zone.rssi_threshold:
        return zone.rssi_threshold
    
    if zone.parent_zone_id:
        parent = get_zone_by_id(zone.parent_zone_id)
        return get_inherited_threshold(parent)
    
    # Дефолтное значение
    return -75.0
```

### 2.3. Выходные данные

**Таблица:** `attendance_calculated`

**Поля:**
- `user_id` — UUID сотрудника
- `zone_id` — UUID зоны
- `enter_time` — время входа в зону
- `exit_time` — время выхода из зоны
- `duration_minutes` — длительность присутствия (минуты)
- `avg_rssi` — средний RSSI

---

## 3. Проверка SLA

### 3.1. Расписание

**Cron:** каждые 5 минут  
**Время выполнения:** после расчёта присутствия

### 3.2. Алгоритм (ИСПРАВЛЕННЫЙ)

```python
def check_sla_compliance():
    """
    Проверка выполнения нормативов SLA.
    ИСПРАВЛЕНО: Проверка за ПРОШЕДШИЙ период, а не текущий
    """
    # Получение всех активных нормативов
    requirements = get_active_requirements()
    
    for requirement in requirements:
        # ИСПРАВЛЕНО: Определение периода проверки (ПРОШЕДШИЙ период)
        period_date = get_previous_period_date(requirement.period_type)
        
        # Проверка, нужно ли проверять сегодня
        if not should_check_today(requirement, period_date):
            continue
        
        # ИСПРАВЛЕНО: Проверка visits_count, а не min_employees
        unique_employees = get_unique_employees_count(
            zone_id=requirement.zone_id,
            period_date=period_date,
            min_duration_minutes=1  # Минимум 1 минута (из ТЗ)
        )
        
        # ИСПРАВЛЕНО: Сравнение с visits_count
        if unique_employees < requirement.visits_count:
            # Создание записи о нарушении
            violation = create_violation(
                requirement_id=requirement.id,
                period_date=period_date,
                required_count=requirement.visits_count,
                actual_count=unique_employees,
                deficit=requirement.visits_count - unique_employees
            )
            
            # Отправка уведомления куратору
            notify_curator(
                contract_id=requirement.contract_id,
                violation=violation
            )
            
            # Отправка уведомления администратору (если критично)
            if requirement.visits_count - unique_employees > 2:
                notify_admin(violation)
    
    return {"checked": len(requirements)}


def get_previous_period_date(period_type):
    """
    Получение даты ПРОШЕДШЕГО периода (ИСПРАВЛЕНО).
    """
    today = date.today()
    
    if period_type == 'daily':
        # Проверка за ВЧЕРА
        return today - timedelta(days=1)
    
    elif period_type == 'weekly':
        # Проверка за ПРОШЕДШУЮ неделю (пн-вс)
        # Запуск в ПОНЕДЕЛЬНИК 00:30
        last_monday = today - timedelta(days=today.weekday() + 7)
        return last_monday
    
    elif period_type == 'monthly':
        # Проверка за ПРОШЕДШИЙ месяц
        # Запуск 1-го числа в 00:30
        first_day_of_current_month = today.replace(day=1)
        last_day_of_previous_month = first_day_of_current_month - timedelta(days=1)
        return last_day_of_previous_month.replace(day=1)
    
    return today


def should_check_today(requirement, period_date):
    """
    Проверка, нужно ли проверять норматив сегодня.
    ИСПРАВЛЕНО: Правильная логика для weekly/monthly
    """
    today = date.today()
    
    if requirement.period_type == 'daily':
        # Запуск ежедневно в 00:30
        # Проверка битовой маски дней недели
        weekday = period_date.weekday()  # 0 = Monday, 6 = Sunday
        return bool(requirement.weekdays_mask & (1 << weekday))
    
    elif requirement.period_type == 'weekly':
        # Запуск в ПОНЕДЕЛЬНИК 00:30 за ПРОШЕДШУЮ неделю
        return today.weekday() == 0  # Monday
    
    elif requirement.period_type == 'monthly':
        # Запуск 1-го числа в 00:30 за ПРОШЕДШИЙ месяц
        return today.day == 1
    
    return False


def get_unique_employees_count(zone_id, period_date, min_duration_minutes):
    """
    Получение количества УНИКАЛЬНЫХ сотрудников в зоне за период.
    ИСПРАВЛЕНО: Учитывает иерархию зон (рекурсивный запрос)
    ИСПРАВЛЕНО (Проблема C): Параметр min_duration_minutes вместо seconds
    """
    # ИСПРАВЛЕНО: Рекурсивный запрос для учёта дочерних зон
    result = db.query("""
        WITH RECURSIVE zone_tree AS (
            -- Начальная точка: указанная зона
            SELECT id FROM zones WHERE id = :zone_id
            
            UNION ALL
            
            -- Рекурсия: дочерние зоны
            SELECT z.id FROM zones z
            INNER JOIN zone_tree zt ON z.parent_zone_id = zt.id
        )
        SELECT COUNT(DISTINCT user_id)
        FROM attendance_calculated ac
        WHERE ac.zone_id IN (SELECT id FROM zone_tree)
          AND ac.enter_time >= :period_start
          AND ac.enter_time < :period_end
          AND ac.duration_minutes >= :min_duration_minutes
    """, {
        'zone_id': zone_id,
        'period_start': period_date,
        'period_end': period_date + timedelta(days=1),
        'min_duration_minutes': min_duration_minutes
    })
    
    return result.scalar() or 0
```

### 3.3. Выходные данные

**Таблица:** `requirement_violations`

**Поля:**
- `requirement_id` — UUID норматива
- `period_date` — дата периода
- `required_count` — требуемое количество
- `actual_count` — фактическое количество
- `deficit` — дефицит (required - actual)
- `details` — JSON с деталями (кто должен был быть, кто был)

---

## 4. Детекция фрода

### 4.1. Типы фрода

| Тип | Описание | Severity |
|-----|----------|----------|
| `device_mismatch` | Несовпадение fingerprint устройства | critical |
| `teleportation` | Перемещение < 5 минут между объектами | critical |
| `simultaneous_presence` | Одновременное присутствие на 2 объектах | critical |
| `emulator_detected` | Запуск на эмуляторе | warning |
| `root_detected` | Устройство с root-правами | warning |
| `mock_location` | Mock BLE/Location | warning |
| `beacon_clone_detected` | Клонирование маяка | critical |
| `clock_skew_detected` | Расхождение времени > 5 минут | info |

### 4.2. Алгоритмы детекции

#### 4.2.1. Teleportation Detection

```python
def detect_teleportation(user_id, new_record):
    """
    Детекция телепортации (перемещение < 5 минут между объектами).
    """
    # Получение последней записи пользователя
    last_record = get_last_attendance(user_id)
    
    if not last_record:
        return None
    
    # Проверка времени между записями
    time_diff = new_record.scan_timestamp_start - last_record.scan_timestamp_end
    
    if time_diff < INTERVAL('5 minutes'):
        # Проверка расстояния между зонами
        last_zone = get_zone_by_id(last_record.zone_id)
        new_zone = get_zone_by_id(new_record.zone_id)
        
        if last_zone.object_id != new_zone.object_id:
            # Разные объекты — телепортация!
            fraud_log = create_fraud_log(
                user_id=user_id,
                fraud_type='teleportation',
                severity='critical',
                details={
                    'from_zone': last_zone.name,
                    'from_object': get_object_name(last_zone.object_id),
                    'to_zone': new_zone.name,
                    'to_object': get_object_name(new_zone.object_id),
                    'time_diff_minutes': time_diff.total_seconds() / 60,
                    'last_exit': last_record.exit_time,
                    'new_enter': new_record.scan_timestamp_start
                }
            )
            
            # Отправка уведомления администратору
            notify_admin_fraud(fraud_log)
            
            return fraud_log
    
    return None
```

#### 4.2.2. Simultaneous Presence Detection

```python
def detect_simultaneous_presence(user_id, new_record):
    """
    Детекция одновременного присутствия на 2 объектах.
    """
    # Получение текущих присутствий пользователя
    current_presences = get_current_presences(user_id)
    
    if len(current_presences) > 0:
        # Проверка, разные ли это объекты
        new_zone = get_zone_by_id(new_record.zone_id)
        
        for presence in current_presences:
            existing_zone = get_zone_by_id(presence.zone_id)
            
            if existing_zone.object_id != new_zone.object_id:
                # Одновременное присутствие на разных объектах!
                fraud_log = create_fraud_log(
                    user_id=user_id,
                    fraud_type='simultaneous_presence',
                    severity='critical',
                    details={
                        'zone_1': existing_zone.name,
                        'object_1': get_object_name(existing_zone.object_id),
                        'enter_time_1': presence.enter_time,
                        'zone_2': new_zone.name,
                        'object_2': get_object_name(new_zone.object_id),
                        'enter_time_2': new_record.scan_timestamp_start
                    }
                )
                
                notify_admin_fraud(fraud_log)
                
                return fraud_log
    
    return None
```

#### 4.2.3. Device Mismatch Detection

```python
def detect_device_mismatch(user_id, device_fingerprint):
    """
    Детекция несовпадения fingerprint устройства.
    """
    user = get_user_by_id(user_id)
    
    if not user.device_fingerprint_hash:
        # Первый вход с нового устройства
        update_user_fingerprint(user_id, device_fingerprint)
        return None
    
    if user.device_fingerprint_hash != device_fingerprint:
        # Несовпадение fingerprint!
        fraud_log = create_fraud_log(
            user_id=user_id,
            fraud_type='device_mismatch',
            severity='critical',
            details={
                'expected_fingerprint': user.device_fingerprint_hash,
                'actual_fingerprint': device_fingerprint,
                'timestamp': NOW()
            }
        )
        
        # Блокировка сессии
        revoke_all_sessions(user_id)
        
        # Отправка уведомления администратору
        notify_admin_fraud(fraud_log)
        
        return fraud_log
    
    return None
```

#### 4.2.4. Beacon Clone Detection

```python
def detect_beacon_clone(beacon_uuid, mac_address, new_record):
    """
    Детекция клонирования маяка.
    """
    beacon = get_beacon_by_uuid(beacon_uuid)
    
    if not beacon:
        return None
    
    if beacon.mac_address and beacon.mac_address != mac_address:
        # Разные MAC-адреса для одного UUID — клонирование!
        fraud_log = create_fraud_log(
            user_id=None,  # Может быть несколько пользователей
            fraud_type='beacon_clone_detected',
            severity='critical',
            details={
                'beacon_uuid': beacon_uuid,
                'expected_mac': beacon.mac_address,
                'actual_mac': mac_address,
                'zone': get_zone_name(beacon.zone_id),
                'timestamp': NOW()
            }
        )
        
        notify_admin_fraud(fraud_log)
        
        return fraud_log
    
    return None
```

---

## 5. Воркеры (фоновые задачи)

### 5.1. Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Bull Queue (Redis)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Queue: attendance_processing                                │
│  - process_raw_attendance (каждые 10 минут)                 │
│                                                               │
│  Queue: sla_checking                                         │
│  - check_sla_compliance (каждые 5 минут)                    │
│                                                               │
│  Queue: fraud_detection                                      │
│  - detect_teleportation (real-time)                         │
│  - detect_simultaneous_presence (real-time)                 │
│                                                               │
│  Queue: notifications                                        │
│  - send_email_notification                                   │
│  - send_push_notification                                    │
│                                                               │
│  Queue: beacon_health                                        │
│  - check_beacon_battery (каждые 1 час)                      │
│  - check_beacon_online_status (каждые 15 минут)             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2. Пример воркера

```typescript
// workers/attendanceWorker.ts
import { Queue, Worker } from 'bull';
import { process_raw_attendance } from '../services/attendanceService';

const attendanceQueue = new Queue('attendance_processing', {
  redis: { host: 'localhost', port: 6379 }
});

// Добавление задачи в очередь (каждые 10 минут)
attendanceQueue.add('process', {}, {
  repeat: {
    cron: '*/10 * * * *'  // Каждые 10 минут
  }
});

// Обработка задачи
const worker = new Worker('attendance_processing', async (job) => {
  console.log(`Processing attendance job ${job.id}`);
  
  try {
    const result = await process_raw_attendance();
    console.log(`Processed ${result.processed} records`);
    return result;
  } catch (error) {
    console.error('Error processing attendance:', error);
    throw error;
  }
});

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

---

## 6. Уведомления

### 6.1. Типы уведомлений

| Тип | Описание | Канал |
|-----|----------|-------|
| `fraud_alert` | Инцидент фрода | Email, Push, In-app |
| `sla_violation` | Нарушение SLA | Email, Push, In-app |
| `beacon_battery` | Низкий заряд маяка | In-app |
| `beacon_offline` | Маяк офлайн | In-app |
| `employee_presence` | Сотрудник пришёл/ушёл | In-app (для куратора) |

### 6.2. Алгоритм отправки

```python
def send_notification(user_id, type, title, body, priority='normal'):
    """
    Отправка уведомления пользователю.
    """
    # Сохранение in-app уведомления
    notification = create_notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body
    )
    
    # Отправка WebSocket события (если пользователь онлайн)
    if is_user_online(user_id):
        send_ws_event(user_id, 'notification', notification)
    
    # Отправка push-уведомления (если критично)
    if priority == 'high':
        push_tokens = get_user_push_tokens(user_id)
        for token in push_tokens:
            send_fcm_notification(token, title, body)
    
    # Отправка email (если настроено)
    user = get_user_by_id(user_id)
    if user.email and should_send_email(type):
        send_email(
            to=user.email,
            subject=title,
            body=body
        )
    
    return notification
```

---

## 7. Транзакции и консистентность

### 7.1. Атомарные операции

```python
def process_attendance_batch(records):
    """
    Обработка пакета записей в одной транзакции.
    """
    with db.transaction():
        # 1. Сохранение сырых записей
        for record in records:
            save_attendance_raw(record)
        
        # 2. Расчёт присутствия
        calculated = calculate_attendance(records)
        
        # 3. Сохранение рассчитанного присутствия
        for calc in calculated:
            save_attendance_calculated(calc)
        
        # 4. Детекция фрода
        for record in records:
            detect_teleportation(record.user_id, record)
            detect_simultaneous_presence(record.user_id, record)
        
        # 5. Коммит транзакции
        db.commit()
```

### 7.2. Обработка ошибок

```python
def safe_process_with_retry(func, max_retries=3):
    """
    Безопасное выполнение с повторными попытками.
    """
    for attempt in range(max_retries):
        try:
            return func()
        except DeadlockDetected:
            logger.warning(f"Deadlock detected, retry {attempt + 1}/{max_retries}")
            time.sleep(0.1 * (2 ** attempt))  # Exponential backoff
        except Exception as e:
            logger.error(f"Error: {e}")
            raise
    
    raise MaxRetriesExceeded(f"Failed after {max_retries} attempts")
```

---

## 8. Метрики и мониторинг

### 8.1. Метрики производительности

```python
# Prometheus метрики
ATTENDANCE_RECORDS_PROCESSED = Counter(
    'attendance_records_processed_total',
    'Total attendance records processed'
)

SLA_CHECK_DURATION = Histogram(
    'sla_check_duration_seconds',
    'SLA check duration'
)

FRAUD_DETECTION_LATENCY = Histogram(
    'fraud_detection_latency_seconds',
    'Fraud detection latency'
)

QUEUE_SIZE = Gauge(
    'bull_queue_size',
    'Bull queue size',
    ['queue_name']
)
```

### 8.2. Health checks

```python
def health_check():
    """
    Проверка состояния системы.
    """
    checks = {
        'database': check_database_connection(),
        'redis': check_redis_connection(),
        'queue': check_queue_health(),
        'workers': check_workers_health()
    }
    
    status = 'healthy' if all(c == 'ok' for c in checks.values()) else 'unhealthy'
    
    return {
        'status': status,
        'timestamp': NOW(),
        'checks': checks
    }
```

---

**Конец спецификации**
