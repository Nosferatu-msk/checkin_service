import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { login } from '../../store/slices/authSlice';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const onFinish = async (values: any) => {
    try {
      await dispatch(login({
        login: values.login,
        password: values.password,
        device_fingerprint: 'web-browser-fingerprint', // TODO: Реальный fingerprint
      })).unwrap();
      
      message.success('Вход выполнен успешно');
      navigate('/');
    } catch (err) {
      message.error(error || 'Ошибка входа');
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-header">
          <h1>Контроль присутствия</h1>
          <p>Войдите в систему</p>
        </div>
        
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="login"
            rules={[{ required: true, message: 'Введите логин' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Логин"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Пароль"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Войти
            </Button>
          </Form.Item>

          <div className="login-footer">
            <Link to="/forgot-password">Забыли пароль?</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
