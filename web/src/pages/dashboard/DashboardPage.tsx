import { Card, Row, Col, Statistic, Table, Tag, message } from 'antd';
import {
  BankOutlined,
  AlertOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../hooks/redux';
import { useEffect, useState } from 'react';
import { objectsApi, beaconsApi, usersApi } from '../../services/api';
import './DashboardPage.css';

interface DashboardStats {
  objects_count: number;
  beacons_count: number;
  employees_count: number;
  sla_violations: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<DashboardStats>({
    objects_count: 0,
    beacons_count: 0,
    employees_count: 0,
    sla_violations: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [objectsRes, beaconsRes, usersRes] = await Promise.all([
        objectsApi.getAll(),
        beaconsApi.getAll(),
        usersApi.getAll(),
      ]);

      setStats({
        objects_count: objectsRes.data.data?.length || 0,
        beacons_count: beaconsRes.data.data?.length || 0,
        employees_count: usersRes.data.data?.length || 0,
        sla_violations: 0, // TODO: Получить из SLA API
      });
    } catch (error) {
      message.error('Ошибка загрузки данных dashboard');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentEvents = [
    {
      key: '1',
      time: '10:45',
      event: 'Сотрудник вошёл в зону',
      object: 'БЦ "Москва"',
      status: 'success',
    },
    {
      key: '2',
      time: '10:32',
      event: 'Низкий заряд маяка',
      object: 'Склад №3',
      status: 'warning',
    },
    {
      key: '3',
      time: '10:15',
      event: 'Нарушение SLA',
      object: 'Офис "Северный"',
      status: 'error',
    },
  ];

  const columns = [
    {
      title: 'Время',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: 'Событие',
      dataIndex: 'event',
      key: 'event',
    },
    {
      title: 'Объект',
      dataIndex: 'object',
      key: 'object',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          success: 'green',
          warning: 'orange',
          error: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
  ];

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Объекты"
              value={stats.objects_count}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Маяки"
              value={stats.beacons_count}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Сотрудники"
              value={stats.employees_count}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#8b5cf6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Нарушения SLA"
              value={stats.sla_violations}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Последние события">
            <Table
              columns={columns}
              dataSource={recentEvents}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Информация">
            <p>Добро пожаловать, {user?.full_name || user?.login}!</p>
            <p>Роль: {user?.role}</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
