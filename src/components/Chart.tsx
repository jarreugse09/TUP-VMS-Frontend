import { Card, Typography } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';

const { Text } = Typography;

interface ChartLine {
  dataKey: string;
  color?: string;
  name?: string;
}

interface ChartCardProps<T> {
  title: React.ReactNode;
  data: T[];
  xKey: keyof T;
  lines: ChartLine[];
  loading?: boolean;
  xLabel?: string;
  yLabel?: string;
  activeKeys?: string[];
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
  activeKeys,
}: ChartCardProps<T>) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Card
      loading={loading}
      bordered={false}
      style={{
        borderRadius: 16,
        boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
      }}
      bodyStyle={{ padding: '20px 24px 16px' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {typeof title === 'string' ? (
          <Text strong style={{ fontSize: 16 }}>
            {title}
          </Text>
        ) : (
          title
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="#f0f0f0"
          />

          <XAxis
            dataKey={xKey as string}
            tick={{ fontSize: 12, fill: '#8c8c8c' }}
            axisLine={{ stroke: '#d9d9d9' }}
            tickLine={false}
            label={{
              value: xLabel,
              position: 'insideBottom',
              offset: -6,
              style: { fill: '#8c8c8c', fontSize: 12 },
            }}
          />

          <YAxis
            tick={{ fontSize: 12, fill: '#8c8c8c' }}
            axisLine={false}
            tickLine={false}
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#8c8c8c', fontSize: 12 },
            }}
          />

          <Tooltip
            cursor={{ stroke: '#d9d9d9', strokeDasharray: '3 3' }}
            contentStyle={{
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: 13,
            }}
            labelStyle={{ fontWeight: 600 }}
          />

          {lines.map((line) => {
            const key = line.dataKey;

            if (activeKeys && !activeKeys.includes(key)) return null;

            const opacity = hovered ? (hovered === key ? 1 : 0.4) : 1;

            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={line.name || key}
                stroke={line.color || '#1677ff'}
                strokeWidth={3}
                dot={false}
                strokeOpacity={opacity}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                isAnimationActive
                animationDuration={500}
                style={{
                  transition: 'stroke-opacity 200ms ease',
                }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default Chart;
