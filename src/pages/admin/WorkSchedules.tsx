import { useEffect, useState } from 'react';
import {
  Table, Card, Space, Typography, Button, Modal,
  Form, Input, Select, Switch, Popconfirm, message, Tabs, DatePicker,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

dayjs.extend(utc);
dayjs.extend(timezone);
const MNL = 'Asia/Manila';
const { Title } = Typography;
const { Option } = Select;

// ─── Work Schedule types ───────────────────────────────────────────────────
interface WorkSchedule {
  _id: string;
  name: string;
  days: string[];
  timeIn: string;
  timeOut: string;
  graceMinutes: number;
  isFlexible: boolean;
}

// ─── Special Schedule types ────────────────────────────────────────────────
interface SpecialSchedule {
  _id: string;
  type: 'wfh' | 'holiday' | 'exemption';
  scope: 'individual' | 'department' | 'college' | 'all';
  date: string;
  dateEnd?: string;
  reason: string;
  approvedBy?: { firstName: string; surname: string };
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WorkSchedules = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [special, setSpecial] = useState<SpecialSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [schedModal, setSchedModal] = useState(false);
  const [specialModal, setSpecialModal] = useState(false);
  const [editingSched, setEditingSched] = useState<WorkSchedule | null>(null);
  const [editingSpecial, setEditingSpecial] = useState<SpecialSchedule | null>(null);
  const [schedForm] = Form.useForm();
  const [specialForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const isSuperadmin = user?.subRole === 'superadmin';
  const isHrHead = user?.subRole === 'hr_head';
  const isHrStaff = user?.subRole === 'hr_staff';
  const isSecHead = user?.subRole === 'security_head';

  const canCreate = isSuperadmin || isHrHead || isHrStaff || isSecHead;
  const canDelete = isSuperadmin || isHrHead;

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const [ws, ss] = await Promise.all([
        api.get('/work-schedules'),
        api.get('/special-schedules'),
      ]);
      setSchedules(ws.data?.data || ws.data || []);
      setSpecial(ss.data?.data || ss.data || []);
    } catch {
      setSchedules([]); setSpecial([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchedules(); }, []);

  // ── Work Schedule CRUD ──────────────────────────────────────────────────
  const openSchedModal = (ws?: WorkSchedule) => {
    setEditingSched(ws || null);
    schedForm.resetFields();
    if (ws) schedForm.setFieldsValue(ws);
    setSchedModal(true);
  };

  const saveSched = async () => {
    const vals = await schedForm.validateFields();
    setSaving(true);
    try {
      if (editingSched) {
        await api.put(`/work-schedules/${editingSched._id}`, vals);
        message.success('Schedule updated');
      } else {
        await api.post('/work-schedules', vals);
        message.success('Schedule created');
      }
      setSchedModal(false);
      fetchSchedules();
    } catch {
      message.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const deleteSched = async (id: string) => {
    try {
      await api.delete(`/work-schedules/${id}`);
      message.success('Schedule deleted');
      fetchSchedules();
    } catch {
      message.error('Failed to delete');
    }
  };

  const schedColumns: ColumnsType<WorkSchedule> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Days', dataIndex: 'days', render: (d: string[]) => d?.map(day => <Tag key={day}>{day}</Tag>) },
    { title: 'Time In', dataIndex: 'timeIn' },
    { title: 'Time Out', dataIndex: 'timeOut' },
    { title: 'Grace (min)', dataIndex: 'graceMinutes' },
    { title: 'Flexible', dataIndex: 'isFlexible', render: (v: boolean) => v ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openSchedModal(r)}>Edit</Button>
          {canDelete && (
            <Popconfirm title="Delete this schedule?" onConfirm={() => deleteSched(r._id)} okType="danger">
              <Button danger size="small" icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── Special Schedule CRUD ──────────────────────────────────────────────
  const openSpecialModal = (ss?: SpecialSchedule) => {
    setEditingSpecial(ss || null);
    specialForm.resetFields();
    if (ss) {
      specialForm.setFieldsValue({
        ...ss,
        date: dayjs(ss.date),
        dateEnd: ss.dateEnd ? dayjs(ss.dateEnd) : undefined,
      });
    }
    setSpecialModal(true);
  };

  const saveSpecial = async () => {
    const vals = await specialForm.validateFields();
    const payload = {
      ...vals,
      date: vals.date?.toISOString(),
      dateEnd: vals.dateEnd?.toISOString(),
    };
    setSaving(true);
    try {
      if (editingSpecial) {
        await api.put(`/special-schedules/${editingSpecial._id}`, payload);
        message.success('Special schedule updated');
      } else {
        await api.post('/special-schedules', payload);
        message.success('Special schedule created');
      }
      setSpecialModal(false);
      fetchSchedules();
    } catch {
      message.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteSpecial = async (id: string) => {
    try {
      await api.delete(`/special-schedules/${id}`);
      message.success('Deleted');
      fetchSchedules();
    } catch {
      message.error('Failed to delete');
    }
  };

  const specialColumns: ColumnsType<SpecialSchedule> = [
    { title: 'Type', dataIndex: 'type', render: (t: string) => <Tag color={{ wfh: 'blue', holiday: 'green', exemption: 'orange' }[t] || 'default'}>{t.toUpperCase()}</Tag> },
    { title: 'Scope', dataIndex: 'scope', render: (s: string) => <Tag>{s}</Tag> },
    { title: 'Date', dataIndex: 'date', render: (d: string) => dayjs(d).tz(MNL).format('MMM D, YYYY') },
    { title: 'Date End', dataIndex: 'dateEnd', render: (d?: string) => d ? dayjs(d).tz(MNL).format('MMM D, YYYY') : '—' },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
    { title: 'Approved By', key: 'ab', render: (_, r) => r.approvedBy ? `${r.approvedBy.firstName} ${r.approvedBy.surname}` : '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openSpecialModal(r)}>Edit</Button>
          {canDelete && (
            <Popconfirm title="Delete?" onConfirm={() => deleteSpecial(r._id)} okType="danger">
              <Button danger size="small" icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Title level={4} style={{ margin: 0 }}>Work Schedule Management</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchSchedules}>Refresh</Button>
        </div>
      }
    >
      <Tabs
        items={[
          {
            key: 'templates',
            label: 'Schedule Templates',
            children: (
              <>
                {canCreate && (
                  <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => openSchedModal()}>
                    New Schedule
                  </Button>
                )}
                <Table columns={schedColumns} dataSource={schedules} rowKey="_id" loading={loading} scroll={{ x: 800 }} />
              </>
            ),
          },
          {
            key: 'special',
            label: 'Special Schedules (WFH / Holiday / Exemption)',
            children: (
              <>
                {canCreate && (
                  <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => openSpecialModal()}>
                    New Special Schedule
                  </Button>
                )}
                <Table columns={specialColumns} dataSource={special} rowKey="_id" loading={loading} scroll={{ x: 900 }} />
              </>
            ),
          },
        ]}
      />

      {/* Work Schedule Modal */}
      <Modal open={schedModal} onCancel={() => setSchedModal(false)} onOk={saveSched} confirmLoading={saving}
        title={editingSched ? 'Edit Schedule' : 'New Schedule'} width={600} centered>
        <Form form={schedForm} layout="vertical">
          <Form.Item name="name" label="Schedule Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Regular 8AM–5PM" />
          </Form.Item>
          <Form.Item name="days" label="Work Days" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select days">
              {DAYS.map(d => <Option key={d} value={d}>{d}</Option>)}
            </Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="timeIn" label="Time In" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="08:00" />
            </Form.Item>
            <Form.Item name="timeOut" label="Time Out" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="17:00" />
            </Form.Item>
            <Form.Item name="graceMinutes" label="Grace (min)" style={{ flex: 1 }}>
              <Input type="number" placeholder="15" />
            </Form.Item>
          </Space>
          <Form.Item name="isFlexible" label="Flexible Schedule" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Special Schedule Modal */}
      <Modal open={specialModal} onCancel={() => setSpecialModal(false)} onOk={saveSpecial} confirmLoading={saving}
        title={editingSpecial ? 'Edit Special Schedule' : 'New Special Schedule'} width={600} centered>
        <Form form={specialForm} layout="vertical">
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Option value="wfh">WFH</Option>
              <Option value="holiday">Holiday</Option>
              <Option value="exemption">Exemption</Option>
            </Select>
          </Form.Item>
          <Form.Item name="scope" label="Scope" rules={[{ required: true }]}>
            <Select placeholder="Select scope">
              <Option value="individual">Individual</Option>
              <Option value="department">Department</Option>
              <Option value="college">College</Option>
              <Option value="all">All</Option>
            </Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="dateEnd" label="End Date (optional)" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="e.g., Faculty Development Seminar" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default WorkSchedules;
