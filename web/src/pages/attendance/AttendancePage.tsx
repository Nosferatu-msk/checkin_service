import { Table, Card, DatePicker, Select, Button, Space, Tag, message } from 'antd';
import { FilterOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { attendanceApi } from '../../services/api';
import { exportToExcel, exportToPDF } from '../../utils/export';
import dayjs from 'dayjs';
import './AttendancePage.css';

const { RangePicker } = DatePicker;

interface AttendanceRecord {
  id: string;
  user_id: string;
  beacon_uuid: string;
  scan_timestamp_start: string;
  scan_timestamp_end: string;
  median_rssi: number;
  user?: { id: string; full_name: string; login: string };
  beacon?: {
    id: string;
    uuid: string;
    zone?: {
      id: string;
      name: string;
      object?: { id: string; name: string };
    };
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

const AttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | undefined>();
  const [selectedObject, setSelectedObject] = useState<string | undefined>();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { current: 1, pageSize: 50 },
  });

  const fetchAttendance = useCallback(async () => {
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

      if (selectedUser) {
        params.user_id = selectedUser;
      }

      if (selectedObject) {
        params.object_id = selectedObject;
      }

      if (tableParams.sorter?.field) {
        params.sort_by = tableParams.sorter.field;
        params.sort_order = tableParams.sorter.order === 'ascend' ? 'asc' : 'desc';
      }

      const response = await attendanceApi.getAll(params);
      setRecords(response.data.data);
      setTableParams(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: response.data.total || response.data.data.length,
        },
      }));
    } catch (error) {
      message.error('Ошибка загрузки данных присутствия');
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [tableParams, dateRange, selectedUser, selectedObject]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

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
    if (records.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }
    const exportData = records.map(record => ({
      'Сотрудник': record.user?.full_name || record.user?.login || '-',
      'Объект': record.beacon?.zone?.object?.name || '-',
      'Зона': record.beacon?.zone?.name || '-',
      'Время входа': dayjs(record.scan_timestamp_start).format('DD.MM.YYYY HH:mm'),
      'Время выхода': dayjs(record.scan_timestamp_end).format('DD.MM.YYYY HH:mm'),
      'Длительность (мин)': dayjs(record.scan_timestamp_end).diff(dayjs(record.scan_timestamp_start), 'minute'),
    }));
    exportToExcel(
      exportData,
      `attendance-${dayjs().format('YYYY-MM-DD')}`,
      'Присутствие'
    );
    message.success('Файл Excel успешно сформирован');
  };

  const handleExportPDF = async () => {
    if (records.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }
    const exportData = records.map(record => ({
      employee: record.user?.full_name || record.user?.login || '-',
      object: record.beacon?.zone?.object?.name || '-',
      zone: record.beacon?.zone?.name || '-',
      enter: dayjs(record.scan_timestamp_start).format('DD.MM.YYYY HH:mm'),
      exit: dayjs(record.scan_timestamp_end).format('DD.MM.YYYY HH:mm'),
      duration: `${dayjs(record.scan_timestamp_end).diff(dayjs(record.scan_timestamp_start), 'minute')} мин`,
    }));
    await exportToPDF(
      exportData,
      `attendance-${dayjs().format('YYYY-MM-DD')}`,
      'Отчёт по присутствию',
      ['Сотрудник', 'Объект', 'Зона', 'Вход', 'Выход', 'Длительность']
    );
    message.success('Файл PDF успешно сформирован');
  };

  const columns = [
    {
      title: 'Сотрудник',
      key: 'user',
      render: (_: any, record: AttendanceRecord) =>
        record.user?.full_name || record.user?.login || '-',
    },
    {
      title: 'Объект',
      key: 'object',
      render: (_: any, record: AttendanceRecord) =>
        record.beacon?.zone?.object?.name || '-',
    },
    {
      title: 'Зона',
      key: 'zone',
      render: (_: any, record: AttendanceRecord) =>
        record.beacon?.zone?.name || '-',
    },
    {
      title: 'Время входа',
      dataIndex: 'scan_timestamp_start',
      key: 'scan_timestamp_start',
      sorter: true,
      render: (time: string) => dayjs(time).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Время выхода',
      dataIndex: 'scan_timestamp_end',
      key: 'scan_timestamp_end',
      sorter: true,
      render: (time: string) => dayjs(time).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Длительность',
      key: 'duration',
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => {
        const durationA = dayjs(a.scan_timestamp_end).diff(dayjs(a.scan_timestamp_start), 'minute');
        const durationB = dayjs(b.scan_timestamp_end).diff(dayjs(b.scan_timestamp_start), 'minute');
        return durationA - durationB;
      },
      render: (_: any, record: AttendanceRecord) => {
        const start = dayjs(record.scan_timestamp_start);
        const end = dayjs(record.scan_timestamp_end);
        const duration = end.diff(start, 'minute');
        return `${duration} мин`;
      },
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: any, record: AttendanceRecord) => {
        const start = dayjs(record.scan_timestamp_start);
        const end = dayjs(record.scan_timestamp_end);
        const duration = end.diff(start, 'minute');

        if (duration < 5) {
          return <Tag color="orange">Короткое посещение</Tag>;
        }
        return <Tag color="green">Активно</Tag>;
      },
    },
  ];

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h1>Табель присутствия</h1>
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
            placeholder="Сотрудник"
            allowClear
            style={{ width: 200 }}
            value={selectedUser}
            onChange={setSelectedUser}
          >
            {/* TODO: Загрузить список сотрудников */}
            <Select.Option value="user-1">Иванов Иван</Select.Option>
            <Select.Option value="user-2">Петров Петр</Select.Option>
          </Select>
          <Select
            placeholder="Объект"
            allowClear
            style={{ width: 200 }}
            value={selectedObject}
            onChange={setSelectedObject}
          >
            {/* TODO: Загрузить список объектов */}
            <Select.Option value="object-1">БЦ "Москва"</Select.Option>
            <Select.Option value="object-2">Склад №3</Select.Option>
          </Select>
          <Button icon={<FilterOutlined />} onClick={fetchAttendance}>
            Применить фильтры
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={records}
        loading={loading}
        rowKey="id"
        pagination={{
          ...tableParams.pagination,
          showSizeChanger: true,
          showTotal: (total) => `Всего записей: ${total}`,
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default AttendancePage;
