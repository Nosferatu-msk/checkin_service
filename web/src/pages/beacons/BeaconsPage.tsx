import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, SearchOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { beaconsApi, zonesApi } from '../../services/api';
import './BeaconsPage.css';

interface BeaconItem {
  id: string;
  uuid: string;
  major: number;
  minor: number;
  mac_address?: string;
  zone_id: string;
  is_active: boolean;
  created_at: string;
  zone?: { id: string; name: string };
}

interface ZoneItem {
  id: string;
  name: string;
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
    zone_id?: string;
  };
}

const BeaconsPage: React.FC = () => {
  const [beacons, setBeacons] = useState<BeaconItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBeacon, setEditingBeacon] = useState<BeaconItem | null>(null);
  const [form] = Form.useForm();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { current: 1, pageSize: 10 },
    filters: {},
  });
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [zoneFilter, setZoneFilter] = useState<string | undefined>(undefined);

  const fetchBeacons = useCallback(async () => {
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

      if (tableParams.filters?.zone_id) {
        params.zone_id = tableParams.filters.zone_id;
      }

      const response = await beaconsApi.getAll(params);
      setBeacons(response.data.data);
      setTableParams(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: response.data.total || response.data.data.length,
        },
      }));
    } catch (error) {
      message.error('Ошибка загрузки маяков');
      console.error('Error fetching beacons:', error);
    } finally {
      setLoading(false);
    }
  }, [tableParams]);

  const fetchZones = async () => {
    try {
      const response = await zonesApi.getAll();
      setZones(response.data.data);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  useEffect(() => {
    fetchBeacons();
    fetchZones();
  }, [fetchBeacons]);

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
        zone_id: zoneFilter,
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

  const handleZoneFilter = (value: string | undefined) => {
    setZoneFilter(value);
    setTableParams(prev => ({
      ...prev,
      pagination: { ...prev.pagination, current: 1 },
      filters: { ...prev.filters, zone_id: value },
    }));
  };

  const handleAdd = () => {
    setEditingBeacon(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: BeaconItem) => {
    setEditingBeacon(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDeactivate = async (id: string) => {
    try {
      await beaconsApi.deactivate(id);
      message.success('Маяк деактивирован');
      fetchBeacons();
    } catch (error) {
      message.error('Ошибка деактивации маяка');
      console.error('Error deactivating beacon:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingBeacon) {
        await beaconsApi.update(editingBeacon.id, values);
        message.success('Маяк обновлен');
      } else {
        await beaconsApi.create(values);
        message.success('Маяк создан');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchBeacons();
    } catch (error) {
      message.error('Ошибка сохранения маяка');
      console.error('Error saving beacon:', error);
    }
  };

  const columns = [
    {
      title: 'UUID',
      dataIndex: 'uuid',
      key: 'uuid',
      width: 300,
    },
    {
      title: 'Major',
      dataIndex: 'major',
      key: 'major',
      width: 100,
      sorter: true,
    },
    {
      title: 'Minor',
      dataIndex: 'minor',
      key: 'minor',
      width: 100,
      sorter: true,
    },
    {
      title: 'MAC адрес',
      dataIndex: 'mac_address',
      key: 'mac_address',
      render: (mac: string) => mac || '-',
    },
    {
      title: 'Зона',
      key: 'zone',
      render: (_: any, record: BeaconItem) => record.zone?.name || '-',
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
      render: (_: any, record: BeaconItem) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            Редактировать
          </Button>
          {record.is_active && (
            <Popconfirm
              title="Деактивировать этот маяк?"
              onConfirm={() => handleDeactivate(record.id)}
              okText="Да"
              cancelText="Нет"
            >
              <Button icon={<StopOutlined />} size="small" danger>
                Деактивировать
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="beacons-page">
      <div className="page-header">
        <h1>Маяки</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить маяк
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Поиск по UUID/MAC..."
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
          <Select
            placeholder="Зона"
            allowClear
            style={{ width: 200 }}
            value={zoneFilter}
            onChange={handleZoneFilter}
          >
            {zones.map(zone => (
              <Select.Option key={zone.id} value={zone.id}>
                {zone.name}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={beacons}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1000 }}
        pagination={{
          ...tableParams.pagination,
          showSizeChanger: true,
          showTotal: (total) => `Всего маяков: ${total}`,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title={editingBeacon ? 'Редактировать маяк' : 'Новый маяк'}
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
            name="uuid"
            label="UUID"
            rules={[{ required: true, message: 'Введите UUID маяка' }]}
          >
            <Input placeholder="123e4567-e89b-12d3-a456-426614174000" />
          </Form.Item>
          <Form.Item
            name="major"
            label="Major"
            rules={[{ required: true, message: 'Введите Major value' }]}
          >
            <Input type="number" min={0} max={65535} />
          </Form.Item>
          <Form.Item
            name="minor"
            label="Minor"
            rules={[{ required: true, message: 'Введите Minor value' }]}
          >
            <Input type="number" min={0} max={65535} />
          </Form.Item>
          <Form.Item
            name="mac_address"
            label="MAC адрес"
          >
            <Input placeholder="00:11:22:33:44:55" />
          </Form.Item>
          <Form.Item
            name="zone_id"
            label="Зона"
            rules={[{ required: true, message: 'Выберите зону' }]}
          >
            <Select placeholder="Выберите зону">
              {zones.map(zone => (
                <Select.Option key={zone.id} value={zone.id}>
                  {zone.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BeaconsPage;
