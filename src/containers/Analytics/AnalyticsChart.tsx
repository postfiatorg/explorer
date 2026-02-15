import { FC, useMemo } from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface AnalyticsChartProps {
  title: string
  subtitle?: string
  data: Array<{ timestamp: number; value: number }>
  color?: string
  variant?: 'area' | 'line'
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export const AnalyticsChart: FC<AnalyticsChartProps> = ({
  title,
  subtitle,
  data,
  color = '#32e685',
  variant = 'area',
}) => {
  const chartData = useMemo(
    () => data.map((d) => ({ ...d, time: formatTime(d.timestamp) })),
    [data],
  )

  const hasData = chartData.length > 2

  const Chart = variant === 'area' ? AreaChart : LineChart

  return (
    <div className="analytics-chart">
      <div className="analytics-chart-header">
        <h3 className="analytics-chart-title">{title}</h3>
        {subtitle && (
          <span className="analytics-chart-subtitle">{subtitle}</span>
        )}
      </div>
      <div className="analytics-chart-body">
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <Chart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <defs>
                <linearGradient
                  id={`grad-${title}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2029" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#7e808d', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#7e808d', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f1018',
                  border: '1px solid #30323e',
                  borderRadius: 8,
                  fontSize: 13,
                }}
                labelStyle={{ color: '#9d9fac' }}
              />
              {variant === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${title})`}
                  name={title}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  name={title}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </Chart>
          </ResponsiveContainer>
        ) : (
          <div className="analytics-chart-empty">
            Accumulating data... Charts populate as metrics arrive.
          </div>
        )}
      </div>
    </div>
  )
}
