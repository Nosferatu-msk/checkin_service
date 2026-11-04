# Web UI Specification — Контроль присутствия

**Версия:** 1.0  
**Дата:** 04.11.2026  
**Фреймворк:** React + TypeScript + Ant Design  
**Маршрутизация:** React Router v6  
**Состояние:** Redux Toolkit + RTK Query  
**Стилизация:** CSS Modules / Styled Components

---

## 1. Архитектура frontend

### 1.1. Структура проекта

```
src/
├── app/                    # Настройки приложения
│   ├── store.ts           # Redux store
│   ├── routes.tsx         # Маршруты
│   └── App.tsx            # Корневой компонент
├── pages/                  # Страницы
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── ForgotPasswordPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── objects/
│   │   ├── ObjectsListPage.tsx
│   │   └── ObjectDetailsPage.tsx
│   ├── zones/
│   │   └── ZonesPage.tsx
│   ├── beacons/
│   │   └── BeaconsPage.tsx
│   ├── contracts/
│   │   ├── ContractsListPage.tsx
│   │   └── ContractDetailsPage.tsx
│   ├── employees/
│   │   ├── EmployeesListPage.tsx
│   │   └── EmployeeDetailsPage.tsx
│   ├── attendance/
│   │   └── AttendancePage.tsx
│   ├── sla/
│   │   └── SLAPage.tsx
│   ├── fraud/
│   │   └── FraudPage.tsx
│   ├── settings/
│   │   └── SettingsPage.tsx
│   └── notifications/
│       └── NotificationsPage.tsx
├── components/             # Переиспользуемые компоненты
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Table.tsx
│   │   ├── Modal.tsx
│   │   └── Card.tsx
│   └── business/
│       ├── BeaconMap.tsx
│       ├── AttendanceCalendar.tsx
│       └── SLAIndicator.tsx
├── features/               # Redux slices
│   ├── auth/
│   ├── objects/
│   ├── zones/
│   ├── beacons/
│   ├── contracts/
│   ├── employees/
│   ├── attendance/
│   ├── sla/
│   ├── fraud/
│   └── notifications/
├── services/               # API сервисы
│   ├── api.ts             # Axios instance
│   ├── authService.ts
│   ├── objectsService.ts
│   └── ...
├── hooks/                  # Custom hooks
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── usePermissions.ts
├── utils/                  # Утилиты
│   ├── formatters.ts
│   ├── validators.ts
│   └── constants.ts
├── types/                  # TypeScript типы
│   ├── api.ts
│   ├── models.ts
│   └── store.ts
└── assets/                 # Статические ресурсы
    ├── icons/
    └── images/
```

---

## 2. Маршруты

### 2.1. Публичные маршруты

| Путь | Компонент | Описание |
|------|-----------|----------|
| `/login` | `LoginPage` | Вход в систему |
| `/forgot-password` | `ForgotPasswordPage` | Восстановление пароля |
| `/reset-password/:token` | `ResetPasswordPage` | Сброс пароля |

### 2.2. Защищённые маршруты (Authenticated)

| Путь | Компонент | Роли | Описание |
|------|-----------|------|----------|
| `/` | `DashboardPage` | All | Главная страница |
| `/objects` | `ObjectsListPage` | Admin, Curator | Список объектов |
| `/objects/:id` | `ObjectDetailsPage` | Admin, Curator | Детали объекта |
| `/zones` | `ZonesPage` | Admin, Curator | Управление зонами |
| `/beacons` | `BeaconsPage` | Admin, Curator | Управление маяками |
| `/contracts` | `ContractsListPage` | Admin, Curator | Список договоров |
| `/contracts/:id` | `ContractDetailsPage` | Admin, Curator | Детали договора |
| `/employees` | `EmployeesListPage` | Admin, Curator | Список сотрудников |
| `/employees/:id` | `EmployeeDetailsPage` | Admin, Curator | Детали сотрудника |
| `/attendance` | `AttendancePage` | All | Табель присутствия |
| `/sla` | `SLAPage` | Admin, Curator | Выполнение SLA |
| `/fraud` | `FraudPage` | Admin | Фрод-контроль |
| `/notifications` | `NotificationsPage` | All | Уведомления |
| `/settings` | `SettingsPage` | Admin | Настройки системы |
| `/profile` | `ProfilePage` | All | Профиль пользователя |

### 2.3. Конфигурация маршрутов (ИСПРАВЛЕНО)

```tsx
// app/routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { Layout } from '../components/layout/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleBasedRoute } from '../components/RoleBasedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'objects',
        element: (
          <RoleBasedRoute allowedRoles={['admin', 'curator']}>
            <ObjectsListPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'objects/:id',
        element: (
          <RoleBasedRoute allowedRoles={['admin', 'curator']}>
            <ObjectDetailsPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'zones',
        element: (
          <RoleBasedRoute allowedRoles={['admin', 'curator']}>
            <ZonesPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'beacons',
        element: (
          <RoleBasedRoute allowedRoles={['admin', 'curator']}>
            <BeaconsPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'contracts',
        element: (
          <RoleBasedRoute allowedRoles={['admin', 'curator']}>
            <ContractsListPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'contracts/:id',
        element: (
          <RoleBasedRoute allowedRoles={['admin', 'curator']}>
            <ContractDetailsPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'employees',
        element: (
          <RoleBasedRoute allowedRoles={['admin', 'curator']}>
            <EmployeesListPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'employees/:id',
        element: (
          <RoleBasedRoute allowedRoles={['admin', 'curator']}>
            <EmployeeDetailsPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'attendance',
        element: <AttendancePage />,  // All roles (filtered by backend)
      },
      {
        path: 'sla',
        element: (
          <RoleBasedRoute allowedRoles={['admin', 'curator']}>
            <SLAPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'fraud',
        element: (
          <RoleBasedRoute allowedRoles={['admin']}>
            <FraudPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,  // All roles
      },
      {
        path: 'settings',
        element: (
          <RoleBasedRoute allowedRoles={['admin']}>
            <SettingsPage />
          </RoleBasedRoute>
        ),
      },
      {
        path: 'profile',
        element: <ProfilePage />,  // All roles
      },
    ],
  },
]);
```

### 2.4. Компонент RoleBasedRoute (НОВОЕ)

```tsx
// components/RoleBasedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  
  return <>{children}</>;
};
```

---

## 3. Компоненты

### 3.1. Layout

#### Header
```tsx
// components/layout/Header.tsx
interface HeaderProps {
  user: User;
  notificationsCount: number;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, notificationsCount, onLogout }) => {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>Контроль присутствия</div>
      <div className={styles.userMenu}>
        <Badge count={notificationsCount}>
          <BellIcon onClick={() => navigate('/notifications')} />
        </Badge>
        <Dropdown menu={userMenuItems}>
          <Avatar>{user.full_name.charAt(0)}</Avatar>
        </Dropdown>
      </div>
    </header>
  );
};
```

#### Sidebar
```tsx
// components/layout/Sidebar.tsx
interface SidebarProps {
  userRole: UserRole;
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, currentPath }) => {
  const menuItems = getMenuItemsByRole(userRole);
  
  return (
    <aside className={styles.sidebar}>
      <Menu
        mode="inline"
        selectedKeys={[currentPath]}
        items={menuItems}
      />
    </aside>
  );
};

const getMenuItemsByRole = (role: UserRole) => {
  const commonItems = [
    { key: '/', icon: <DashboardIcon />, label: 'Dashboard' },
  ];
  
  const adminItems = [
    { key: '/objects', icon: <BuildingIcon />, label: 'Объекты' },
    { key: '/zones', icon: <MapIcon />, label: 'Зоны' },
    { key: '/beacons', icon: <SignalIcon />, label: 'Маяки' },
    { key: '/contracts', icon: <FileIcon />, label: 'Договоры' },
    { key: '/employees', icon: <UsersIcon />, label: 'Сотрудники' },
    { key: '/attendance', icon: <CalendarIcon />, label: 'Табель' },
    { key: '/sla', icon: <CheckCircleIcon />, label: 'SLA' },
    { key: '/fraud', icon: <ShieldIcon />, label: 'Фрод' },
    { key: '/settings', icon: <SettingsIcon />, label: 'Настройки' },
  ];
  
  const curatorItems = [
    { key: '/objects', icon: <BuildingIcon />, label: 'Объекты' },
    { key: '/contracts', icon: <FileIcon />, label: 'Договоры' },
    { key: '/employees', icon: <UsersIcon />, label: 'Сотрудники' },
    { key: '/attendance', icon: <CalendarIcon />, label: 'Табель' },
    { key: '/sla', icon: <CheckCircleIcon />, label: 'SLA' },
  ];
  
  switch (role) {
    case 'admin':
      return [...commonItems, ...adminItems];
    case 'curator':
      return [...commonItems, ...curatorItems];
    default:
      return commonItems;
  }
};
```

---

### 3.2. UI компоненты

#### Button
```tsx
// components/ui/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  onClick,
  children,
}) => {
  return (
    <button
      className={clsx(styles.button, styles[variant], styles[size])}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
};
```

#### Table
```tsx
// components/ui/Table.tsx
interface Column<T> {
  key: string;
  title: string;
  dataIndex: keyof T;
  render?: (value: any, record: T) => React.ReactNode;
  sorter?: boolean;
  width?: number;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onRow?: (record: T) => { onClick: () => void };
}

export const Table = <T extends object>({
  columns,
  data,
  loading,
  pagination,
  onRow,
}: TableProps<T>) => {
  return (
    <AntTable
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      onRow={onRow}
      rowKey="id"
    />
  );
};
```

---

### 3.3. Бизнес-компоненты

#### AttendanceCalendar
```tsx
// components/business/AttendanceCalendar.tsx
interface AttendanceCalendarProps {
  employees: Employee[];
  dateRange: [Date, Date];
  onDateSelect: (date: Date) => void;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  employees,
  dateRange,
  onDateSelect,
}) => {
  return (
    <div className={styles.calendar}>
      <Table
        columns={[
          {
            key: 'employee',
            title: 'Сотрудник',
            dataIndex: 'full_name',
            fixed: 'left',
            width: 200,
          },
          ...generateDateColumns(dateRange),
        ]}
        dataSource={employees}
        scroll={{ x: 'max-content' }}
        virtual
      />
    </div>
  );
};
```

#### SLAIndicator
```tsx
// components/business/SLAIndicator.tsx
interface SLAIndicatorProps {
  required: number;
  actual: number;
  showDetails?: boolean;
}

export const SLAIndicator: React.FC<SLAIndicatorProps> = ({
  required,
  actual,
  showDetails = false,
}) => {
  const percentage = Math.round((actual / required) * 100);
  const status = percentage >= 100 ? 'success' : percentage >= 80 ? 'warning' : 'error';
  
  return (
    <div className={styles.indicator}>
      <Progress percent={percentage} status={status} />
      {showDetails && (
        <div className={styles.details}>
          {actual} / {required} сотрудников
        </div>
      )}
    </div>
  );
};
```

---

## 4. Страницы

### 4.1. LoginPage

```tsx
// pages/auth/LoginPage.tsx
export const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      await dispatch(loginUser(values)).unwrap();
      navigate('/');
    } catch (err) {
      // Error handled by Redux
    }
  };

  return (
    <div className={styles.loginPage}>
      <Card className={styles.loginCard}>
        <h1>Контроль присутствия</h1>
        <p>Войдите в систему</p>
        
        <Form form={form} onFinish={handleSubmit}>
          <Form.Item name="login" rules={[{ required: true }]}>
            <Input prefix={<UserIcon />} placeholder="Логин" />
          </Form.Item>
          
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockIcon />} placeholder="Пароль" />
          </Form.Item>
          
          <Button type="primary" htmlType="submit" loading={loading} block>
            Войти
          </Button>
        </Form>
        
        <Link to="/forgot-password">Забыли пароль?</Link>
      </Card>
    </div>
  );
};
```

---

### 4.2. DashboardPage

```tsx
// pages/dashboard/DashboardPage.tsx
export const DashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { data: stats, isLoading } = useGetDashboardStatsQuery();

  if (user.role === 'admin') {
    return <AdminDashboard stats={stats} loading={isLoading} />;
  }
  
  return <CuratorDashboard stats={stats} loading={isLoading} />;
};

const AdminDashboard: React.FC<{ stats: DashboardStats; loading: boolean }> = ({ stats, loading }) => {
  return (
    <div className={styles.dashboard}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="Объекты" value={stats.objectsCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Маяки" value={stats.beaconsCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Сотрудники" value={stats.employeesCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Нарушения SLA" value={stats.slaViolations} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="Посещения за неделю">
            <LineChart data={stats.weeklyAttendance} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Топ нарушений SLA">
            <Table dataSource={stats.topSLAViolations} columns={slaColumns} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
```

---

### 4.3. ObjectsListPage

```tsx
// pages/objects/ObjectsListPage.tsx
export const ObjectsListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading } = useGetObjectsQuery({
    page: Number(searchParams.get('page')) || 1,
    per_page: 20,
    search: searchParams.get('search') || '',
  });

  const columns = [
    {
      key: 'name',
      title: 'Название',
      dataIndex: 'name',
      sorter: true,
    },
    {
      key: 'address',
      title: 'Адрес',
      dataIndex: 'address',
    },
    {
      key: 'zones_count',
      title: 'Зон',
      dataIndex: 'zones_count',
    },
    {
      key: 'beacons_count',
      title: 'Маяков',
      dataIndex: 'beacons_count',
    },
    {
      key: 'is_active',
      title: 'Статус',
      dataIndex: 'is_active',
      render: (active: boolean) => (
        <Badge status={active ? 'success' : 'default'} text={active ? 'Активен' : 'Неактивен'} />
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Объекты"
        extra={<Button type="primary" icon={<PlusIcon />}>Добавить объект</Button>}
      />
      
      <Card>
        <Table
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          pagination={{
            current: data?.meta.page || 1,
            pageSize: data?.meta.per_page || 20,
            total: data?.meta.total || 0,
            onChange: (page) => setSearchParams({ page: String(page) }),
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/objects/${record.id}`),
          })}
        />
      </Card>
    </div>
  );
};
```

---

### 4.4. AttendancePage

```tsx
// pages/attendance/AttendancePage.tsx
export const AttendancePage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    startOfMonth(new Date()),
    endOfMonth(new Date()),
  ]);
  
  const { data, isLoading } = useGetAttendanceQuery({
    from: dateRange[0].toISOString(),
    to: dateRange[1].toISOString(),
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Табель присутствия"
        extra={
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Date, Date])}
          />
        }
      />
      
      <Card>
        <AttendanceCalendar
          employees={data?.data || []}
          dateRange={dateRange}
          onDateSelect={(date) => console.log('Date selected:', date)}
        />
      </Card>
      
      <Card style={{ marginTop: 16 }}>
        <Button icon={<ExportIcon />}>Экспорт в Excel</Button>
      </Card>
    </div>
  );
};
```

---

### 4.5. SettingsPage (НОВОЕ)

```tsx
// pages/settings/SettingsPage.tsx
export const SettingsPage: React.FC = () => {
  const { can } = usePermissions();
  const { data: settings, isLoading } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();

  if (!can('read', 'settings')) {
    return <ForbiddenPage />;
  }

  const handleSubmit = async (values: SettingsFormValues) => {
    await updateSettings(values).unwrap();
    message.success('Настройки сохранены');
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Настройки системы" />
      
      <Card title="Глобальные параметры" loading={isLoading}>
        <Form onFinish={handleSubmit} initialValues={settings}>
          <Form.Item name="aggregation_interval_sec" label="Интервал агрегации (сек)">
            <InputNumber min={60} max={3600} />
          </Form.Item>
          
          <Form.Item name="sync_interval_sec" label="Интервал синхронизации (сек)">
            <InputNumber min={60} max={3600} />
          </Form.Item>
          
          <Form.Item label="Scan Duty Cycle">
            <Space>
              <Form.Item name={['scan_duty_cycle', 'scan_duration_ms']} noStyle>
                <InputNumber addonBefore="Сканирование (мс)" />
              </Form.Item>
              <Form.Item name={['scan_duty_cycle', 'pause_duration_ms']} noStyle>
                <InputNumber addonBefore="Пауза (мс)" />
              </Form.Item>
            </Space>
          </Form.Item>
          
          <Form.Item label="Пороги фрода">
            <Form.Item name={['fraud_thresholds', 'teleportation_minutes']} label="Телепортация (мин)">
              <InputNumber min={1} max={60} />
            </Form.Item>
            <Form.Item name={['fraud_thresholds', 'min_samples_count']} label="Мин. замеров">
              <InputNumber min={1} max={10} />
            </Form.Item>
          </Form.Item>
          
          <Button type="primary" htmlType="submit">Сохранить</Button>
        </Form>
      </Card>
      
      <Card title="Настройки SMTP" style={{ marginTop: 16 }}>
        <Form onFinish={handleSubmit} initialValues={settings?.smtp}>
          <Form.Item name={['smtp', 'host']} label="SMTP Host">
            <Input />
          </Form.Item>
          <Form.Item name={['smtp', 'port']} label="SMTP Port">
            <InputNumber />
          </Form.Item>
          <Form.Item name={['smtp', 'from_email']} label="From Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name={['smtp', 'from_name']} label="From Name">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit">Сохранить</Button>
        </Form>
      </Card>
    </div>
  );
};
```

---

### 4.6. NotificationsPage (НОВОЕ)

```tsx
// pages/notifications/NotificationsPage.tsx
export const NotificationsPage: React.FC = () => {
  const { data: notifications, isLoading } = useGetNotificationsQuery({ is_read: false });
  const [markAsRead] = useMarkNotificationReadMutation();

  const handleMarkAllRead = async () => {
    await Promise.all(
      notifications?.data.map((n) => markAsRead({ id: n.id }))
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Уведомления"
        extra={
          <Button onClick={handleMarkAllRead}>
            Отметить все как прочитанные
          </Button>
        }
      />
      
      <List
        loading={isLoading}
        dataSource={notifications?.data || []}
        renderItem={(item) => (
          <List.Item
            className={clsx(styles.notificationItem, {
              [styles.unread]: !item.is_read
            })}
          >
            <List.Item.Meta
              avatar={<NotificationIcon type={item.type} />}
              title={item.title}
              description={
                <>
                  <div>{item.body}</div>
                  <div className={styles.timestamp}>
                    {formatDistanceToNow(new Date(item.created_at))}
                  </div>
                </>
              }
            />
            {!item.is_read && (
              <Button
                type="link"
                onClick={() => markAsRead({ id: item.id })}
              >
                Прочитано
              </Button>
            )}
          </List.Item>
        )}
      />
    </div>
  );
};
```

---

### 4.7. FraudPage (НОВОЕ)

```tsx
// pages/fraud/FraudPage.tsx
export const FraudPage: React.FC = () => {
  const { can } = usePermissions();
  const [filters, setFilters] = useState<FraudFilters>({});
  const { data, isLoading } = useGetFraudLogsQuery(filters);
  const [reviewFraud] = useReviewFraudMutation();

  if (!can('read', 'fraud')) {
    return <ForbiddenPage />;
  }

  const columns = [
    {
      key: 'created_at',
      title: 'Время',
      dataIndex: 'created_at',
      render: (date: string) => formatDateTime(date),
      sorter: true,
    },
    {
      key: 'user_name',
      title: 'Сотрудник',
      dataIndex: 'user_name',
    },
    {
      key: 'fraud_type',
      title: 'Тип',
      dataIndex: 'fraud_type',
      render: (type: string) => (
        <Tag color={getFraudTypeColor(type)}>
          {getFraudTypeLabel(type)}
        </Tag>
      ),
    },
    {
      key: 'severity',
      title: 'Серьёзность',
      dataIndex: 'severity',
      render: (severity: string) => (
        <Badge
          status={severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'default'}
          text={severity}
        />
      ),
    },
    {
      key: 'is_reviewed',
      title: 'Статус',
      dataIndex: 'is_reviewed',
      render: (reviewed: boolean) => (
        reviewed ? <Tag color="green">Просмотрено</Tag> : <Tag color="red">Новое</Tag>
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (_: any, record: FraudLog) => (
        <Space>
          <Button
            type="link"
            onClick={() => showFraudDetails(record)}
          >
            Детали
          </Button>
          {!record.is_reviewed && (
            <Button
              type="link"
              onClick={() => reviewFraud({ id: record.id, is_reviewed: true })}
            >
              Отметить
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Фрод-контроль" />
      
      <Card>
        <FraudFilters onChange={setFilters} />
        <Table
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
        />
      </Card>
    </div>
  );
};
```

---

### 4.8. SLAPage (НОВОЕ)

```tsx
// pages/sla/SLAPage.tsx
export const SLAPage: React.FC = () => {
  const { can } = usePermissions();
  const [filters, setFilters] = useState<SLAFilters>({});
  const { data, isLoading } = useGetSLAQuery(filters);

  if (!can('read', 'sla')) {
    return <ForbiddenPage />;
  }

  const columns = [
    {
      key: 'zone_name',
      title: 'Зона',
      dataIndex: 'zone_name',
    },
    {
      key: 'period_date',
      title: 'Период',
      dataIndex: 'period_date',
      render: (date: string) => formatDate(date),
    },
    {
      key: 'required_count',
      title: 'Требуется',
      dataIndex: 'required_count',
    },
    {
      key: 'actual_count',
      title: 'Фактически',
      dataIndex: 'actual_count',
    },
    {
      key: 'status',
      title: 'Статус',
      render: (_: any, record: SLARecord) => (
        <SLAIndicator
          required={record.required_count}
          actual={record.actual_count}
        />
      ),
    },
    {
      key: 'deficit',
      title: 'Дефицит',
      dataIndex: 'deficit',
      render: (deficit: number) => (
        deficit > 0 ? <span style={{ color: '#cf1322' }}>-{deficit}</span> : '—'
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Выполнение SLA" />
      
      <Card>
        <SLAFilters onChange={setFilters} />
        <Table
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
        />
      </Card>
    </div>
  );
};
```

---

### 4.9. ProfilePage (НОВОЕ)

```tsx
// pages/profile/ProfilePage.tsx
export const ProfilePage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [updateProfile] = useUpdateProfileMutation();
  const [changePassword] = useChangePasswordMutation();

  const handleUpdateProfile = async (values: ProfileFormValues) => {
    await updateProfile(values).unwrap();
    message.success('Профиль обновлён');
  };

  const handleChangePassword = async (values: PasswordFormValues) => {
    await changePassword(values).unwrap();
    message.success('Пароль изменён');
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Мой профиль" />
      
      <Card title="Личная информация">
        <Form
          onFinish={handleUpdateProfile}
          initialValues={{
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
          }}
        >
          <Form.Item name="full_name" label="ФИО" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit">Сохранить</Button>
        </Form>
      </Card>
      
      <Card title="Смена пароля" style={{ marginTop: 16 }}>
        <Form onFinish={handleChangePassword}>
          <Form.Item name="current_password" label="Текущий пароль" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="new_password" label="Новый пароль" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirm_password" label="Подтвердите пароль" dependencies={['new_password']}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit">Сменить пароль</Button>
        </Form>
      </Card>
    </div>
  );
};
```

---

## 5. API интеграция

### 5.1. RTK Query API

```ts
// features/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Object', 'Zone', 'Beacon', 'Contract', 'Employee', 'Attendance'],
  endpoints: (builder) => ({
    // Objects
    getObjects: builder.query<ObjectsResponse, ObjectsParams>({
      query: (params) => ({
        url: '/admin/objects',
        params,
      }),
      providesTags: ['Object'],
    }),
    
    createObject: builder.mutation<Object, CreateObjectDto>({
      query: (body) => ({
        url: '/admin/objects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Object'],
    }),
    
    // Attendance
    getAttendance: builder.query<AttendanceResponse, AttendanceParams>({
      query: (params) => ({
        url: '/admin/analytics/attendance',
        params,
      }),
      providesTags: ['Attendance'],
    }),
    
    // ... другие endpoints
  }),
});

export const {
  useGetObjectsQuery,
  useCreateObjectMutation,
  useGetAttendanceQuery,
  // ... другие hooks
} = apiSlice;
```

---

## 6. Безопасность

### 6.1. Аутентификация

```tsx
// components/ProtectedRoute.tsx
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  
  if (isLoading) {
    return <Spinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};
```

### 6.2. Авторизация (Role-based)

```tsx
// hooks/usePermissions.ts
export const usePermissions = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  const can = (action: string, resource: string) => {
    const permissions = getPermissionsByRole(user.role);
    return permissions[action]?.includes(resource) || false;
  };
  
  return { can, userRole: user.role };
};

// Использование
const { can } = usePermissions();
{can('create', 'objects') && <Button>Создать объект</Button>}
```

---

## 7. Производительность

### 7.1. Виртуализация таблиц

```tsx
// Использование virtual scroll для больших таблиц
<Table
  virtual
  scroll={{ y: 600 }}
  dataSource={largeDataSet}
  columns={columns}
/>
```

### 7.2. Ленивая загрузка

```tsx
// Ленивая загрузка страниц
const ObjectsListPage = lazy(() => import('./pages/objects/ObjectsListPage'));
const ObjectDetailsPage = lazy(() => import('./pages/objects/ObjectDetailsPage'));
```

### 7.3. Кеширование

```ts
// RTK Query кеширование
useGetObjectsQuery(params, {
  staleTime: 5 * 60 * 1000, // 5 минут
  refetchOnMount: false,
});
```

---

**Конец спецификации**
