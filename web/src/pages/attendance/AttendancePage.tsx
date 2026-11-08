import { Table, Card, DatePicker, Select, Button, Space, Tag, message } from 'antd';
import { FilterOutlined, ExportOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { attendanceApi } from '../../services/api';
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

const AttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | undefined>();
  const [selectedObject, setSelectedObject] = useState<string | undefined>();

  useEffect(() => {
    fetchAttendance();
  }, [dateRange, selectedUser, selectedObject]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
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

      const response = await attendanceApi.getAll(params);
      setRecords(response.data.data);
    } catch (error) {
      message.error('Ошибка загрузки данных присутствия');
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    message.info('Экспорт в Excel (TODO)');
    // TODO: Реализовать экспорт в Excel
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
      render: (time: string) => dayjs(time).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Время выхода',
      dataIndex: 'scan_timestamp_end',
      key: 'scan_timestamp_end',
      render: (time: string) => dayjs(time).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Длительность',
      key: 'duration',
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
        <Button icon={<ExportOutlined />} onClick={handleExport}>
          Экспорт в Excel
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
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Всего записей: ${total}`,
        }}
      />
    </div>
  );
};

export default AttendancePage;
