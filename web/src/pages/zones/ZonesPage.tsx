import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm, TreeSelect } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { zonesApi, objectsApi } from '../../services/api';
import './ZonesPage.css';

interface ZoneItem {
  id: string;
  name: string;
  zone_type: 'floor' | 'room' | 'zone';
  level: number;
  object_id: string;
  parent_zone_id?: string;
  rssi_threshold: number;
  is_active: boolean;
  created_at: string;
  object?: { id: string; name: string };
  parent_zone?: { id: string; name: string };
}

interface ObjectItem {
  id: string;
  name: string;
}

const ZonesPage: React.FC = () => {
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchZones();
    fetchObjects();
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await zonesApi.getAll();
      setZones(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки зон');
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjects = async () => {
    try {
      const response = await objectsApi.getAll();
      setObjects(response.data.data);
    } catch (error) {
      console.error('Error fetching objects:', error);
    }
  };

  const handleAdd = () => {
    setEditingZone(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: ZoneItem) => {
    setEditingZone(record);
    form.setFieldsValue({
      ...record,
      object_id: record.object_id,
      parent_zone_id: record.parent_zone_id,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await zonesApi.delete(id);
      message.success('Зона удалена');
      fetchZones();
    } catch (error) {
      message.error('Ошибка удаления зоны');
      console.error('Error deleting zone:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingZone) {
        await zonesApi.update(editingZone.id, values);
        message.success('Зона обновлена');
      } else {
        await zonesApi.create(values);
        message.success('Зона создана');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchZones();
    } catch (error) {
      message.error('Ошибка сохранения зоны');
      console.error('Error saving zone:', error);
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Тип',
      dataIndex: 'zone_type',
      key: 'zone_type',
      render: (type: string) => {
        const colors: Record<string, string> = {
          floor: 'blue',
          room: 'green',
          zone: 'orange',
        };
        const labels: Record<string, string> = {
          floor: 'Этаж',
          room: 'Помещение',
          zone: 'Зона',
        };
        return <Tag color={colors[type]}>{labels[type]}</Tag>;
      },
    },
    {
      title: 'Объект',
      key: 'object',
      render: (_: any, record: ZoneItem) => record.object?.name || '-',
    },
    {
      title: 'Родительская зона',
      key: 'parent_zone',
      render: (_: any, record: ZoneItem) => record.parent_zone?.name || '-',
    },
    {
      title: 'RSSI порог',
      dataIndex: 'rssi_threshold',
      key: 'rssi_threshold',
      render: (threshold: number) => `${threshold} dBm`,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: ZoneItem) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить эту зону?"
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
    <div className="zones-page">
      <div className="page-header">
        <h1>Зоны</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить зону
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={zones}
        loading={loading}
        rowKey="id"
      />

      <Modal
        title={editingZone ? 'Редактировать зону' : 'Новая зона'}
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
            rules={[{ required: true, message: 'Введите название зоны' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="object_id"
            label="Объект"
            rules={[{ required: true, message: 'Выберите объект' }]}
          >
            <Select placeholder="Выберите объект">
              {objects.map(obj => (
                <Select.Option key={obj.id} value={obj.id}>
                  {obj.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="zone_type"
            label="Тип зоны"
            rules={[{ required: true, message: 'Выберите тип зоны' }]}
          >
            <Select placeholder="Выберите тип зоны">
              <Select.Option value="floor">Этаж</Select.Option>
              <Select.Option value="room">Помещение</Select.Option>
              <Select.Option value="zone">Зона</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="parent_zone_id"
            label="Родительская зона"
          >
            <TreeSelect
              placeholder="Выберите родительскую зону (опционально)"
              allowClear
              treeData={zones.map(z => ({
                title: z.name,
                value: z.id,
                key: z.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="rssi_threshold"
            label="RSSI порог (dBm)"
            rules={[{ required: true, message: 'Введите RSSI порог' }]}
            initialValue={-75}
          >
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ZonesPage;
