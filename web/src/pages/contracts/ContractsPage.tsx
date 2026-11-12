import { Table, Button, Space, Tag, Modal, Form, Input, DatePicker, message, Popconfirm, Select, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { contractsApi } from '../../services/api';
import dayjs from 'dayjs';
import './ContractsPage.css';

interface ContractItem {
  id: string;
  name: string;
  contractor_name: string;
  start_date: string;
  end_date: string;
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

const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractItem | null>(null);
  const [form] = Form.useForm();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { current: 1, pageSize: 10 },
    filters: {},
  });
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);

  const fetchContracts = useCallback(async () => {
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

      const response = await contractsApi.getAll(params);
      setContracts(response.data.data);
      setTableParams(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: response.data.total || response.data.data.length,
        },
      }));
    } catch (error) {
      message.error('Ошибка загрузки договоров');
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  }, [tableParams]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

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
    setEditingContract(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: ContractItem) => {
    setEditingContract(record);
    form.setFieldsValue({
      ...record,
      start_date: dayjs(record.start_date),
      end_date: dayjs(record.end_date),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await contractsApi.delete(id);
      message.success('Договор удален');
      fetchContracts();
    } catch (error) {
      message.error('Ошибка удаления договора');
      console.error('Error deleting contract:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
      };
      
      if (editingContract) {
        await contractsApi.update(editingContract.id, data);
        message.success('Договор обновлен');
      } else {
        await contractsApi.create(data);
        message.success('Договор создан');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchContracts();
    } catch (error) {
      message.error('Ошибка сохранения договора');
      console.error('Error saving contract:', error);
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
      title: 'Подрядчик',
      dataIndex: 'contractor_name',
      key: 'contractor_name',
      sorter: true,
    },
    {
      title: 'Дата начала',
      dataIndex: 'start_date',
      key: 'start_date',
      sorter: true,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Дата окончания',
      dataIndex: 'end_date',
      key: 'end_date',
      sorter: true,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
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
      render: (_: any, record: ContractItem) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить этот договор?"
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
    <div className="contracts-page">
      <div className="page-header">
        <h1>Договоры</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить договор
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Поиск по названию/подрядчику..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
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
        dataSource={contracts}
        loading={loading}
        rowKey="id"
        pagination={{
          ...tableParams.pagination,
          showSizeChanger: true,
          showTotal: (total) => `Всего договоров: ${total}`,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title={editingContract ? 'Редактировать договор' : 'Новый договор'}
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
            label="Название договора"
            rules={[{ required: true, message: 'Введите название договора' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="contractor_name"
            label="Подрядчик"
            rules={[{ required: true, message: 'Введите название подрядчика' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="start_date"
            label="Дата начала"
            rules={[{ required: true, message: 'Выберите дату начала' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item
            name="end_date"
            label="Дата окончания"
            rules={[{ required: true, message: 'Выберите дату окончания' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractsPage;
