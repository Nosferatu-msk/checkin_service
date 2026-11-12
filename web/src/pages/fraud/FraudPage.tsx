import { Table, Card, DatePicker, Select, Button, Space, Tag, Modal, Form, Input, message } from 'antd';
import { FilterOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { fraudApi } from '../../services/api';
import dayjs from 'dayjs';
import './FraudPage.css';

const { RangePicker } = DatePicker;

interface FraudLog {
  id: string;
  user_id?: string;
  fraud_type: string;
  severity: 'info' | 'warning' | 'critical';
  details: any;
  is_reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  user?: { id: string; full_name: string; login: string };
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
}

const FraudPage: React.FC = () => {
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<FraudLog | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [selectedSeverity, setSelectedSeverity] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { current: 1, pageSize: 50 },
  });

  const fetchFraudLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: tableParams.pagination.current,
        limit: tableParams.pagination.pageSize,
      };

      if (dateRange) {
        params.from = dateRange[0].toISOString();
        params.to = dateRange[1].toISOString();
      }

      if (selectedType) {
        params.fraud_type = selectedType;
      }

      if (selectedSeverity) {
        params.severity = selectedSeverity;
      }

      if (tableParams.sorter?.field) {
        params.sort_by = tableParams.sorter.field;
        params.sort_order = tableParams.sorter.order === 'ascend' ? 'asc' : 'desc';
      }

      const response = await fraudApi.getAll(params);
      setFraudLogs(response.data.data);
      setTableParams(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: response.data.total || response.data.data.length,
        },
      }));
    } catch (error) {
      message.error('Ошибка загрузки данных фрод-мониторинга');
      console.error('Error fetching fraud logs:', error);
    } finally {
      setLoading(false);
    }
  }, [tableParams, dateRange, selectedType, selectedSeverity]);

  useEffect(() => {
    fetchFraudLogs();
  }, [fetchFraudLogs]);

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setTableParams({
      pagination,
      sorter: {
        field: sorter.field,
        order: sorter.order,
      },
    });
  };

  const handleViewDetails = (record: FraudLog) => {
    setSelectedLog(record);
    setModalVisible(true);
  };

  const handleReview = async () => {
    try {
      const values = await form.validateFields();
      await fraudApi.review(selectedLog!.id, { is_reviewed: true, notes: values.notes });
      message.success('Инцидент рассмотрен');
      setModalVisible(false);
      form.resetFields();
      fetchFraudLogs();
    } catch (error) {
      message.error('Ошибка рассмотрения инцидента');
      console.error('Error reviewing fraud log:', error);
    }
  };

  const columns = [
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: true,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Тип фрода',
      dataIndex: 'fraud_type',
      key: 'fraud_type',
      sorter: true,
      render: (type: string) => {
        const labels: Record<string, string> = {
          mock_location: 'Подмена GPS',
          account_sharing: 'Передача аккаунта',
          device_tampering: 'Вмешательство в устройство',
          fake_beacon: 'Поддельный маяк',
        };
        return labels[type] || type;
      },
    },
    {
      title: 'Сотрудник',
      key: 'user',
      render: (_: any, record: FraudLog) =>
        record.user?.full_name || record.user?.login || '-',
    },
    {
      title: 'Серьёзность',
      dataIndex: 'severity',
      key: 'severity',
      sorter: true,
      render: (severity: string) => {
        const colors: Record<string, string> = {
          info: 'blue',
          warning: 'orange',
          critical: 'red',
        };
        const labels: Record<string, string> = {
          info: 'Информация',
          warning: 'Предупреждение',
          critical: 'Критично',
        };
        return <Tag color={colors[severity]}>{labels[severity]}</Tag>;
      },
    },
    {
      title: 'Статус',
      dataIndex: 'is_reviewed',
      key: 'is_reviewed',
      render: (reviewed: boolean) => (
        <Tag color={reviewed ? 'green' : 'orange'}>
          {reviewed ? 'Рассмотрен' : 'Новый'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: FraudLog) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetails(record)}
          >
            Просмотр
          </Button>
          {!record.is_reviewed && (
            <Button
              icon={<CheckOutlined />}
              size="small"
              type="primary"
              onClick={() => handleViewDetails(record)}
            >
              Рассмотреть
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="fraud-page">
      <div className="page-header">
        <h1>Фрод-мониторинг</h1>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="DD.MM.YYYY"
            placeholder={['Начало', 'Конец']}
          />
          <Select
            placeholder="Тип фрода"
            allowClear
            style={{ width: 200 }}
            value={selectedType}
            onChange={setSelectedType}
          >
            <Select.Option value="mock_location">Подмена GPS</Select.Option>
            <Select.Option value="account_sharing">Передача аккаунта</Select.Option>
            <Select.Option value="device_tampering">Вмешательство в устройство</Select.Option>
            <Select.Option value="fake_beacon">Поддельный маяк</Select.Option>
          </Select>
          <Select
            placeholder="Серьёзность"
            allowClear
            style={{ width: 200 }}
            value={selectedSeverity}
            onChange={setSelectedSeverity}
          >
            <Select.Option value="info">Информация</Select.Option>
            <Select.Option value="warning">Предупреждение</Select.Option>
            <Select.Option value="critical">Критично</Select.Option>
          </Select>
          <Button icon={<FilterOutlined />} onClick={fetchFraudLogs}>
            Применить фильтры
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={fraudLogs}
        loading={loading}
        rowKey="id"
        pagination={{
          ...tableParams.pagination,
          showSizeChanger: true,
          showTotal: (total) => `Всего инцидентов: ${total}`,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title="Детали инцидента"
        open={modalVisible}
        onOk={handleReview}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        okText="Рассмотрен"
        cancelText="Закрыть"
      >
        {selectedLog && (
          <div>
            <p><strong>Тип фрода:</strong> {selectedLog.fraud_type}</p>
            <p><strong>Серьёзность:</strong> {selectedLog.severity}</p>
            <p><strong>Дата:</strong> {dayjs(selectedLog.created_at).format('DD.MM.YYYY HH:mm')}</p>
            <p><strong>Сотрудник:</strong> {selectedLog.user?.full_name || '-'}</p>
            <p><strong>Детали:</strong></p>
            <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
            
            {!selectedLog.is_reviewed && (
              <Form form={form} layout="vertical">
                <Form.Item
                  name="notes"
                  label="Комментарий"
                  rules={[{ required: true, message: 'Введите комментарий' }]}
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
              </Form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FraudPage;
