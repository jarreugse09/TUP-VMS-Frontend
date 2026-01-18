import { Card, Typography } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo, useState } from "react";
import dayjs from "dayjs";

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
  rangeType?: "day" | "week" | "month" | "quarter" | "year" | "custom" | "all";
  rangeStart?: Date;
  rangeEnd?: Date;
  hourlyData?: Array<{ hour: number; [key: string]: number }>;
}

/* ================= REUSABLE LINE CHART COMPONENT ================= */

const Chart = <T extends object>({
  title,
  data,
  xKey,
  lines,
  loading = false,
  xLabel = "",
  yLabel = "",
  activeKeys,
  rangeType,
  rangeStart,
  rangeEnd,
  hourlyData,
}: ChartCardProps<T>) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const display = useMemo(() => {
    // If hourly data is provided (day view), use it directly
    if (hourlyData && rangeType === "day") {
      return {
        data: hourlyData.map((h) => ({ x: h.hour, ...h })),
        xKey: "x",
        tickFormatter: (v: number) => `${v}:00`,
        ticks: undefined as any,
      };
    }

    if (!data || !lines || !rangeType || !rangeStart || !rangeEnd) {
      return {
        data: data as any[],
        xKey: xKey as string,
        tickFormatter: undefined as any,
        ticks: undefined as any,
      };
    }

    const start = dayjs(rangeStart);
    const end = dayjs(rangeEnd);

    const roles = lines.map((l) => l.dataKey);
    const mapByDate: Record<string, any> = {};
    (data as any[]).forEach((d) => {
      const key = (d as any)[xKey as string];
      if (typeof key === "string") {
        mapByDate[key] = d;
      }
    });

    // helper to extract counts for a given date string
    const countsFor = (isoDate: string) => {
      const src = mapByDate[isoDate] || {};
      const out: any = {};
      roles.forEach((r) => {
        out[r] = src[r] ?? 0;
      });
      return out;
    };

    // Build buckets based on rangeType
    let out: any[] = [];
    let tickFormatter: any = undefined;
    let ticks: any = undefined;

    if (rangeType === "week" || rangeType === "month") {
      // daily buckets
      const days: any[] = [];
      let cursor = start.startOf("day");
      while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
        const iso = cursor.format("YYYY-MM-DD");
        const x = parseInt(cursor.format("D"), 10); // day number only
        days.push({ x, ...countsFor(iso) });
        cursor = cursor.add(1, "day");
      }
      out = days;
      tickFormatter = (v: number) => String(v);
    } else if (rangeType === "quarter" || rangeType === "year") {
      // monthly buckets across the range
      const monthsMap: Record<string, any> = {};
      let cursor = start.startOf("month");
      while (cursor.isBefore(end) || cursor.isSame(end, "month")) {
        const key = cursor.format("YYYY-MM");
        monthsMap[key] = monthsMap[key] || {
          x: parseInt(cursor.format("M"), 10),
        };
        cursor = cursor.add(1, "month");
      }
      // aggregate source data into month buckets
      Object.keys(mapByDate).forEach((iso) => {
        const mkey = dayjs(iso).format("YYYY-MM");
        if (!monthsMap[mkey]) return;
        const src = mapByDate[iso];
        roles.forEach((r) => {
          monthsMap[mkey][r] = (monthsMap[mkey][r] || 0) + (src[r] || 0);
        });
      });
      out = Object.values(monthsMap);
      tickFormatter = (v: number) => String(v); // month number
    } else if (rangeType === "day") {
      // fallback: show day-of-month as single bucket (no hourly data available)
      const x = parseInt(start.format("D"), 10);
      const iso = start.format("YYYY-MM-DD");
      out = [{ x, ...countsFor(iso) }];
      tickFormatter = (v: number) => String(v);
    } else {
      // custom/all: default passthrough
      out = (data as any[]).map((d) => ({
        x: (d as any)[xKey as string],
        ...d,
      }));
    }

    return { data: out, xKey: "x", tickFormatter, ticks };
  }, [data, lines, rangeType, rangeStart, rangeEnd, xKey, hourlyData]);

  return (
    <Card
      loading={loading}
      bordered={false}
      style={{
        borderRadius: 16,
        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
      }}
      bodyStyle={{ padding: "20px 24px 16px" }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {typeof title === "string" ? (
          <Text strong style={{ fontSize: 16 }}>
            {title}
          </Text>
        ) : (
          title
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={display.data}>
          <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />

          <XAxis
            dataKey={display.xKey}
            tick={{ fontSize: 12, fill: "#8c8c8c" }}
            axisLine={{ stroke: "#d9d9d9" }}
            tickLine={false}
            tickFormatter={display.tickFormatter}
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -6,
              style: { fill: "#8c8c8c", fontSize: 12 },
            }}
          />

          <YAxis
            tick={{ fontSize: 12, fill: "#8c8c8c" }}
            axisLine={false}
            tickLine={false}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              style: { fill: "#8c8c8c", fontSize: 12 },
            }}
          />

          <Tooltip
            cursor={{ stroke: "#d9d9d9", strokeDasharray: "3 3" }}
            contentStyle={{
              borderRadius: 12,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
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
                stroke={line.color || "#1677ff"}
                strokeWidth={3}
                dot={false}
                strokeOpacity={opacity}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                isAnimationActive
                animationDuration={500}
                style={{
                  transition: "stroke-opacity 200ms ease",
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
