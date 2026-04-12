import { useEffect, useState, useMemo } from 'react';
import {
  Table, Card, Input, DatePicker, Tag, Space,
  Typography, Button, Modal, Descriptions,
} from 'antd';
import { SearchOutlined, ReloadOutlined, HistoryOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

dayjs.extend(utc);
dayjs.extend(timezone);
const MNL = 'Asia/Manila';
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const fmt = (d?: string) => d ? dayjs(d).tz(MNL).format('hh:mm A') : '—';
const fmtDate = (d: string) => dayjs(d).tz(MNL).format('MMM D, YYYY');

interface VisitorInfo { _id: string; firstName: string; surname: string; role: string; }
interface VisitRecord {
  _id: string;
  visitorId?: VisitorInfo;
  date: string;
  timeIn?: string;
  timeOut?: string;
  purpose: string;
  platesNumber?: string;
  incompleteExit?: boolean;
  scannedBy?: { firstName: string; surname: string };
}

const VisitLogs = () => {
  const { user } = useAuth();
  const [data, setData] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<VisitRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Security roles + admins can see all; Student/Visitor see own
  const canSeeAll = ['superadmin', 'security_head', 'security_staff', 'hr_head', 'hr_staff'].includes(user?.subRole || '');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateRange) {
        params.dateFrom = dateRange[0].startOf('day').toISOString();
        params.dateTo = dateRange[1].endOf('day').toISOString();
      }
      const res = await api.get(canSeeAll ? '/visit-logs' : '/visit-logs/my', { params });
      const raw = res.data?.data || res.data || [];
      setData(Array.isArray(raw) ? raw : []);
    } catch { setData([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateRange]);

  const filtered = useMemo(() =>
    data.filter(r => {
      const name = r.visitorId ? `${r.visitorId.firstName} ${r.visitorId.surname}`.toLowerCase() : '';
      return !search || name.includes(search.toLowerCase());
    }), [data, search]);

  const renderTimeOut = (t?: string, incomplete?: boolean) => {
    if (t) return <Tag color="volcano">{fmt(t)}</Tag>;
    if (incomplete) return <Tag color="orange" icon={<WarningOutlined />}>Incomplete</Tag>;
    return <Tag color="green">Still Inside</Tag>;
  };

  const columns: ColumnsType<VisitRecord> = [
    ...(canSeeAll ? [{ title: 'Visitor', key: 'visitor', render: (_: unknown, r: VisitRecord) => r.visitorId ? <Text strong>{r.visitorId.firstName} {r.visitorId.surname}</Text> : '—' }] : []),
    { title: 'Date', dataIndex: 'date', render: fmtDate, sorter: (a: VisitRecord, b: VisitRecord) => dayjs(a.date).unix() - dayjs(b.date).unix(), defaultSortOrder: 'descend' as const },
    { title: 'Time In', dataIndex: 'timeIn', render: fmt },
    { title: 'Time Out', key: 'timeOut', render: (_: unknown, r: VisitRecord) => renderTimeOut(r.timeOut, r.incompleteExit) },
    { title: 'Purpose', dataIndex: 'purpose', ellipsis: true },
    { title: 'Plates', dataIndex: 'platesNumber', render: (p?: string) => p || '—' },
    ...(canSeeAll ? [{ title: 'Scanned By', key: 'by', render: (_: unknown, r: VisitRecord) => r.scannedBy ? `${r.scannedBy.firstName} ${r.scannedBy.surname}` : '—' }] : []),
  ];

  return (
    <>
      <Card
        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Title level={4} style={{ margin: 0 }}><HistoryOutlined /> Visit Logs</Title>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          </div>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          {canSeeAll && <Input prefix={<SearchOutlined />} placeholder="Search visitor" allowClear style={{ width: 240 }} onChange={e => setSearch(e.target.value)} />}
          <RangePicker onChange={dates => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
        </Space>
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns} dataSource={filtered} rowKey="_id" loading={loading} scroll={{ x: 700 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
            rowClassName={r => r.incompleteExit && !r.timeOut ? 'visit-log-incomplete' : ''}
            onRow={r => ({ onClick: () => { setSelected(r); setModalOpen(true); }, style: { cursor: 'pointer' } })}
          />
          <style>{`.visit-log-incomplete { background: #fffbe6; } .visit-log-incomplete:hover > td { background: #fff1b8 !important; }`}</style>
        </div>
      </Card>
      <Modal open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={600} centered title={<Space><ClockCircleOutlined /> Visit Detail</Space>}>
        {selected && (
          <Descriptions bordered size="small" column={2}>
            {canSeeAll && <Descriptions.Item label="Visitor" span={2}>{selected.visitorId ? `${selected.visitorId.firstName} ${selected.visitorId.surname}` : '—'}</Descriptions.Item>}
            <Descriptions.Item label="Date">{fmtDate(selected.date)}</Descriptions.Item>
            <Descriptions.Item label="Status">
              {selected.incompleteExit && !selected.timeOut
                ? <Tag color="orange" icon={<WarningOutlined />}>Incomplete Exit</Tag>
                : selected.timeOut ? <Tag color="default">Exited</Tag> : <Tag color="green">Inside</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Time In"><Tag color="green">{fmt(selected.timeIn)}</Tag></Descriptions.Item>
            <Descriptions.Item label="Time Out">{selected.timeOut ? <Tag color="volcano">{fmt(selected.timeOut)}</Tag> : <Tag color="green">Still Inside</Tag>}</Descriptions.Item>
            <Descriptions.Item label="Purpose" span={2}>{selected.purpose || '—'}</Descriptions.Item>
            <Descriptions.Item label="Plates">{selected.platesNumber || '—'}</Descriptions.Item>
            {canSeeAll && <Descriptions.Item label="Scanned By">{selected.scannedBy ? `${selected.scannedBy.firstName} ${selected.scannedBy.surname}` : '—'}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default VisitLogs;
