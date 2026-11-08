import { Table, Button, Space, Tag, Modal, Form, Input, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { objectsApi } from '../../services/api';
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
  const [modalVisible, setModalVisible] = useState(false);
  const [editingObject, setEditingObject] = useState<ObjectItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchObjects();
  }, []);

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const response = await objectsApi.getAll();
      setObjects(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки объектов');
      console.error('Error fetching objects:', error);
    } finally {
      setLoading(false);
    }
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

      <Table
        columns={columns}
        dataSource={objects}
        loading={loading}
        rowKey="id"
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
