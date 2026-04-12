import { useEffect, useState } from 'react';
import {
  Table, Card, Input, DatePicker, Select, Tag, Space,
  Typography, Button, Modal, Descriptions, Alert,
} from 'antd';
import { SearchOutlined, ReloadOutlined, AuditOutlined } from '@ant-design/icons';
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
const { Option } = Select;

const fmtDt = (d?: string) => d ? dayjs(d).tz(MNL).format('MMM D, YYYY hh:mm:ss A') : '—';
const severityColor: Record<string, string> = { low: 'green', info: 'blue', warning: 'gold', critical: 'red' };

interface ActorInfo { firstName: string; surname: string; role: string; subRole?: string; }
interface TargetInfo { firstName: string; surname: string; role: string; }

interface ActionLogRecord {
  _id: string;
  performedBy?: ActorInfo;
  action: string;
  targetId?: TargetInfo;
  targetModel?: string;
  details?: string;
  severity: 'low' | 'info' | 'warning' | 'critical';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const ActionLogs = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ActionLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selected, setSelected] = useState<ActionLogRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Superadmin sees all — everyone else sees their own
  const canSeeAll = user?.subRole === 'superadmin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateRange) {
        params.dateFrom = dateRange[0].startOf('day').toISOString();
        params.dateTo = dateRange[1].endOf('day').toISOString();
      }
      // superadmin → full log, everyone else → own log
      const endpoint = canSeeAll ? '/action-logs' : '/action-logs/my';
      const res = await api.get(endpoint, { params });
      const raw = res.data?.data || res.data?.logs || res.data || [];
      setData(Array.isArray(raw) ? raw : []);
    } catch { setData([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateRange, canSeeAll]);

  const filtered = data.filter(r => {
    const actor = r.performedBy ? `${r.performedBy.firstName} ${r.performedBy.surname}`.toLowerCase() : '';
    const matchSearch = !search || actor.includes(search.toLowerCase()) || r.action.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (!severityFilter || r.severity === severityFilter);
  });

  const isStudentOrVisitor = user?.role === 'Student' || user?.role === 'Visitor';

  let columns: ColumnsType<ActionLogRecord> = [];
  
  if (isStudentOrVisitor) {
    columns = [
      { title: 'Action', dataIndex: 'action', render: (a: string) => <Tag color="orange">{a}</Tag> },
      { title: 'Timestamp', dataIndex: 'createdAt', render: fmtDt, sorter: (a: ActionLogRecord, b: ActionLogRecord) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(), defaultSortOrder: 'descend' as const },
      { title: 'IP Address', dataIndex: 'ipAddress' },
    ];
  } else {
    columns = [
      ...(canSeeAll ? [{
        title: 'Actor', key: 'actor',
        render: (_: unknown, r: ActionLogRecord) => r.performedBy
          ? <Text strong>{r.performedBy.firstName} {r.performedBy.surname} <Tag style={{ marginLeft: 4 }}>{r.performedBy.role}</Tag></Text>
          : <Text type="secondary">System</Text>,
      }] : []),
      { title: 'Action', dataIndex: 'action', render: (a: string) => <Tag color="orange">{a}</Tag> },
      {
        title: 'Target', key: 'target',
        render: (_: unknown, r: ActionLogRecord) => r.targetId
          ? `${r.targetId.firstName} ${r.targetId.surname}`
          : r.targetModel ? <Tag>{r.targetModel}</Tag> : '—',
      },
      { title: 'Severity', dataIndex: 'severity', render: (s: string) => <Tag color={severityColor[s] || 'default'}>{s?.toUpperCase()}</Tag> },
      { title: 'Details', dataIndex: 'details', ellipsis: true },
      { title: 'Timestamp', dataIndex: 'createdAt', render: fmtDt, sorter: (a: ActionLogRecord, b: ActionLogRecord) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(), defaultSortOrder: 'descend' as const },
    ];
  }

  return (
    <>
      <Card
        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Space>
              <Title level={4} style={{ margin: 0 }}><AuditOutlined /> {canSeeAll ? 'System Action Log' : 'My Activity Log'}</Title>
              {canSeeAll && <Tag color="red">Admin View</Tag>}
            </Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          </div>
        }
      >
        {canSeeAll && (
          <Alert type="warning" showIcon message="Tamper-evident audit trail. DPA 2012 compliance." style={{ marginBottom: 16 }} />
        )}
        <div style={{ overflowX: 'auto' }}>
          {!isStudentOrVisitor && (
            <Space wrap style={{ marginBottom: 16 }}>
              <Input prefix={<SearchOutlined />} placeholder="Search action" allowClear style={{ width: 240 }} onChange={e => setSearch(e.target.value)} />
              <Select placeholder="Severity" allowClear style={{ width: 150 }} onChange={setSeverityFilter} value={severityFilter || undefined}>
                <Option value="low">Low</Option>
                <Option value="info">Info</Option>
                <Option value="warning">Warning</Option>
                <Option value="critical">Critical</Option>
              </Select>
              <RangePicker onChange={dates => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
            </Space>
          )}
          {isStudentOrVisitor && (
            <Space wrap style={{ marginBottom: 16 }}>
              <RangePicker onChange={dates => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
            </Space>
          )}
          <Table
            columns={columns} dataSource={filtered} rowKey="_id" loading={loading} scroll={{ x: 800 }}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            rowClassName={r => r.severity === 'critical' ? 'action-log-critical' : ''}
            onRow={r => ({ onClick: () => { setSelected(r); setModalOpen(true); }, style: { cursor: 'pointer' } })}
          />
          <style>{`.action-log-critical { background: #fff1f0; } .action-log-critical:hover > td { background: #ffccc7 !important; }`}</style>
        </div>
      </Card>
      <Modal open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={680} centered title={<Space><AuditOutlined /> Action Log Detail</Space>}>
        {selected && (
          <Descriptions bordered size="small" column={2}>
            {canSeeAll && (
              <Descriptions.Item label="Actor" span={2}>
                {selected.performedBy ? `${selected.performedBy.firstName} ${selected.performedBy.surname} (${selected.performedBy.role}${selected.performedBy.subRole ? '/' + selected.performedBy.subRole : ''})` : 'System'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Action"><Tag color="orange">{selected.action}</Tag></Descriptions.Item>
            <Descriptions.Item label="Severity"><Tag color={severityColor[selected.severity]}>{selected.severity.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Target" span={2}>
              {selected.targetId ? `${selected.targetId.firstName} ${selected.targetId.surname}` : selected.targetModel ? <Tag>{selected.targetModel}</Tag> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Timestamp" span={2}>{fmtDt(selected.createdAt)}</Descriptions.Item>
            {selected.ipAddress && <Descriptions.Item label="IP Address">{selected.ipAddress}</Descriptions.Item>}
            {selected.userAgent && <Descriptions.Item label="User Agent" span={2}><Text style={{ fontSize: 11 }}>{selected.userAgent}</Text></Descriptions.Item>}
            {selected.details && <Descriptions.Item label="Details" span={2}>{selected.details}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default ActionLogs;
