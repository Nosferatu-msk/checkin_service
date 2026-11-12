import { Table, Button, Tag, Space, message, Badge, Select } from 'antd';
import { CheckOutlined, DeleteOutlined, BellOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
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

interface TableParams {
  pagination: {
    current: number;
    pageSize: number;
    total?: number;
  };
  sorter?: {
    field?: string;
    order?: 'ascend' | 'descend';
  };
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [readFilter, setReadFilter] = useState<boolean | undefined>(undefined);
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { current: 1, pageSize: 20 },
  });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: tableParams.pagination.current,
        limit: tableParams.pagination.pageSize,
      };

      if (typeFilter) {
        params.type = typeFilter;
      }

      if (readFilter !== undefined) {
        params.is_read = readFilter;
      }

      if (tableParams.sorter?.field) {
        params.sort_by = tableParams.sorter.field;
        params.sort_order = tableParams.sorter.order === 'ascend' ? 'asc' : 'desc';
      }

      const response = await notificationsApi.getAll(params);
      setNotifications(response.data.data);
      setTableParams(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: response.data.total || response.data.data.length,
        },
      }));
    } catch (error) {
      message.error('Ошибка загрузки уведомлений');
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [tableParams, typeFilter, readFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setTableParams({
      pagination,
      sorter: {
        field: sorter.field,
        order: sorter.order,
      },
    });
  };

  const handleTypeFilter = (value: string | undefined) => {
    setTypeFilter(value);
    setTableParams(prev => ({
      ...prev,
      pagination: { ...prev.pagination, current: 1 },
    }));
  };

  const handleReadFilter = (value: boolean | undefined) => {
    setReadFilter(value);
    setTableParams(prev => ({
      ...prev,
      pagination: { ...prev.pagination, current: 1 },
    }));
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
      sorter: true,
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
      sorter: true,
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

      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Тип"
            allowClear
            style={{ width: 150 }}
            value={typeFilter}
            onChange={handleTypeFilter}
          >
            <Select.Option value="info">Информация</Select.Option>
            <Select.Option value="warning">Предупреждение</Select.Option>
            <Select.Option value="error">Ошибка</Select.Option>
            <Select.Option value="success">Успех</Select.Option>
          </Select>
          <Select
            placeholder="Статус чтения"
            allowClear
            style={{ width: 150 }}
            value={readFilter}
            onChange={handleReadFilter}
          >
            <Select.Option value={true}>Прочитанные</Select.Option>
            <Select.Option value={false}>Непрочитанные</Select.Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={notifications}
        loading={loading}
        rowKey="id"
        pagination={{
          ...tableParams.pagination,
          showSizeChanger: true,
          showTotal: (total) => `Всего уведомлений: ${total}`,
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default NotificationsPage;
