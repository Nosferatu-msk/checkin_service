import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm, Card, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { objectsApi } from '../../services/api';
import './ObjectsPage.css';

interface ObjectItem {
  id: string;
  name: string;
  object_code: string;
  country: string;
  region?: string;
  city?: string;
  street?: string;
  building?: string;
  structure?: string;
  full_address: string;
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
  const [total, setTotal] = useState(0);
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
      const data = response.data.data || [];
      setObjects(data);
      setTotal(response.data.total || data.length);
    } catch (error) {
      message.error('Ошибка загрузки объектов');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableParams.pagination.current, tableParams.pagination.pageSize, tableParams.sorter, tableParams.filters]);

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
    form.setFieldsValue({ country: 'Россия' });
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
      title: 'Код',
      dataIndex: 'object_code',
      key: 'object_code',
      width: 120,
      sorter: true,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
    },
    {
      title: 'Адрес',
      dataIndex: 'full_address',
      key: 'full_address',
      ellipsis: true,
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
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
            placeholder="Поиск по названию, коду или адресу..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ width: 300 }}
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
          current: tableParams.pagination.current,
          pageSize: tableParams.pagination.pageSize,
          total: total,
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
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Название"
                rules={[{ required: true, message: 'Введите название объекта' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="object_code"
                label="Код объекта"
                rules={[
                  { required: true, message: 'Введите код объекта' },
                  { pattern: /^[A-Z]{2}\/\d+\/\d+$/, message: 'Формат: RU/77/1' },
                ]}
                tooltip="Уникальный код в формате: Страна/Регион/Номер (например, RU/77/1)"
              >
                <Input placeholder="RU/77/1" />
              </Form.Item>
            </Col>
          </Row>

          <Card type="inner" title="Адрес" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="country"
                  label="Страна"
                  rules={[{ required: true, message: 'Введите страну' }]}
                >
                  <Input defaultValue="Россия" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="region"
                  label="Регион"
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="city"
                  label="Населённый пункт"
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="street"
                  label="Улица"
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="building"
                  label="Дом"
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="structure"
                  label="Строение/корпус"
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      </Modal>
    </div>
  );
};

export default ObjectsPage;
