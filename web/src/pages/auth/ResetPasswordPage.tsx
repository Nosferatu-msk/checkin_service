import { Form, Input, Button, Card, message, Result } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/api';
import './ResetPasswordPage.css';

const ResetPasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const [isValidToken, setIsValidToken] = useState(true);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
    }
  }, [token]);

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    if (!token) {
      message.error('Токен сброса пароля не найден');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, values.password);
      setSuccess(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Ошибка сброса пароля';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="reset-password-page">
        <Card className="reset-password-card">
          <Result
            status="error"
            title="Неверная ссылка"
            subTitle="Ссылка для сброса пароля недействительна или истекла. Запросите новый сброс пароля."
            extra={
              <Link to="/forgot-password">
                <Button type="primary">
                  Запросить новый сброс
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <Card className="reset-password-card">
          <Result
            status="success"
            title="Пароль успешно изменён"
            subTitle="Вы можете войти в систему с новым паролем"
            extra={
              <Link to="/login">
                <Button type="primary" icon={<CheckCircleOutlined />}>
                  Перейти к входу
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <Card className="reset-password-card">
        <div className="reset-password-header">
          <h1>Новый пароль</h1>
          <p>Придумайте новый пароль для вашего аккаунта</p>
        </div>

        <Form
          form={form}
          name="reset-password"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Введите новый пароль' },
              { min: 8, message: 'Пароль должен содержать минимум 8 символов' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Новый пароль"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Подтвердите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Пароли не совпадают'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Подтвердите пароль"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Сбросить пароль
            </Button>
          </Form.Item>

          <div className="reset-password-footer">
            <Link to="/login">
              <Button type="link">
                Вернуться к входу
              </Button>
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
