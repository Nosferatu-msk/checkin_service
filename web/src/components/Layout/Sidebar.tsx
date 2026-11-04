import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  BankOutlined,
  EnvironmentOutlined,
  AlertOutlined,
  FileTextOutlined,
  TeamOutlined,
  CalendarOutlined,
  SafetyOutlined,
  WarningOutlined,
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import './Sidebar.css';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/objects',
      icon: <BankOutlined />,
      label: 'Объекты',
    },
    {
      key: '/zones',
      icon: <EnvironmentOutlined />,
      label: 'Зоны',
    },
    {
      key: '/beacons',
      icon: <AlertOutlined />,
      label: 'Маяки',
    },
    {
      key: '/contracts',
      icon: <FileTextOutlined />,
      label: 'Договоры',
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: 'Сотрудники',
    },
    {
      key: '/attendance',
      icon: <CalendarOutlined />,
      label: 'Табель',
    },
    {
      key: '/sla',
      icon: <SafetyOutlined />,
      label: 'SLA',
    },
    {
      key: '/fraud',
      icon: <WarningOutlined />,
      label: 'Фрод',
      roles: ['admin'],
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: 'Уведомления',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Настройки',
      roles: ['admin'],
    },
  ];

  // Фильтрация пунктов меню по роли
  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <Sider width={240} className="sidebar">
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={filteredMenuItems}
        onClick={({ key }) => navigate(key)}
        style={{ height: '100%', borderRight: 0 }}
      />
    </Sider>
  );
};

export default Sidebar;
