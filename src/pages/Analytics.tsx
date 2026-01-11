import { Card, Col, Row, Statistic, Typography, Space, DatePicker } from 'antd';
import Chart from '../components/Chart';
import {
  CheckCircleOutlined,
  LogoutOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Dayjs } from 'dayjs';
import { getAnalytics, type AvgPerHour } from '@/services/analyticsService';

const { Title } = Typography;
const { RangePicker } = DatePicker;

/* ================= TYPES ================= */
interface AnalyticsResponse {
  visitors: {
    totals: number;

    visitorCheckedOutCount: number;
    visitorCheckedIn: number;
    averageVisitorPerHour: AvgPerHour[];
    avgVisitorperDay: number;
  };
  attendance: {
    totalPresentToday: number;
    checkedOutCount: number;
    currentlyInside: number;
    dailyAttendance: { _id: string; present: number; checkedOut: number }[];
  };
}

/* ================= COMPONENT ================= */
const Analytics = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  const fetchAnalytics = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const res = await getAnalytics(startDate, endDate);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(); // fetch initial data
  }, []);

  const handleDateChange = (dates: [Dayjs, Dayjs] | null) => {
    setRange(dates);
    if (dates) {
      fetchAnalytics(
        dates[0].format('YYYY-MM-DD'),
        dates[1].format('YYYY-MM-DD')
      );
    } else {
      fetchAnalytics(); // reset
    }
  };

  if (!data) return null;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* HEADER */}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Title level={4} style={{ margin: 0 }}>
          Attendance Analytics
        </Title>
        <RangePicker value={range} onChange={handleDateChange} allowClear />
      </Space>

      {/* KPI CARDS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} bordered={false}>
            <Statistic
              title="Total Visitor"
              value={data.visitors.totals}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} bordered={false}>
            <Statistic
              title="Currently Inside"
              value={data.visitors.visitorCheckedIn}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} bordered={false}>
            <Statistic
              title="Checked Out"
              value={data.visitors.visitorCheckedOutCount}
              prefix={<LogoutOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* VISITORS KPI */}
      <Card title="Visitors" bordered={false} loading={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Statistic
              title="Average Visitor"
              value={data.visitors.avgVisitorperDay}
            />
          </Col>
        </Row>
      </Card>

      {/* Average Visitor per Hour */}

      <Chart
        title="Average Visitor Per Hour"
        xKey="_id"
        data={data.visitors.averageVisitorPerHour}
        lines={[{ dataKey: 'avgCount', name: 'Visitors', color: '#1890ff' }]}
        loading={loading}
        xLabel="Hour"
        yLabel="Avg Visitors"
      />

      {/* Staffs KPI */}
      <Card title="Staff" bordered={false} loading={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Statistic
              title="Total Staffs Present"
              value={data.attendance.totalPresentToday}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="Currently Inside"
              value={data.attendance.currentlyInside}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="Currently Outside"
              value={data.attendance.checkedOutCount}
            />
          </Col>
        </Row>
      </Card>

      {/* ATTENDANCE DAILY CHART */}
      <Card title="Daily Attendance (Staff)" bordered={false} loading={loading}>
        {/* Use chart library here */}
      </Card>
      <Chart
        title="Staff Attendance Chart"
        data={data.attendance.dailyAttendance}
        xKey="_id"
        lines={[
          { dataKey: 'present', color: '#52c41a', name: 'Present' },
          { dataKey: 'checkedOut', color: '#ff4d4f', name: 'Checked Out' },
        ]}
        xLabel="Date"
        yLabel="Count"
        loading={loading}
      />
    </Space>
  );
};

export default Analytics;
