import { useEffect, useState } from 'react';
import {
  Table, Card, Input, DatePicker, Select, Tag, Space,
  Typography, Button, Modal, Descriptions, Tabs,
} from 'antd';
import { SearchOutlined, ReloadOutlined, SwapOutlined } from '@ant-design/icons';
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
const { Title } = Typography;
const { Option } = Select;

const fmt = (d?: string) => d ? dayjs(d).tz(MNL).format('hh:mm A') : '—';
const fmtDate = (d: string) => dayjs(d).tz(MNL).format('MMM D, YYYY');
const diffMins = (start?: string, end?: string) =>
  start && end ? `${dayjs(end).diff(dayjs(start), 'minute')} mins` : '—';

interface PersonInfo { _id: string; firstName: string; surname: string; role: string; subRole?: string; }
interface TransactionRecord {
  _id: string;
  clientId?: PersonInfo;
  staffId?: PersonInfo;
  transactionStart: string;
  transactionEnd?: string;
  transactionType: string;
  scannedBy?: string;
  notes?: string;
}

const TransactionLogs = () => {
  const { user } = useAuth();
  const [providerData, setProviderData] = useState<TransactionRecord[]>([]);
  const [clientData, setClientData] = useState<TransactionRecord[]>([]);
  const [allData, setAllData] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TransactionRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isStudentOrVisitor = user?.role === 'Student' || user?.role === 'Visitor';
  const isMaintenanceOrFaculty = user?.subRole === 'maintenance' || user?.subRole === 'faculty';
  const subRole = user?.subRole ?? '';
  const isGlobalReader = ['hr_head', 'hr_staff', 'superadmin', 'top_management'].includes(subRole);
  // Client-only roles show no provider tab at all
  const isClientOnly = isStudentOrVisitor || isMaintenanceOrFaculty;
  const [activeTab, setActiveTab] = useState(isClientOnly ? 'client' : 'provider');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateRange) {
        params.dateFrom = dateRange[0].startOf('day').toISOString();
        params.dateTo = dateRange[1].endOf('day').toISOString();
      }
      if (isGlobalReader) {
        const res = await api.get('/transaction-logs/all', { params });
        setAllData(res.data?.data || res.data || []);
      } else if (isClientOnly) {
        // Student, Visitor, Maintenance — client only
        const cRes = await api.get('/transaction-logs/own', { params: { ...params, role: 'client' } });
        setClientData(cRes.data?.data || cRes.data || []);
      } else {
        const [pRes, cRes] = await Promise.all([
          api.get('/transaction-logs/own', { params: { ...params, role: 'provider' } }),
          api.get('/transaction-logs/own', { params: { ...params, role: 'client' } }),
        ]);
        setProviderData(pRes.data?.data || pRes.data || []);
        setClientData(cRes.data?.data || cRes.data || []);
      }
    } catch { setProviderData([]); setClientData([]); setAllData([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateRange]);

  const filterRecords = (records: TransactionRecord[]) =>
    records.filter(r => {
      const nameMatch = !search || [r.clientId?.firstName, r.clientId?.surname, r.staffId?.firstName, r.staffId?.surname]
        .some(n => n?.toLowerCase().includes(search.toLowerCase()));
      return nameMatch && (!typeFilter || r.transactionType === typeFilter);
    });

  const makeColumns = (tab: 'provider' | 'client' | 'all'): ColumnsType<TransactionRecord> => [
    ...(tab === 'all' || tab === 'provider' ? [{ title: 'Client', key: 'client', render: (_: unknown, r: TransactionRecord) => r.clientId ? `${r.clientId.firstName} ${r.clientId.surname}` : '—' }] : []),
    ...(tab === 'all' || tab === 'client' ? [{ title: 'Provider', key: 'staff', render: (_: unknown, r: TransactionRecord) => r.staffId ? `${r.staffId.firstName} ${r.staffId.surname}` : '—' }] : []),
    { title: 'Type', dataIndex: 'transactionType', render: (t: string) => <Tag color="purple">{t?.toUpperCase()}</Tag> },
    { title: 'Start', dataIndex: 'transactionStart', render: fmt, sorter: (a: TransactionRecord, b: TransactionRecord) => dayjs(a.transactionStart).unix() - dayjs(b.transactionStart).unix(), defaultSortOrder: 'descend' as const },
    { title: 'End', dataIndex: 'transactionEnd', render: (t?: string) => t ? <Tag color="volcano">{fmt(t)}</Tag> : <Tag color="green">Ongoing</Tag> },
    { title: 'Duration', key: 'dur', render: (_: unknown, r: TransactionRecord) => diffMins(r.transactionStart, r.transactionEnd) },
    { title: 'Date', dataIndex: 'transactionStart', key: 'date', render: fmtDate },
  ];

  const renderTable = (records: TransactionRecord[], tab: 'provider' | 'client' | 'all') => (
    <div style={{ overflowX: 'auto' }}>
      <Table
        columns={makeColumns(tab)} dataSource={filterRecords(records)} rowKey="_id"
        loading={loading} scroll={{ x: 800 }} pagination={{ pageSize: 15, showSizeChanger: true }}
        onRow={r => ({ onClick: () => { setSelected(r); setModalOpen(true); }, style: { cursor: 'pointer' } })}
      />
    </div>
  );

  const filters = (
    <Space wrap style={{ marginBottom: 16 }}>
      <Input prefix={<SearchOutlined />} placeholder="Search" allowClear style={{ width: 220 }} onChange={e => setSearch(e.target.value)} />
      <Select placeholder="Type" allowClear style={{ width: 160 }} onChange={setTypeFilter} value={typeFilter || undefined}>
        {['payment', 'enrollment', 'application', 'inquiry', 'document', 'other'].map(t => (
          <Option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</Option>
        ))}
      </Select>
      <RangePicker onChange={dates => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
    </Space>
  );

  return (
    <>
      <Card
        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Title level={4} style={{ margin: 0 }}><SwapOutlined /> Transaction Logs</Title>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          </div>
        }
      >
        {filters}
        {isGlobalReader ? renderTable(allData, 'all') : isClientOnly ? (
          // Student, Visitor, Maintenance: client-only — provider tab absent from DOM
          renderTable(clientData, 'client')
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            { key: 'provider', label: 'As Service Provider', children: renderTable(providerData, 'provider') },
            { key: 'client', label: 'As Client', children: renderTable(clientData, 'client') },
          ]} />
        )}
      </Card>
      <Modal open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={620} centered title={<Space><SwapOutlined /> Transaction Detail</Space>}>
        {selected && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Client" span={2}>{selected.clientId ? `${selected.clientId.firstName} ${selected.clientId.surname}` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Provider" span={2}>{selected.staffId ? `${selected.staffId.firstName} ${selected.staffId.surname}` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Type"><Tag color="purple">{selected.transactionType?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Date">{fmtDate(selected.transactionStart)}</Descriptions.Item>
            <Descriptions.Item label="Start"><Tag color="green">{fmt(selected.transactionStart)}</Tag></Descriptions.Item>
            <Descriptions.Item label="End">{selected.transactionEnd ? <Tag color="volcano">{fmt(selected.transactionEnd)}</Tag> : <Tag color="blue">Ongoing</Tag>}</Descriptions.Item>
            <Descriptions.Item label="Duration">{diffMins(selected.transactionStart, selected.transactionEnd)}</Descriptions.Item>
            <Descriptions.Item label="Scanned By">{selected.scannedBy || '—'}</Descriptions.Item>
            {selected.notes && <Descriptions.Item label="Notes" span={2}>{selected.notes}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default TransactionLogs;
