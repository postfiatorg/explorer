import { FC, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useStreams } from '../../shared/hooks/useStreams'

const formatSecsAgo = (secs: number): string => {
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

const TICK_INTERVAL_SECS = 15

export const NetworkActivityChart: FC = () => {
  const { ledgers } = useStreams()

  const chartData = useMemo(
    () =>
      [...ledgers]
        .reverse()
        .filter((l) => l.txn_count != null)
        .slice(-30)
        .map((l) => {
          const time =
            l.close_time && l.close_time > 1e12
              ? l.close_time
              : (l.close_time || 0) * 1000
          return {
            time,
            txns: l.txn_count || 0,
            ledgerIndex: l.ledger_index,
          }
        }),
    [ledgers],
  )

  const ticks = useMemo(() => {
    if (chartData.length < 2) return []
    const minTime = chartData[0].time
    const maxTime = chartData[chartData.length - 1].time
    const intervalMs = TICK_INTERVAL_SECS * 1000
    const firstTick = Math.ceil(minTime / intervalMs) * intervalMs
    const result: number[] = []
    for (let t = firstTick; t <= maxTime; t += intervalMs) {
      result.push(t)
    }
    return result
  }, [chartData])

  if (chartData.length < 2) {
    return (
      <div className="dashboard-panel">
        <h3 className="dashboard-panel-title">Network Activity</h3>
        <div className="dashboard-panel-empty">Waiting for ledger data...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-panel">
      <h3 className="dashboard-panel-title">Network Activity</h3>
      <div className="dashboard-chart-container">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="txnGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#32e685" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#32e685" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2029" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              scale="time"
              ticks={ticks}
              tickFormatter={(ms: number) => {
                const secsAgo = Math.round((Date.now() - ms) / 1000)
                return formatSecsAgo(secsAgo)
              }}
              tick={{ fill: '#7e808d', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#7e808d', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#0f1018',
                border: '1px solid #30323e',
                borderRadius: 8,
                fontSize: 13,
              }}
              labelStyle={{ color: '#9d9fac' }}
              itemStyle={{ color: '#32e685' }}
              labelFormatter={(ms: number) => `Ledger #${
                chartData.find((d) => d.time === ms)?.ledgerIndex || ''
              }`}
            />
            <Area
              type="monotone"
              dataKey="txns"
              stroke="#32e685"
              strokeWidth={2.5}
              fill="url(#txnGradient)"
              name="Transactions"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
