import { Card, Form, Input, Button, Switch, Select, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useState } from 'react';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      console.log('Settings saved:', values);
      message.success('Настройки сохранены');
    } catch (error) {
      message.error('Ошибка сохранения настроек');
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Настройки системы</h1>
      </div>

      <Card title="Общие настройки" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            site_name: 'Контроль присутствия',
            timezone: 'Europe/Moscow',
            language: 'ru',
          }}
        >
          <Form.Item
            name="site_name"
            label="Название системы"
            rules={[{ required: true, message: 'Введите название системы' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="timezone"
            label="Часовой пояс"
            rules={[{ required: true, message: 'Выберите часовой пояс' }]}
          >
            <Select>
              <Select.Option value="Europe/Moscow">Москва (UTC+3)</Select.Option>
              <Select.Option value="Europe/London">Лондон (UTC+0)</Select.Option>
              <Select.Option value="America/New_York">Нью-Йорк (UTC-5)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="language"
            label="Язык интерфейса"
            rules={[{ required: true, message: 'Выберите язык' }]}
          >
            <Select>
              <Select.Option value="ru">Русский</Select.Option>
              <Select.Option value="en">English</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Настройки уведомлений" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            email_notifications: true,
            push_notifications: true,
            sms_notifications: false,
          }}
        >
          <Form.Item
            name="email_notifications"
            label="Email уведомления"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="push_notifications"
            label="Push уведомления"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="sms_notifications"
            label="SMS уведомления"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Card>

      <Card title="Настройки безопасности" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            two_factor_auth: false,
            session_timeout: 30,
            password_min_length: 8,
          }}
        >
          <Form.Item
            name="two_factor_auth"
            label="Двухфакторная аутентификация"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="session_timeout"
            label="Тайм-аут сессии (минуты)"
            rules={[{ required: true, message: 'Введите тайм-аут' }]}
          >
            <Input type="number" min={5} max={480} />
          </Form.Item>
          <Form.Item
            name="password_min_length"
            label="Минимальная длина пароля"
            rules={[{ required: true, message: 'Введите минимальную длину' }]}
          >
            <Input type="number" min={6} max={32} />
          </Form.Item>
        </Form>
      </Card>

      <Card title="Интеграции" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="smtp_host"
            label="SMTP хост"
          >
            <Input placeholder="smtp.example.com" />
          </Form.Item>
          <Form.Item
            name="smtp_port"
            label="SMTP порт"
          >
            <Input type="number" placeholder="587" />
          </Form.Item>
          <Form.Item
            name="fcm_project_id"
            label="FCM Project ID"
          >
            <Input placeholder="your-project-id" />
          </Form.Item>
        </Form>
      </Card>

      <div style={{ textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={loading}
          size="large"
        >
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
