import { Card } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartCardProps<T> {
  title: string;
  data: T[];
  xKey: keyof T; // which field to use for X axis
  lines: {
    dataKey: keyof T; // field to plot
    color?: string;
    name?: string; // label in tooltip
  }[];
  loading?: boolean;
  xLabel?: string;
  yLabel?: string;
}

/* ================= REUSABLE LINE CHART COMPONENT ================= */

const Chart = <T extends object>({
  title,
  data,
  xKey,
  lines,
  loading = false,
  xLabel = '',
  yLabel = '',
}: ChartCardProps<T>) => {
  return (
    <Card title={title} bordered={false} loading={loading}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey as string}
            label={{ value: xLabel, position: 'insideBottomRight', offset: -5 }}
          />
          <YAxis
            label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip />
          {lines.map((line, idx) => (
            <Line
              key={idx}
              type="monotone"
              dataKey={line.dataKey as string}
              stroke={line.color || '#1890ff'}
              strokeWidth={2}
              name={line.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default Chart;
