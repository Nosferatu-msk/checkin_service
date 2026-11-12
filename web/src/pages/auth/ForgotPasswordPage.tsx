import { Form, Input, Button, Card, message, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import './ForgotPasswordPage.css';

const ForgotPasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(values.email);
      setSuccess(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Ошибка отправки письма';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-password-page">
        <Card className="forgot-password-card">
          <Result
            status="success"
            title="Письмо отправлено"
            subTitle="Проверьте вашу почту для сброса пароля. Ссылка для сброса действительна в течение 1 часа."
            extra={
              <Link to="/login">
                <Button type="link" icon={<ArrowLeftOutlined />}>
                  Вернуться к входу
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <Card className="forgot-password-card">
        <div className="forgot-password-header">
          <h1>Восстановление пароля</h1>
          <p>Введите email, привязанный к аккаунту</p>
        </div>

        <Form
          form={form}
          name="forgot-password"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Введите корректный email' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Отправить письмо для сброса
            </Button>
          </Form.Item>

          <div className="forgot-password-footer">
            <Link to="/login">
              <Button type="link" icon={<ArrowLeftOutlined />}>
                Вернуться к входу
              </Button>
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
