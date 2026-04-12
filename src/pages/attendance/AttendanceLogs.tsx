import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Divider,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

dayjs.extend(utc);
dayjs.extend(timezone);

const MNL = 'Asia/Manila';
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

interface AuthUser {
  _id?: string;
  id?: string;
  firstName?: string;
  surname?: string;
  name?: string;
  role: string;
  subRole?: string;
  collegeId?: string;
  departmentId?: string;
}

interface GoOutEntry {
  goOutTime: string;
  goInTime?: string;
  reason: string;
  approvedBy?: { firstName: string; surname: string };
}

interface AttendancePerson {
  _id: string;
  firstName: string;
  surname: string;
  role: string;
  subRole?: string;
}

interface AttendanceRecord {
  _id: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  breakStart?: string;
  breakEnd?: string;
  status: string;
  platesNumber?: string;
  notes?: string;
  goOutEntries?: GoOutEntry[];
  staffId?: AttendancePerson;
  userId?: AttendancePerson;
  scannedBy?: { firstName: string; surname: string };
  totalHours?: number;
  collegeId?: { name: string };
  departmentId?: { name: string };
}

interface BulkExportUser {
  _id: string;
  firstName: string;
  surname: string;
  subRole?: string;
}

const fmt = (value?: string) => (value ? dayjs(value).tz(MNL).format('hh:mm A') : '—');
const fmtDate = (value: string) => dayjs(value).tz(MNL).format('MMM D, YYYY');

const statusColor: Record<string, string> = {
  present: 'green',
  late: 'orange',
  absent: 'red',
  wfh: 'blue',
  holiday: 'cyan',
  exempt: 'purple',
  'present (unscheduled)': 'geekblue',
};

const getAttendanceEndpoint = (user: AuthUser): string | null => {
  switch (user.subRole) {
    case 'superadmin':
    case 'hr_head':
    case 'hr_staff':
    case 'security_head':
    case 'security_staff':
      return '/attendance/all';
    case 'dean':
      return user.collegeId ? `/attendance/college/${user.collegeId}` : null;
    case 'department_head':
      return user.departmentId ? `/attendance/dept/${user.departmentId}` : null;
    default:
      return '/attendance/logs';
  }
};

const AttendanceLogs = () => {
  const { user } = useAuth();
  const currentUser = user as AuthUser | null;
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [dtrMonth, setDtrMonth] = useState<dayjs.Dayjs | null>(null);
  const [downloadingDtr, setDownloadingDtr] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scopeError, setScopeError] = useState('');
  const [presenceRecords, setPresenceRecords] = useState<AttendanceRecord[]>([]);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkUsers, setBulkUsers] = useState<BulkExportUser[]>([]);
  const [bulkUsersLoading, setBulkUsersLoading] = useState(false);
  const [selectedBulkUserIds, setSelectedBulkUserIds] = useState<string[]>([]);
  const [bulkDateRange, setBulkDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [bulkExportAll, setBulkExportAll] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);

  const isAdmin = ['superadmin', 'top_management', 'hr_head', 'hr_staff', 'security_head', 'security_staff'].includes(currentUser?.subRole || '');
  const isDean = currentUser?.subRole === 'dean';
  const isDeptHead = currentUser?.subRole === 'department_head';
  const needsOrgAssignment = (isDean && !currentUser?.collegeId) || (isDeptHead && !currentUser?.departmentId);
  const canShowPresence = (isDean || isDeptHead) && !needsOrgAssignment;

  const fetchData = async () => {
    if (!currentUser) {
      return;
    }

    const endpoint = getAttendanceEndpoint(currentUser);
    if (!endpoint) {
      setScopeError('Your account is not assigned to a college/department. Contact HR or your administrator.');
      setData([]);
      return;
    }

    setScopeError('');
    setLoading(true);

    try {
      const params: Record<string, string> = {};
      if (dateRange) {
        params.dateFrom = dateRange[0].startOf('day').toISOString();
        params.dateTo = dateRange[1].endOf('day').toISOString();
      }

      const res = await api.get(endpoint, { params });
      const raw = res.data?.data ?? res.data?.attendance ?? res.data ?? [];
      setData(Array.isArray(raw) ? raw : []);
    } catch {
      setData([]);
      message.error('Unable to load attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPresence = async () => {
    if (!currentUser || !canShowPresence) {
      setPresenceRecords([]);
      return;
    }

    const endpoint = isDean
      ? `/attendance/college/${currentUser.collegeId}`
      : `/attendance/dept/${currentUser.departmentId}`;

    setPresenceLoading(true);
    try {
      const res = await api.get(endpoint, {
        params: { date: 'today', status: 'present', limit: '200' },
      });
      const raw = res.data?.data ?? res.data?.attendance ?? res.data ?? [];
      setPresenceRecords(Array.isArray(raw) ? raw : []);
    } catch {
      setPresenceRecords([]);
    } finally {
      setPresenceLoading(false);
    }
  };

  const fetchBulkUsers = async () => {
    if (!isDean || !bulkModalOpen) {
      return;
    }

    setBulkUsersLoading(true);
    try {
      const res = await api.get('/users');
      const raw = Array.isArray(res.data) ? res.data : [];
      const scopedUsers = raw
        .filter((entry: BulkExportUser & { collegeId?: string; subRole?: string }) => (
          entry.collegeId === currentUser?.collegeId && ['faculty', 'department_head'].includes(entry.subRole || '')
        ))
        .map((entry: BulkExportUser) => ({
          _id: entry._id,
          firstName: entry.firstName,
          surname: entry.surname,
          subRole: entry.subRole,
        }));
      setBulkUsers(scopedUsers);
      if (bulkExportAll) {
        setSelectedBulkUserIds(scopedUsers.map((entry) => entry._id));
      }
    } catch {
      setBulkUsers([]);
      message.error('Unable to load users for bulk DTR export.');
    } finally {
      setBulkUsersLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [currentUser?.subRole, currentUser?.collegeId, currentUser?.departmentId, dateRange]);

  useEffect(() => {
    if (!canShowPresence) {
      return;
    }

    void fetchPresence();
    const interval = window.setInterval(() => {
      void fetchPresence();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [canShowPresence, currentUser?.collegeId, currentUser?.departmentId]);

  useEffect(() => {
    if (bulkModalOpen) {
      void fetchBulkUsers();
    }
  }, [bulkModalOpen, bulkExportAll]);

  const filtered = useMemo(
    () =>
      data.filter((record) => {
        const person = record.staffId || record.userId;
        const name = person ? `${person.firstName} ${person.surname}`.toLowerCase() : '';
        const matchName = !search || name.includes(search.toLowerCase());
        const matchStatus = !statusFilter || record.status === statusFilter;
        return matchName && matchStatus;
      }),
    [data, search, statusFilter],
  );

  const visiblePresenceNames = presenceRecords
    .map((record) => {
      const person = record.staffId || record.userId;
      return person ? `${person.firstName} ${person.surname}` : '';
    })
    .filter(Boolean);

  const extraPresenceCount = Math.max(visiblePresenceNames.length - 10, 0);

  const handleDownloadDtr = async () => {
    if (!dtrMonth) {
      return;
    }

    setDownloadingDtr(true);
    try {
      const from = dtrMonth.startOf('month').format('YYYY-MM-DD');
      const to = dtrMonth.endOf('month').format('YYYY-MM-DD');
      const res = await api.get('/reports/dtr', {
        params: { userId: 'me', from, to },
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `My_DTR_${from}_${to}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      message.error('Failed to download DTR.');
    } finally {
      setDownloadingDtr(false);
    }
  };

  const handleBulkExport = async () => {
    if (!bulkDateRange || selectedBulkUserIds.length === 0) {
      return;
    }

    const from = bulkDateRange[0].format('YYYY-MM-DD');
    const to = bulkDateRange[1].format('YYYY-MM-DD');

    setBulkExporting(true);
    try {
      const res = await api.post(
        '/reports/dtr-bulk',
        { userIds: selectedBulkUserIds, from, to },
        { responseType: 'blob' },
      );
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `bulk-dtr-${from}-${to}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      message.success('Bulk DTR export generated.');
      setBulkModalOpen(false);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Bulk DTR export failed.';
      message.error(detail);
    } finally {
      setBulkExporting(false);
    }
  };

  const columns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => {
        const person = record.staffId || record.userId;
        return person ? <Text strong>{person.firstName} {person.surname}</Text> : <Text type="secondary">Own Record</Text>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'date',
      render: (value: string) => fmtDate(value),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'descend',
    },
    { title: 'Time In', dataIndex: 'timeIn', render: fmt },
    { title: 'Time Out', dataIndex: 'timeOut', render: fmt },
    {
      title: 'Break',
      key: 'break',
      render: (_, record) => (record.breakStart ? `${fmt(record.breakStart)} - ${fmt(record.breakEnd)}` : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => <Tag color={statusColor[status] || 'default'}>{status || 'unknown'}</Tag>,
    },
    {
      title: 'Hours',
      dataIndex: 'totalHours',
      render: (hours?: number) => (hours ? `${hours.toFixed(1)}h` : '—'),
    },
    {
      title: 'Scanned By',
      dataIndex: 'scannedBy',
      render: (value?: { firstName: string; surname: string }) => (value ? `${value.firstName} ${value.surname}` : '—'),
    },
  ];

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4">
        {scopeError && (
          <Alert
            type="error"
            showIcon
            message="Attendance Scope Error"
            description={scopeError}
          />
        )}

        {canShowPresence && (
          <Card
            loading={presenceLoading}
            title="Currently Present"
            className="rounded-xl"
          >
            <div className="space-y-2">
              <Text strong>{presenceRecords.length} currently present</Text>
              <div className="flex flex-wrap gap-2">
                {visiblePresenceNames.slice(0, 10).map((name) => (
                  <Tag key={name} color="blue">{name}</Tag>
                ))}
                {extraPresenceCount > 0 && <Tag color="default">+ {extraPresenceCount} more</Tag>}
                {visiblePresenceNames.length === 0 && <Text type="secondary">No one is currently present.</Text>}
              </div>
            </div>
          </Card>
        )}

        <Card
          className="rounded-xl"
          title={(
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Title level={4} style={{ margin: 0 }}>
                <CalendarOutlined /> Attendance Logs
              </Title>
              <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>
                Refresh
              </Button>
            </div>
          )}
        >
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
            {(isAdmin || isDean || isDeptHead) && (
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search name"
                allowClear
                className="w-full sm:w-[220px]"
                onChange={(event) => setSearch(event.target.value)}
              />
            )}
            <RangePicker onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
            <Select
              placeholder="Status"
              allowClear
              className="w-full sm:w-[180px]"
              onChange={setStatusFilter}
              value={statusFilter || undefined}
            >
              {['present', 'late', 'absent', 'wfh', 'holiday', 'exempt', 'present (unscheduled)'].map((status) => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </div>

          <Divider style={{ margin: '0 0 16px 0' }} />

          <div className="flex flex-col sm:flex-row gap-2 mb-4 rounded-lg bg-gray-50 p-3">
            <Text strong>Generate My DTR:</Text>
            <DatePicker
              picker="month"
              placeholder="Select Month/Year"
              value={dtrMonth}
              onChange={(value) => setDtrMonth(value)}
            />
            <Button
              type="primary"
              disabled={!dtrMonth}
              loading={downloadingDtr}
              onClick={() => void handleDownloadDtr()}
            >
              Download DTR (.docx)
            </Button>
            {isDean && (
              <Button onClick={() => setBulkModalOpen(true)}>
                Bulk DTR Export
              </Button>
            )}
          </div>

          <div className="overflow-x-auto w-full">
            <Table
              columns={columns}
              dataSource={filtered}
              rowKey="_id"
              loading={loading}
              scroll={{ x: 900 }}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              onRow={(record) => ({
                onClick: () => {
                  setSelected(record);
                  setModalOpen(true);
                },
                style: { cursor: 'pointer' },
              })}
            />
          </div>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
        centered
        title={<Space><ClockCircleOutlined /> Attendance Detail</Space>}
      >
        {selected && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Person" span={2}>
                {(() => {
                  const person = selected.staffId || selected.userId;
                  return person ? `${person.firstName} ${person.surname}` : 'Self';
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Date">{fmtDate(selected.date)}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColor[selected.status] || 'default'}>{selected.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Time In"><Tag color="green">{fmt(selected.timeIn)}</Tag></Descriptions.Item>
              <Descriptions.Item label="Time Out"><Tag color="volcano">{fmt(selected.timeOut)}</Tag></Descriptions.Item>
              <Descriptions.Item label="Break Start">{fmt(selected.breakStart)}</Descriptions.Item>
              <Descriptions.Item label="Break End">{fmt(selected.breakEnd)}</Descriptions.Item>
              <Descriptions.Item label="Total Hours">{selected.totalHours ? `${selected.totalHours.toFixed(2)}h` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Plates">{selected.platesNumber || '—'}</Descriptions.Item>
              <Descriptions.Item label="College">{selected.collegeId?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Department">{selected.departmentId?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Scanned By" span={2}>
                {selected.scannedBy ? `${selected.scannedBy.firstName} ${selected.scannedBy.surname}` : '—'}
              </Descriptions.Item>
              {selected.notes && <Descriptions.Item label="Notes" span={2}>{selected.notes}</Descriptions.Item>}
            </Descriptions>

            {selected.goOutEntries && selected.goOutEntries.length > 0 && (
              <>
                <Divider>Go-Out Entries ({selected.goOutEntries.length})</Divider>
                {selected.goOutEntries.map((entry, index) => (
                  <Card key={`${selected._id}-${index}`} size="small">
                    <Space direction="vertical">
                      <Text><strong>Go Out:</strong> {fmt(entry.goOutTime)} <strong>Go In:</strong> {fmt(entry.goInTime)}</Text>
                      <Text><strong>Reason:</strong> {entry.reason}</Text>
                      {entry.approvedBy && (
                        <Text><strong>Approved By:</strong> {entry.approvedBy.firstName} {entry.approvedBy.surname}</Text>
                      )}
                    </Space>
                  </Card>
                ))}
              </>
            )}
          </Space>
        )}
      </Modal>

      <Modal
        open={bulkModalOpen}
        onCancel={() => setBulkModalOpen(false)}
        onOk={() => void handleBulkExport()}
        confirmLoading={bulkExporting}
        okText="Generate Bulk DTR"
        okButtonProps={{ disabled: !bulkDateRange || selectedBulkUserIds.length === 0 }}
        width={720}
        centered
        title="Bulk DTR Export"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Text strong>Date Range</Text>
            <RangePicker
              className="mt-1 w-full"
              value={bulkDateRange}
              onChange={(value) => setBulkDateRange(value as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
          </div>
          <div className="md:col-span-2">
            <Checkbox
              checked={bulkExportAll}
              onChange={(event) => {
                const checked = event.target.checked;
                setBulkExportAll(checked);
                setSelectedBulkUserIds(checked ? bulkUsers.map((entry) => entry._id) : []);
              }}
            >
              Export All
            </Checkbox>
          </div>
          <div className="md:col-span-2">
            <Text strong>Select Faculty and Department Heads</Text>
            <Select
              mode="multiple"
              className="mt-1 w-full"
              placeholder="Choose users"
              loading={bulkUsersLoading}
              value={selectedBulkUserIds}
              onChange={(value) => {
                setSelectedBulkUserIds(value);
                setBulkExportAll(value.length === bulkUsers.length && bulkUsers.length > 0);
              }}
              options={bulkUsers.map((entry) => ({
                value: entry._id,
                label: `${entry.firstName} ${entry.surname} (${entry.subRole || 'user'})`,
              }))}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AttendanceLogs;
