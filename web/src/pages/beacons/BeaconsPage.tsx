import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
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

const BeaconsPage: React.FC = () => {
  const [beacons, setBeacons] = useState<BeaconItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBeacon, setEditingBeacon] = useState<BeaconItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchBeacons();
    fetchZones();
  }, []);

  const fetchBeacons = async () => {
    setLoading(true);
    try {
      const response = await beaconsApi.getAll();
      setBeacons(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки маяков');
      console.error('Error fetching beacons:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await zonesApi.getAll();
      setZones(response.data.data);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
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
    },
    {
      title: 'Minor',
      dataIndex: 'minor',
      key: 'minor',
      width: 100,
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

      <Table
        columns={columns}
        dataSource={beacons}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1000 }}
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
