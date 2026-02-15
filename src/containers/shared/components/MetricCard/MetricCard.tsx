import { FC } from 'react'
import { LucideIcon } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import './metricCard.scss'

interface MetricCardProps {
  label: string
  value: string | number | undefined
  unit?: string
  icon?: LucideIcon
  sparklineData?: number[]
  sparklineColor?: string
}

export const MetricCard: FC<MetricCardProps> = ({
  label,
  value,
  unit,
  icon: Icon,
  sparklineData,
  sparklineColor = '#32e685',
}) => {
  const chartData = sparklineData?.map((v, i) => ({ i, v })) || []
  const gradientId = `spark-${label.replace(/[^a-zA-Z0-9]/g, '-')}`

  return (
    <div className="metric-card">
      <div className="metric-card-header">
        {Icon && <Icon size={16} className="metric-card-icon" />}
        <span className="metric-card-label">{label}</span>
      </div>
      <div className="metric-card-value">
        {value ?? '—'}
        {unit && value != null && <span className="metric-card-unit">{unit}</span>}
      </div>
      {chartData.length > 2 && (
        <div className="metric-card-sparkline">
          <ResponsiveContainer width="100%" height={32}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparklineColor}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
