import { Table, Card, DatePicker, Select, Button, Space, Tag, Progress, message } from 'antd';
import { FilterOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { slaApi } from '../../services/api';
import { exportToExcel, exportToPDF } from '../../utils/export';
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

const SLAPage: React.FC = () => {
  const [violations, setViolations] = useState<SLAViolation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedContract, setSelectedContract] = useState<string | undefined>();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { current: 1, pageSize: 50 },
  });

  const fetchViolations = useCallback(async () => {
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

      if (selectedContract) {
        params.contract_id = selectedContract;
      }

      if (tableParams.sorter?.field) {
        params.sort_by = tableParams.sorter.field;
        params.sort_order = tableParams.sorter.order === 'ascend' ? 'asc' : 'desc';
      }

      const response = await slaApi.getViolations(params);
      setViolations(response.data.data);
      setTableParams(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: response.data.total || response.data.data.length,
        },
      }));
    } catch (error) {
      message.error('Ошибка загрузки данных SLA');
      console.error('Error fetching SLA violations:', error);
    } finally {
      setLoading(false);
    }
  }, [tableParams, dateRange, selectedContract]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setTableParams({
      pagination,
      sorter: {
        field: sorter.field,
        order: sorter.order,
      },
    });
  };

  const handleExportExcel = () => {
    if (violations.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }
    const exportData = violations.map(record => ({
      'Период': dayjs(record.period_date).format('DD.MM.YYYY'),
      'Объект': record.requirement?.zone?.object?.name || '-',
      'Зона': record.requirement?.zone?.name || '-',
      'Договор': record.requirement?.contract?.name || '-',
      'Требуется сотрудников': record.required_count,
      'Фактически': record.actual_count,
      'Дефицит': record.deficit,
      'Выполнение (%)': Math.round((record.actual_count / record.required_count) * 100),
    }));
    exportToExcel(
      exportData,
      `sla-${dayjs().format('YYYY-MM-DD')}`,
      'SLA'
    );
    message.success('Файл Excel успешно сформирован');
  };

  const handleExportPDF = async () => {
    if (violations.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }
    const exportData = violations.map(record => ({
      period: dayjs(record.period_date).format('DD.MM.YYYY'),
      object: record.requirement?.zone?.object?.name || '-',
      zone: record.requirement?.zone?.name || '-',
      contract: record.requirement?.contract?.name || '-',
      required: record.required_count,
      actual: record.actual_count,
      deficit: record.deficit,
      compliance: `${Math.round((record.actual_count / record.required_count) * 100)}%`,
    }));
    await exportToPDF(
      exportData,
      `sla-${dayjs().format('YYYY-MM-DD')}`,
      'Отчёт по выполнению SLA',
      ['Период', 'Объект', 'Зона', 'Договор', 'Требуется', 'Фактически', 'Дефицит', 'Выполнение']
    );
    message.success('Файл PDF успешно сформирован');
  };

  const columns = [
    {
      title: 'Период',
      dataIndex: 'period_date',
      key: 'period_date',
      sorter: true,
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
      sorter: true,
    },
    {
      title: 'Фактически',
      dataIndex: 'actual_count',
      key: 'actual_count',
      sorter: true,
    },
    {
      title: 'Дефицит',
      dataIndex: 'deficit',
      key: 'deficit',
      sorter: true,
      render: (deficit: number) => (
        <Tag color={deficit > 0 ? 'red' : 'green'}>
          {deficit > 0 ? `-${deficit}` : 'Норма'}
        </Tag>
      ),
    },
    {
      title: 'Выполнение',
      key: 'compliance',
      sorter: (a: SLAViolation, b: SLAViolation) => {
        const complianceA = (a.actual_count / a.required_count) * 100;
        const complianceB = (b.actual_count / b.required_count) * 100;
        return complianceA - complianceB;
      },
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
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
            Экспорт в Excel
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>
            Экспорт в PDF
          </Button>
        </Space>
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
          ...tableParams.pagination,
          showSizeChanger: true,
          showTotal: (total) => `Всего нарушений: ${total}`,
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default SLAPage;
