import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { objectsApi } from '../../services/api';
import './ObjectsPage.css';

interface ObjectItem {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
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
  filters?: {
    search?: string;
    is_active?: boolean | undefined;
  };
}

const ObjectsPage: React.FC = () => {
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingObject, setEditingObject] = useState<ObjectItem | null>(null);
  const [form] = Form.useForm();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { current: 1, pageSize: 10 },
    filters: {},
  });
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);

  const fetchObjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: tableParams.pagination.current,
        limit: tableParams.pagination.pageSize,
      };

      if (tableParams.sorter?.field) {
        params.sort_by = tableParams.sorter.field;
        params.sort_order = tableParams.sorter.order === 'ascend' ? 'asc' : 'desc';
      }

      if (tableParams.filters?.search) {
        params.search = tableParams.filters.search;
      }

      if (tableParams.filters?.is_active !== undefined) {
        params.is_active = tableParams.filters.is_active;
      }

      const response = await objectsApi.getAll(params);
      setObjects(response.data.data);
      setTableParams(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: response.data.total || response.data.data.length,
        },
      }));
    } catch (error) {
      message.error('Ошибка загрузки объектов');
      console.error('Error fetching objects:', error);
    } finally {
      setLoading(false);
    }
  }, [tableParams]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setTableParams({
      pagination,
      sorter: {
        field: sorter.field,
        order: sorter.order,
      },
      filters: {
        search: searchValue,
        is_active: statusFilter,
      },
    });
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setTableParams(prev => ({
      ...prev,
      pagination: { ...prev.pagination, current: 1 },
      filters: { ...prev.filters, search: value },
    }));
  };

  const handleStatusFilter = (value: boolean | undefined) => {
    setStatusFilter(value);
    setTableParams(prev => ({
      ...prev,
      pagination: { ...prev.pagination, current: 1 },
      filters: { ...prev.filters, is_active: value },
    }));
  };

  const handleAdd = () => {
    setEditingObject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: ObjectItem) => {
    setEditingObject(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await objectsApi.delete(id);
      message.success('Объект удален');
      fetchObjects();
    } catch (error) {
      message.error('Ошибка удаления объекта');
      console.error('Error deleting object:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingObject) {
        await objectsApi.update(editingObject.id, values);
        message.success('Объект обновлен');
      } else {
        await objectsApi.create(values);
        message.success('Объект создан');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchObjects();
    } catch (error) {
      message.error('Ошибка сохранения объекта');
      console.error('Error saving object:', error);
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
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
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить этот объект?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="objects-page">
      <div className="page-header">
        <h1>Объекты</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить объект
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Поиск по названию..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ width: 250 }}
          />
          <Select
            placeholder="Статус"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={handleStatusFilter}
          >
            <Select.Option value={true}>Активные</Select.Option>
            <Select.Option value={false}>Неактивные</Select.Option>
          </Select>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={objects}
        loading={loading}
        rowKey="id"
        pagination={{
          ...tableParams.pagination,
          showSizeChanger: true,
          showTotal: (total) => `Всего объектов: ${total}`,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title={editingObject ? 'Редактировать объект' : 'Новый объект'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название объекта' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="address"
            label="Адрес"
            rules={[{ required: true, message: 'Введите адрес объекта' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ObjectsPage;
