import { Table, Button, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import api from '../../services/authService';
import './ObjectsPage.css';

interface ObjectItem {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

const ObjectsPage: React.FC = () => {
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchObjects();
  }, []);

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/objects');
      setObjects(response.data.data);
    } catch (error) {
      console.error('Error fetching objects:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: ObjectItem) => (
        <Space>
          <Button icon={<EditOutlined />} size="small">
            Редактировать
          </Button>
          <Button icon={<DeleteOutlined />} size="small" danger>
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="objects-page">
      <div className="page-header">
        <h1>Объекты</h1>
        <Button type="primary" icon={<PlusOutlined />}>
          Добавить объект
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={objects}
        loading={loading}
        rowKey="id"
      />
    </div>
  );
};

export default ObjectsPage;
