import {
  Card,
  Col,
  Row,
  Statistic,
  Typography,
  Space,
  DatePicker,
  Select,
  Checkbox,
} from 'antd';
import Chart from '../components/Chart';
import { TeamOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { getAnalytics, type AnalyticsResponse } from '@/services/analyticsService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/* ================= COMPONENT ================= */
const Analytics = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<any>(null);

  const fetchAnalytics = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const res = await getAnalytics(startDate, endDate);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  const [rangeType, setRangeType] = useState<
    'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom' | 'all'
  >('day');
  const [singleDate, setSingleDate] = useState<any>(dayjs());

  const applyRangeByType = (type: typeof rangeType, payload?: any) => {
    if (type === 'all') {
      setRange(null);
      fetchAnalytics();
      return;
    }

    if (type === 'custom') {
      if (payload?.[0] && payload?.[1]) {
        setRange(payload);
        fetchAnalytics(
          payload[0].format('YYYY-MM-DD'),
          payload[1].format('YYYY-MM-DD')
        );
      }
      return;
    }

    const date = payload || singleDate;
    let start: any;
    let end: any;

    switch (type) {
      case 'day':
        start = date.startOf('day');
        end = date.endOf('day');
        break;
      case 'week':
        start = date.startOf('week');
        end = date.endOf('week');
        break;
      case 'month':
        start = date.startOf('month');
        end = date.endOf('month');
        break;
      case 'quarter': {
        const qStart = Math.floor(date.month() / 3) * 3;
        start = date.month(qStart).startOf('month');
        end = start.add(2, 'month').endOf('month');
        break;
      }
      case 'year':
        start = date.startOf('year');
        end = date.endOf('year');
        break;
    }

    setRange([start, end]);
    setSingleDate(date);
    fetchAnalytics(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
  };

  useEffect(() => {
    applyRangeByType(rangeType, singleDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (dates: any) => {
    setRangeType('custom');
    setRange(dates);
    if (dates) {
      fetchAnalytics(
        dates[0].format('YYYY-MM-DD'),
        dates[1].format('YYYY-MM-DD')
      );
    } else {
      fetchAnalytics();
    }
  };

  const handleSinglePickerChange = (date: any) => {
    setSingleDate(date);
    applyRangeByType(rangeType, date);
  };

  const DEFAULT_ROLES: Array<'Student' | 'Staff' | 'Visitor' | 'TUP'> = [
    'Student',
    'Staff',
    'Visitor',
    'TUP',
  ];
  const [selectedRoles, setSelectedRoles] = useState<string[]>(DEFAULT_ROLES);

  if (!data) return null;

  const roleColors: Record<string, string> = {
    Student: '#1890ff',
    Staff: '#52c41a',
    Visitor: '#faad14',
    TUP: '#722ed1',
  };

  const allRoles = Object.keys(data.roles) as Array<
    'Student' | 'Staff' | 'Visitor' | 'TUP'
  >;


  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* HEADER */}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Title level={4} style={{ margin: 0 }}>
          Attendance Analytics
        </Title>

        <Space>
          <Select
            value={rangeType}
            onChange={(val) => {
              setRangeType(val as any);
              if (val === 'all') applyRangeByType('all');
              else if (val === 'custom') setRange(null);
              else applyRangeByType(val as any, singleDate);
            }}
            options={[
              { label: 'Day', value: 'day' },
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
              { label: 'Quarter', value: 'quarter' },
              { label: 'Year', value: 'year' },
              { label: 'Custom Range', value: 'custom' },
              { label: 'All', value: 'all' },
            ]}
            style={{ width: 160 }}
          />

          {rangeType === 'custom' ? (
            <RangePicker value={range} onChange={handleDateChange} />
          ) : rangeType === 'all' ? (
            <Text type="secondary">All time</Text>
          ) : (
            <DatePicker
              picker={rangeType === 'day' ? 'date' : (rangeType as any)}
              value={singleDate}
              onChange={handleSinglePickerChange}
            />
          )}
        </Space>
      </Space>

      {/* ROLE SUMMARY */}
<Card variant="borderless">
  <Row gutter={[16, 16]}>
    {allRoles.map((role) => (
      <Col xs={24} sm={12} md={6} key={role}>
        <Card
          variant="outlined"
          style={{
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          }}
          styles={{ body: { padding: 16 } }}
        >
          <Title level={5} style={{ marginBottom: 12 }}>
            {role}
          </Title>

          {/* TOTAL REGISTERED */}
          <Card
            size="small"
            variant="borderless"
            style={{
              borderRadius: 8,
              marginBottom: 12,
              background: '#fafafa',
              textAlign: 'center',
            }}
            styles={{ body: { padding: 12 } }}
          >
            <TeamOutlined style={{ color: roleColors[role] }} />
            <Statistic
              title="Total Registered"
              value={data.roles[role].totalUsers}
            />
          </Card>

          {/* INSIDE / CHECKED OUT */}
          <Row gutter={12}>
            <Col span={12}>
              <Card
                size="small"
                variant="borderless"
                style={{
                  borderRadius: 8,
                  background: '#f6ffed',
                  textAlign: 'center',
                }}
                styles={{ body: { padding: 12 } }}
              >
                <LoginOutlined style={{ color: '#52c41a' }} />
                <Statistic
                  title="Inside"
                  value={data.roles[role].usersCurrentlyInside}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>

            <Col span={12}>
              <Card
                size="small"
                variant="borderless"
                style={{
                  borderRadius: 8,
                  background: '#fff1f0',
                  textAlign: 'center',
                }}
                styles={{ body: { padding: 12 } }}
              >
                <LogoutOutlined style={{ color: '#ff4d4f' }} />
                <Statistic
                  title="Outside"
                  value={data.roles[role].usersCheckedOut}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      </Col>
    ))}
  </Row>
</Card>





      {/* CHART */}
      <Chart
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontWeight: 600 }}>Daily Entries by Role</span>
            <Select
              mode="multiple"
              allowClear
              placeholder="Filter roles"
              value={selectedRoles}
              onChange={(vals) => setSelectedRoles(vals as string[])}
              style={{ minWidth: 220 }}
              options={allRoles.map((role) => ({
                label: (
                  <Space>
                    <Checkbox checked={selectedRoles.includes(role)} />
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: roleColors[role],
                        display: 'inline-block',
                      }}
                    />
                    {role}
                  </Space>
                ),
                value: role,
              }))}
            />
          </div>
        }
        xKey="_id"
        data={data.combinedDaily}
        lines={allRoles.map((r) => ({ dataKey: r, name: r, color: roleColors[r] }))}
        activeKeys={selectedRoles}
        loading={loading}
        xLabel="Date"
        yLabel="Entries"
      />
    </Space>
  );
};

export default Analytics;
