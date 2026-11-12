import { Card, Form, Input, Button, Avatar, message, Descriptions } from 'antd';
import { UserOutlined, SaveOutlined, LockOutlined } from '@ant-design/icons';
import { useAppSelector } from '../../hooks/redux';
import { useState } from 'react';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const values = await profileForm.validateFields();
      console.log('Profile updated:', values);
      message.success('Профиль обновлен');
    } catch (error) {
      message.error('Ошибка обновления профиля');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      const values = await passwordForm.validateFields();
      
      if (values.new_password !== values.confirm_password) {
        message.error('Пароли не совпадают');
        return;
      }
      
      console.log('Password changed:', values);
      message.success('Пароль изменен');
      passwordForm.resetFields();
    } catch (error) {
      message.error('Ошибка изменения пароля');
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Профиль пользователя</h1>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Avatar size={120} icon={<UserOutlined />} />
          <h2 style={{ marginTop: 16 }}>{user?.full_name}</h2>
          <p>{user?.email}</p>
        </div>

        <Descriptions bordered column={1}>
          <Descriptions.Item label="Логин">{user?.login}</Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Роль">
            {user?.role === 'admin' && 'Администратор'}
            {user?.role === 'curator' && 'Куратор'}
            {user?.role === 'employee' && 'Сотрудник'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Редактировать профиль" style={{ marginBottom: 16 }}>
        <Form
          form={profileForm}
          layout="vertical"
          initialValues={{
            full_name: user?.full_name,
            email: user?.email,
            phone: '+7 (999) 123-45-67',
          }}
        >
          <Form.Item
            name="full_name"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Телефон"
          >
            <Input placeholder="+7 (999) 123-45-67" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleUpdateProfile}
              loading={loading}
            >
              Сохранить изменения
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Изменить пароль">
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="current_password"
            label="Текущий пароль"
            rules={[{ required: true, message: 'Введите текущий пароль' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="Новый пароль"
            rules={[
              { required: true, message: 'Введите новый пароль' },
              { min: 8, message: 'Пароль должен содержать минимум 8 символов' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="Подтвердите пароль"
            rules={[
              { required: true, message: 'Подтвердите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Пароли не совпадают'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<LockOutlined />}
              onClick={handleChangePassword}
              loading={loading}
            >
              Изменить пароль
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ProfilePage;
