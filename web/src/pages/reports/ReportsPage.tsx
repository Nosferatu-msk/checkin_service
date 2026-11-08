import { Card, Row, Col, Statistic, Table, DatePicker, Select, Button, Space, message } from 'antd';
import { ExportOutlined, DownloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { objectsApi, beaconsApi, usersApi, attendanceApi } from '../../services/api';
import dayjs from 'dayjs';
import './ReportsPage.css';

const { RangePicker } = DatePicker;

const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedObject, setSelectedObject] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (dateRange) {
        params.from = dateRange[0].toISOString();
        params.to = dateRange[1].toISOString();
      }
      
      if (selectedObject) {
        params.object_id = selectedObject;
      }

      const response = await attendanceApi.getAll(params);
      setReportData(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки данных отчёта');
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    message.info('Экспорт в Excel (TODO)');
    // TODO: Реализовать экспорт в Excel с помощью exceljs
  };

  const handleExportPDF = () => {
    message.info('Экспорт в PDF (TODO)');
    // TODO: Реализовать экспорт в PDF
  };

  const summaryStats = {
    totalEmployees: 86,
    activeToday: 72,
    avgHours: 7.5,
    violations: 3,
  };

  const columns = [
    {
      title: 'Сотрудник',
      dataIndex: 'employee_name',
      key: 'employee_name',
    },
    {
      title: 'Объект',
      dataIndex: 'object_name',
      key: 'object_name',
    },
    {
      title: 'Рабочих дней',
      dataIndex: 'working_days',
      key: 'working_days',
    },
    {
      title: 'Отработано часов',
      dataIndex: 'hours_worked',
      key: 'hours_worked',
      render: (hours: number) => hours.toFixed(1),
    },
    {
      title: 'Нарушения',
      dataIndex: 'violations',
      key: 'violations',
    },
  ];

  const tableData = [
    { key: '1', employee_name: 'Иванов И.И.', object_name: 'БЦ "Москва"', working_days: 22, hours_worked: 176, violations: 0 },
    { key: '2', employee_name: 'Петров П.П.', object_name: 'Склад №3', working_days: 20, hours_worked: 160, violations: 2 },
    { key: '3', employee_name: 'Сидоров С.С.', object_name: 'Офис "Северный"', working_days: 21, hours_worked: 168, violations: 1 },
  ];

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Отчёты и аналитика</h1>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExportExcel}>
            Экспорт в Excel
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportPDF}>
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
            placeholder="Объект"
            allowClear
            style={{ width: 200 }}
            value={selectedObject}
            onChange={setSelectedObject}
          >
            <Select.Option value="object-1">БЦ "Москва"</Select.Option>
            <Select.Option value="object-2">Склад №3</Select.Option>
          </Select>
          <Button onClick={fetchReportData}>
            Сформировать отчёт
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Всего сотрудников" value={summaryStats.totalEmployees} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic 
              title="Активных сегодня" 
              value={summaryStats.activeToday}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic 
              title="Среднее рабочее время" 
              value={summaryStats.avgHours}
              suffix="часов"
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic 
              title="Нарушения" 
              value={summaryStats.violations}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Детализация по сотрудникам">
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Всего сотрудников: ${total}`,
          }}
        />
      </Card>
    </div>
  );
};

export default ReportsPage;
