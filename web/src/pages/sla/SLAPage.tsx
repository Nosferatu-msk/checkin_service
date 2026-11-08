import { Table, Card, DatePicker, Select, Button, Space, Tag, Progress, message } from 'antd';
import { FilterOutlined, ExportOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { slaApi } from '../../services/api';
import dayjs from 'dayjs';
import './SLAPage.css';

const { RangePicker } = DatePicker;

interface SLAViolation {
  id: string;
  requirement_id: string;
  period_date: string;
  required_count: number;
  actual_count: number;
  deficit: number;
  requirement?: {
    id: string;
    zone_id: string;
    contract_id: string;
    min_employees: number;
    period_type: string;
    zone?: { id: string; name: string; object?: { id: string; name: string } };
    contract?: { id: string; name: string };
  };
}

const SLAPage: React.FC = () => {
  const [violations, setViolations] = useState<SLAViolation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedContract, setSelectedContract] = useState<string | undefined>();

  useEffect(() => {
    fetchViolations();
  }, [dateRange, selectedContract]);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (dateRange) {
        params.from = dateRange[0].toISOString();
        params.to = dateRange[1].toISOString();
      }
      
      if (selectedContract) {
        params.contract_id = selectedContract;
      }

      const response = await slaApi.getViolations(params);
      setViolations(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки данных SLA');
      console.error('Error fetching SLA violations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    message.info('Экспорт SLA отчёта (TODO)');
  };

  const columns = [
    {
      title: 'Период',
      dataIndex: 'period_date',
      key: 'period_date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Объект',
      key: 'object',
      render: (_: any, record: SLAViolation) => 
        record.requirement?.zone?.object?.name || '-',
    },
    {
      title: 'Зона',
      key: 'zone',
      render: (_: any, record: SLAViolation) => 
        record.requirement?.zone?.name || '-',
    },
    {
      title: 'Договор',
      key: 'contract',
      render: (_: any, record: SLAViolation) => 
        record.requirement?.contract?.name || '-',
    },
    {
      title: 'Требуется сотрудников',
      dataIndex: 'required_count',
      key: 'required_count',
    },
    {
      title: 'Фактически',
      dataIndex: 'actual_count',
      key: 'actual_count',
    },
    {
      title: 'Дефицит',
      dataIndex: 'deficit',
      key: 'deficit',
      render: (deficit: number) => (
        <Tag color={deficit > 0 ? 'red' : 'green'}>
          {deficit > 0 ? `-${deficit}` : 'Норма'}
        </Tag>
      ),
    },
    {
      title: 'Выполнение',
      key: 'compliance',
      render: (_: any, record: SLAViolation) => {
        const compliance = (record.actual_count / record.required_count) * 100;
        return (
          <Progress 
            percent={Math.round(compliance)} 
            status={compliance < 100 ? 'exception' : 'success'}
          />
        );
      },
    },
  ];

  return (
    <div className="sla-page">
      <div className="page-header">
        <h1>Выполнение SLA</h1>
        <Button icon={<ExportOutlined />} onClick={handleExport}>
          Экспорт отчёта
        </Button>
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
            placeholder="Договор"
            allowClear
            style={{ width: 200 }}
            value={selectedContract}
            onChange={setSelectedContract}
          >
            {/* TODO: Загрузить список договоров */}
            <Select.Option value="contract-1">Договор №1</Select.Option>
            <Select.Option value="contract-2">Договор №2</Select.Option>
          </Select>
          <Button icon={<FilterOutlined />} onClick={fetchViolations}>
            Применить фильтры
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={violations}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Всего нарушений: ${total}`,
        }}
      />
    </div>
  );
};

export default SLAPage;
