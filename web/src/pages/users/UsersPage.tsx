import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { usersApi, contractsApi } from '../../services/api';
import './UsersPage.css';

interface UserItem {
  id: string;
  login: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  contract_id?: string;
  created_at: string;
  contract?: { id: string; name: string };
}

interface ContractItem {
  id: string;
  name: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
    fetchContracts();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersApi.getAll();
      setUsers(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки пользователей');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await contractsApi.getAll();
      setContracts(response.data.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: UserItem) => {
    setEditingUser(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDeactivate = async (id: string) => {
    try {
      await usersApi.deactivate(id);
      message.success('Пользователь деактивирован');
      fetchUsers();
    } catch (error) {
      message.error('Ошибка деактивации пользователя');
      console.error('Error deactivating user:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        await usersApi.update(editingUser.id, values);
        message.success('Пользователь обновлен');
      } else {
        await usersApi.create(values);
        message.success('Пользователь создан');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error('Ошибка сохранения пользователя');
      console.error('Error saving user:', error);
    }
  };

  const columns = [
    {
      title: 'Логин',
      dataIndex: 'login',
      key: 'login',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      key: 'full_name',
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colors: Record<string, string> = {
          admin: 'red',
          curator: 'blue',
          employee: 'green',
        };
        const labels: Record<string, string> = {
          admin: 'Администратор',
          curator: 'Куратор',
          employee: 'Сотрудник',
        };
        return <Tag color={colors[role]}>{labels[role]}</Tag>;
      },
    },
    {
      title: 'Подрядчик',
      key: 'contract',
      render: (_: any, record: UserItem) => record.contract?.name || '-',
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
      render: (_: any, record: UserItem) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            Редактировать
          </Button>
          {record.is_active && (
            <Popconfirm
              title="Деактивировать этого пользователя?"
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
    <div className="users-page">
      <div className="page-header">
        <h1>Пользователи</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить пользователя
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="id"
      />

      <Modal
        title={editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
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
            name="login"
            label="Логин"
            rules={[{ required: true, message: 'Введите логин' }]}
          >
            <Input />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, message: 'Введите пароль' }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="full_name"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select placeholder="Выберите роль">
              <Select.Option value="admin">Администратор</Select.Option>
              <Select.Option value="curator">Куратор</Select.Option>
              <Select.Option value="employee">Сотрудник</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="contract_id"
            label="Подрядчик"
          >
            <Select placeholder="Выберите подрядчика (опционально)">
              {contracts.map(contract => (
                <Select.Option key={contract.id} value={contract.id}>
                  {contract.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
