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
  Grid,
  Tag,
  Tooltip,
  Button,
} from 'antd';
import Chart from '../components/Chart';
import { TeamOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getAnalytics,
  getHourlyAnalytics,
  type AnalyticsResponse,
  type HourlyAnalyticsResponse,
} from '@/services/analyticsService';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type RangeType =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'custom'
  | 'all';

interface DtrSummary {
  present: number;
  late: number;
  absent: number;
  wfh: number;
  leave: number;
}

interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

const getRangeBounds = (
  date: Dayjs,
  type: Exclude<RangeType, 'custom' | 'all'>,
) => {
  switch (type) {
    case 'day':
      return { start: date.startOf('day'), end: date.endOf('day') };
    case 'week':
      return { start: date.startOf('week'), end: date.endOf('week') };
    case 'month':
      return { start: date.startOf('month'), end: date.endOf('month') };
    case 'quarter': {
      const qStart = Math.floor(date.month() / 3) * 3;
      const start = date.month(qStart).startOf('month');
      return { start, end: start.add(2, 'month').endOf('month') };
    }
    case 'year':
      return { start: date.startOf('year'), end: date.endOf('year') };
  }
};

const formatCheckInTime = (minutes?: number | null) => {
  if (typeof minutes !== 'number') return 'N/A';

  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = ((hours + 11) % 12) + 1;

  return `${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`;
};

/* ================= COMPONENT ================= */
const Analytics = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isNarrow = !screens.md;
  const isTablet = Boolean(screens.md && !screens.xl);
  const cellW = isNarrow ? 36 : 60;
  const cellH = isNarrow ? 14 : 20;

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyAnalyticsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const { user } = useAuth();

  const [dtrSummary, setDtrSummary] = useState<DtrSummary | null>(null);
  const [txnCounts, setTxnCounts] = useState({ provider: 0, client: 0 });

  const fetchAnalytics = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const res = await getAnalytics(startDate, endDate);
      setData(res);

      const sub = user?.subRole;
      if (
        startDate &&
        endDate &&
        [
          'non_academic',
          'maintenance',
          'faculty',
          'department_head',
          'dean',
          'hr_staff',
          'security_staff',
        ].includes(sub || '')
      ) {
        const month = dayjs(startDate).format('M');
        const year = dayjs(startDate).format('YYYY');
        const dtrRes = await api.get(
          `/analytics/dtr?userId=me&month=${month}&year=${year}&format=json`,
        );
        setDtrSummary(dtrRes.data?.summary || null);

        const endDayObj = dayjs(endDate).endOf('day').toISOString();
        const startDayObj = dayjs(startDate).startOf('day').toISOString();
        const [pRes, cRes] = await Promise.all([
          api
            .get('/transaction-logs/own', {
              params: {
                dateFrom: startDayObj,
                dateTo: endDayObj,
                role: 'provider',
              },
            })
            .catch(() => ({ data: [] })),
          api
            .get('/transaction-logs/own', {
              params: {
                dateFrom: startDayObj,
                dateTo: endDayObj,
                role: 'client',
              },
            })
            .catch(() => ({ data: [] })),
        ]);
        setTxnCounts({
          provider: pRes.data?.data?.length || pRes.data?.length || 0,
          client: cRes.data?.data?.length || cRes.data?.length || 0,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHourlyAnalytics = async (date: string) => {
    setLoading(true);
    try {
      const res = await getHourlyAnalytics(date);
      setHourlyData(res);
    } finally {
      setLoading(false);
    }
  };

  const [rangeType, setRangeType] = useState<RangeType>('day');
  const [singleDate, setSingleDate] = useState<Dayjs>(dayjs());

  const applyRangeByType = (
    type: RangeType,
    payload?: Dayjs | [Dayjs, Dayjs] | null,
  ) => {
    if (type === 'all') {
      setRange(null);
      fetchAnalytics();
      return;
    }

    if (type === 'custom') {
      if (Array.isArray(payload) && payload[0] && payload[1]) {
        setRange(payload);
        fetchAnalytics(
          payload[0].format('YYYY-MM-DD'),
          payload[1].format('YYYY-MM-DD'),
        );
      }
      return;
    }

    const date = dayjs.isDayjs(payload) ? payload : singleDate;
    const { start, end } = getRangeBounds(date, type);

    setRange([start, end]);
    setSingleDate(date);

    if (type === 'day') {
      // For day view, fetch both hourly for chart AND daily for role cards
      fetchHourlyAnalytics(start.format('YYYY-MM-DD'));
      fetchAnalytics(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
    } else {
      fetchAnalytics(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
    }
  };

  useEffect(() => {
    applyRangeByType(rangeType, singleDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setRangeType('custom');
    setRange(dates);
    if (dates?.[0] && dates?.[1]) {
      fetchAnalytics(
        dates[0].format('YYYY-MM-DD'),
        dates[1].format('YYYY-MM-DD'),
      );
    } else {
      fetchAnalytics();
    }
  };

  const handleSinglePickerChange = (date: Dayjs | null) => {
    if (!date) {
      return;
    }
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

  // Need data for role summary cards regardless of view type
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
  const analyticsView = data.analyticsView;
  const viewerLabel =
    analyticsView.viewer.subRole ||
    analyticsView.viewer.effectiveRole ||
    'user';
  const fallbackRangeType: Exclude<RangeType, 'custom' | 'all'> =
    rangeType === 'custom' || rangeType === 'all' ? 'day' : rangeType;

  const chartRangeStart =
    range?.[0] ?? getRangeBounds(singleDate, fallbackRangeType).start;
  const chartRangeEnd =
    range?.[1] ?? getRangeBounds(singleDate, fallbackRangeType).end;
  const pickerMode: 'date' | 'week' | 'month' | 'quarter' | 'year' =
    rangeType === 'day'
      ? 'date'
      : rangeType === 'all' || rangeType === 'custom'
        ? 'date'
        : rangeType;
  const heatmapData = (data.heatmap ?? []) as HeatmapCell[];

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
          <Title
            level={4}
            className="!text-xl sm:!text-2xl !font-bold !text-gray-800 !mb-4"
          >
            Attendance Analytics
          </Title>

          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mb-4 w-full sm:w-auto">
            <Select
              value={rangeType}
              onChange={val => {
                const nextValue = val as RangeType;
                setRangeType(nextValue);
                if (val === 'all') applyRangeByType('all');
                else if (val === 'custom') setRange(null);
                else applyRangeByType(nextValue, singleDate);
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
              className="w-full sm:w-auto"
              style={{ width: isMobile ? '100%' : 160 }}
            />

            {rangeType === 'custom' ? (
              <RangePicker
                value={range}
                onChange={handleDateChange}
                className="w-full sm:w-auto"
                style={{ width: isMobile ? '100%' : undefined }}
              />
            ) : rangeType === 'all' ? (
              <Text type="secondary">All time</Text>
            ) : (
              <DatePicker
                picker={pickerMode}
                value={singleDate}
                onChange={handleSinglePickerChange}
                className="w-full sm:w-auto"
                style={{ width: isMobile ? '100%' : undefined }}
              />
            )}
          </div>
        </div>

        <Card variant="borderless">
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  Scoped Attendance KPI
                </Title>
                <Text type="secondary">
                  Role-aware analytics for your own attendance and your managed
                  scope.
                </Text>
              </div>
              <Space wrap>
                <Tag color="blue">{viewerLabel}</Tag>
                {analyticsView.viewer.college ? (
                  <Tag>{analyticsView.viewer.college}</Tag>
                ) : null}
                {analyticsView.viewer.department ? (
                  <Tag>{analyticsView.viewer.department}</Tag>
                ) : null}
              </Space>
            </div>

            <Card
              size="small"
              title="My Attendance Analytics"
              variant="outlined"
              style={{ borderRadius: 12 }}
            >
              <Row
                gutter={[16, 16]}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
              >
                <Col xs={24} sm={12} lg={6}>
                  <Statistic
                    title="Attendance Rate"
                    value={analyticsView.selfAttendance.attendanceRate}
                    suffix="%"
                  />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Statistic
                    title="Completed Checkouts"
                    value={analyticsView.selfAttendance.completionRate}
                    suffix="%"
                  />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Statistic
                    title="Avg Hours Rendered"
                    value={analyticsView.selfAttendance.averageHoursRendered}
                  />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Statistic
                    title="Avg Check-In"
                    value={formatCheckInTime(
                      analyticsView.selfAttendance.averageCheckInMinutes,
                    )}
                  />
                </Col>
                {/* Added placeholders for Phase 1 & 2 Blueprint */}
                <Col xs={24} sm={12} lg={6}>
                  <Statistic
                    title="Punctuality Score"
                    value={analyticsView.selfAttendance.punctualityScore ?? 100}
                    suffix="%"
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Statistic
                    title="Avg Service Time"
                    value={
                      analyticsView.selfAttendance.avgServiceTimeMinutes ?? 0
                    }
                    suffix="m"
                  />
                </Col>
              </Row>
            </Card>

            {analyticsView.managedAttendance ? (
              <>
                <Card
                  size="small"
                  title={analyticsView.managedAttendance.label}
                  variant="outlined"
                  style={{ borderRadius: 12 }}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                      <Statistic
                        title="Scoped Attendance Rate"
                        value={
                          analyticsView.managedAttendance.summary.attendanceRate
                        }
                        suffix="%"
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Statistic
                        title="Scoped Checkout Rate"
                        value={
                          analyticsView.managedAttendance.summary.completionRate
                        }
                        suffix="%"
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Statistic
                        title="Scoped Avg Hours"
                        value={
                          analyticsView.managedAttendance.summary
                            .averageHoursRendered
                        }
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Statistic
                        title="Scoped Avg Check-In"
                        value={formatCheckInTime(
                          analyticsView.managedAttendance.summary
                            .averageCheckInMinutes,
                        )}
                      />
                    </Col>
                  </Row>
                </Card>

                <Row gutter={[16, 16]}>
                  {analyticsView.managedAttendance.groups.map(group => (
                    <Col xs={24} md={12} xl={8} key={group.key}>
                      <Card
                        size="small"
                        title={group.label}
                        variant="outlined"
                        style={{ borderRadius: 12, height: '100%' }}
                      >
                        <Space
                          direction="vertical"
                          size={8}
                          style={{ width: '100%' }}
                        >
                          <Text>
                            Attendance Rate: {group.summary.attendanceRate}%
                          </Text>
                          <Text>
                            Checkout Rate: {group.summary.completionRate}%
                          </Text>
                          <Text>
                            Avg Hours: {group.summary.averageHoursRendered}
                          </Text>
                          <Text>
                            Avg Check-In:{' '}
                            {formatCheckInTime(
                              group.summary.averageCheckInMinutes,
                            )}
                          </Text>
                          <Text type="secondary">
                            Covered Users: {group.summary.userCount}
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            ) : null}
          </Space>
        </Card>

        {/* PERSONAL ROLE KPI DASHBOARD (Groups 2-6, 10) */}
        {[
          'non_academic',
          'maintenance',
          'faculty',
          'department_head',
          'dean',
          'hr_staff',
          'security_staff',
        ].includes(user?.subRole || '') && (
          <Card
            variant="borderless"
            style={{ background: '#f0f5ff', border: '1px solid #d6e4ff' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={5} style={{ margin: 0, color: '#0958d9' }}>
                Personal KPI & Work Summary
              </Title>
              <Text
                type="secondary"
                style={{ marginBottom: 16, display: 'block' }}
              >
                Your personal metrics for the selected period.
              </Text>

              <Row
                gutter={[16, 16]}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <Col xs={24} lg={12}>
                  <Card size="small" title="Attendance Events (DTR)">
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Statistic
                          title="Present"
                          value={dtrSummary?.present || 0}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Late"
                          value={dtrSummary?.late || 0}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Absent"
                          value={dtrSummary?.absent || 0}
                          valueStyle={{ color: '#f5222d' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="WFH"
                          value={dtrSummary?.wfh || 0}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Leave"
                          value={dtrSummary?.leave || 0}
                          valueStyle={{ color: '#722ed1' }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card size="small" title="Transaction Volume">
                    <Row gutter={[16, 16]}>
                      {!['maintenance', 'faculty'].includes(
                        user?.subRole || '',
                      ) && (
                        <Col span={12}>
                          <Statistic
                            title="As Provider"
                            value={txnCounts.provider}
                            valueStyle={{ color: '#eb2f96' }}
                          />
                        </Col>
                      )}
                      <Col
                        span={
                          !['maintenance', 'faculty'].includes(
                            user?.subRole || '',
                          )
                            ? 12
                            : 24
                        }
                      >
                        <Statistic
                          title="As Client"
                          value={txnCounts.client}
                          valueStyle={{ color: '#13c2c2' }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            </Space>
          </Card>
        )}

        {/* ROLE SUMMARY */}
        <Card variant="borderless">
          <Row
            gutter={[16, 16]}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {allRoles.map(role => (
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
                    <Col xs={24} sm={12}>
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

                    <Col xs={24} sm={12}>
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

        {/* 2D DENSITY HEATMAP */}
        <Card variant="borderless" title="Activity Heatmap (Day vs Hour)">
          <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
            <div
              style={{
                minWidth: isNarrow ? 320 : 700,
                display: 'flex',
                gap: isNarrow ? 8 : 16,
              }}
            >
              {/* Y-Axis: Hours */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  marginTop: 24,
                }}
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: cellH,
                      fontSize: isNarrow ? 9 : 11,
                      color: '#888',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {i === 0
                      ? '12a'
                      : i < 12
                        ? `${i}a`
                        : i === 12
                          ? '12p'
                          : `${i - 12}p`}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: 'flex', gap: isNarrow ? 2 : 4 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                  (dayLabel, dayIndex) => {
                    // MongoDB $dayOfWeek: 1 = Sunday, 7 = Saturday
                    const dayData = heatmapData.filter(
                      h => h.day === dayIndex + 1,
                    );
                    const maxCount = Math.max(
                      ...heatmapData.map(h => h.count),
                      1,
                    );

                    return (
                      <div
                        key={dayLabel}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: isNarrow ? 2 : 4,
                        }}
                      >
                        <div
                          style={{
                            textAlign: 'center',
                            fontSize: isNarrow ? 9 : 12,
                            fontWeight: 500,
                            paddingBottom: 8,
                          }}
                        >
                          {isNarrow ? dayLabel.slice(0, 2) : dayLabel}
                        </div>
                        {Array.from({ length: 24 }).map((_, hourIndex) => {
                          const record = dayData.find(
                            h => h.hour === hourIndex,
                          );
                          const count = record ? record.count : 0;
                          const intensity = Math.max(
                            0.05,
                            Math.min(count / maxCount, 1),
                          );

                          return (
                            <Tooltip
                              key={hourIndex}
                              title={`${dayLabel} ${hourIndex}:00 — ${count} entries`}
                            >
                              <div
                                style={{
                                  width: cellW,
                                  height: cellH,
                                  background:
                                    count > 0
                                      ? `rgba(220, 20, 60, ${intensity})`
                                      : '#f0f0f0',
                                  borderRadius: isNarrow ? 2 : 4,
                                  cursor: 'pointer',
                                }}
                              />
                            </Tooltip>
                          );
                        })}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* CHART */}
        <div className="chart-container-inner">
          <Chart
            title={
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 8,
                }}
              >
                <Text strong style={{ fontSize: 16 }}>
                  Attendance Volume
                </Text>
                <Select
                  mode="multiple"
                  maxTagCount="responsive"
                  placeholder="Filter roles"
                  value={selectedRoles}
                  onChange={vals => setSelectedRoles(vals as string[])}
                  style={{ minWidth: isMobile ? '100%' : isTablet ? 260 : 220 }}
                  options={allRoles.map(role => ({
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
            data={rangeType === 'day' ? [] : data.combinedDaily}
            lines={allRoles.map(r => ({
              dataKey: r,
              name: r,
              color: roleColors[r],
            }))}
            activeKeys={selectedRoles}
            loading={loading}
            xLabel="Date"
            yLabel="Entries"
            rangeType={rangeType}
            rangeStart={chartRangeStart.toDate()}
            rangeEnd={chartRangeEnd.toDate()}
            hourlyData={
              rangeType === 'day' && hourlyData ? hourlyData.hourly : undefined
            }
          />
        </div>

        {/* REPORTS WIDGET */}
        <Card variant="borderless" title="Generate Reports & DTR">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">
              Export official, system-generated Daily Time Records (DTR) and
              other scoped analytics based on the currently selected date range.
            </Text>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button
                className="w-full sm:w-auto"
                type="primary"
                onClick={() => {
                  const token = localStorage.getItem('token') || '';
                  window.open(
                    `/api/reports/dtr?rangeType=${rangeType}&start=${chartRangeStart.format('YYYY-MM-DD')}&end=${chartRangeEnd.format('YYYY-MM-DD')}&token=${token}`,
                    '_blank',
                  );
                }}
              >
                Download My Personal DTR
              </Button>
              {analyticsView.viewer.effectiveRole === 'TUP' ||
              ['hr_head', 'superadmin', 'security_head'].includes(
                analyticsView.viewer.subRole || '',
              ) ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const token = localStorage.getItem('token') || '';
                    window.open(
                      `/api/reports/bulk-dtr?rangeType=${rangeType}&start=${range?.[0]?.format('YYYY-MM-DD') || singleDate.startOf('month').format('YYYY-MM-DD')}&end=${range?.[1]?.format('YYYY-MM-DD') || singleDate.endOf('month').format('YYYY-MM-DD')}&token=${token}`,
                      '_blank',
                    );
                  }}
                >
                  Generate Bulk Form-48 DTR
                </Button>
              ) : null}
              {['department_head', 'dean', 'hr_head', 'superadmin'].includes(
                analyticsView.viewer.subRole || '',
              ) ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const token = localStorage.getItem('token') || '';
                    window.open(
                      `/api/reports/department?token=${token}`,
                      '_blank',
                    );
                  }}
                >
                  Department Summary Report
                </Button>
              ) : null}
              {['dean', 'hr_head', 'superadmin'].includes(
                analyticsView.viewer.subRole || '',
              ) ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const token = localStorage.getItem('token') || '';
                    window.open(
                      `/api/reports/college?token=${token}`,
                      '_blank',
                    );
                  }}
                >
                  College Summary Report
                </Button>
              ) : null}
              {['top_management', 'hr_head', 'superadmin'].includes(
                analyticsView.viewer.subRole || '',
              ) ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const token = localStorage.getItem('token') || '';
                    window.open(
                      `/api/reports/executive?token=${token}`,
                      '_blank',
                    );
                  }}
                >
                  Executive Summary Report
                </Button>
              ) : null}
              {['hr_head', 'superadmin', 'security_head'].includes(
                analyticsView.viewer.subRole || '',
              ) ? (
                <>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const token = localStorage.getItem('token') || '';
                      window.open(
                        `/api/reports/anomaly?token=${token}`,
                        '_blank',
                      );
                    }}
                  >
                    System Anomaly Report
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const token = localStorage.getItem('token') || '';
                      window.open(
                        `/api/reports/visit-anomaly?token=${token}`,
                        '_blank',
                      );
                    }}
                  >
                    Visit Logs Anomaly Report
                  </Button>
                </>
              ) : null}
              {['superadmin', 'security_head'].includes(
                analyticsView.viewer.subRole || '',
              ) ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const token = localStorage.getItem('token') || '';
                    window.open(
                      `/api/reports/security-performance?token=${token}`,
                      '_blank',
                    );
                  }}
                >
                  Security Performance Report
                </Button>
              ) : null}
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default Analytics;
