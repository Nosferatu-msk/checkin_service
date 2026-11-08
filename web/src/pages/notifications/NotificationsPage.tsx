import { Table, Card, Button, Tag, Space, message, Badge } from 'antd';
import { CheckOutlined, DeleteOutlined, BellOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { notificationsApi } from '../../services/api';
import dayjs from 'dayjs';
import './NotificationsPage.css';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.getAll();
      setNotifications(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки уведомлений');
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      message.success('Уведомление отмечено как прочитанное');
      fetchNotifications();
    } catch (error) {
      message.error('Ошибка обновления уведомления');
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      message.success('Уведомление удалено');
      fetchNotifications();
    } catch (error) {
      message.error('Ошибка удаления уведомления');
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      message.success('Все уведомления отмечены как прочитанные');
      fetchNotifications();
    } catch (error) {
      message.error('Ошибка обновления уведомлений');
      console.error('Error marking all as read:', error);
    }
  };

  const columns = [
    {
      title: 'Статус',
      dataIndex: 'is_read',
      key: 'is_read',
      width: 50,
      render: (isRead: boolean) => (
        <Badge status={isRead ? 'default' : 'processing'} />
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const colors: Record<string, string> = {
          info: 'blue',
          warning: 'orange',
          error: 'red',
          success: 'green',
        };
        const labels: Record<string, string> = {
          info: 'Информация',
          warning: 'Предупреждение',
          error: 'Ошибка',
          success: 'Успех',
        };
        return <Tag color={colors[type]}>{labels[type]}</Tag>;
      },
    },
    {
      title: 'Заголовок',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Сообщение',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, record: Notification) => (
        <Space>
          {!record.is_read && (
            <Button
              icon={<CheckOutlined />}
              size="small"
              onClick={() => handleMarkAsRead(record.id)}
            >
              Прочитано
            </Button>
          )}
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notifications-page">
      <div className="page-header">
        <h1>
          <BellOutlined style={{ marginRight: 8 }} />
          Уведомления
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: 8 }} />
          )}
        </h1>
        <Button onClick={handleMarkAllAsRead}>
          Отметить все как прочитанные
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={notifications}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего уведомлений: ${total}`,
        }}
      />
    </div>
  );
};

export default NotificationsPage;
