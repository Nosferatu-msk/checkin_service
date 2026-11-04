import { Layout, Badge, Dropdown, Avatar, Space } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import './Header.css';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Профиль',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader className="header">
      <div className="logo">Контроль присутствия</div>
      <div className="header-actions">
        <Badge count={5} size="small">
          <BellOutlined 
            style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }}
            onClick={() => navigate('/notifications')}
          />
        </Badge>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer', marginLeft: 16 }}>
            <Avatar icon={<UserOutlined />} />
            <span style={{ color: '#fff' }}>{user?.full_name || user?.login}</span>
          </Space>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;
