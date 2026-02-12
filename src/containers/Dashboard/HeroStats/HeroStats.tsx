import { FC } from 'react'
import {
  Activity,
  Timer,
  Layers,
  Zap,
  DollarSign,
  Shield,
} from 'lucide-react'
import { MetricCard } from './MetricCard'
import { useStreams } from '../../shared/hooks/useStreams'

const formatFee = (fee: string | undefined): string | undefined => {
  if (!fee) return undefined
  const num = parseFloat(fee)
  if (isNaN(num)) return fee
  if (num === 0) return '0'
  if (num >= 0.01) return num.toFixed(4)
  return num.toFixed(6).replace(/0+$/, '')
}

export const HeroStats: FC = () => {
  const { metrics, metricsHistory } = useStreams()

  const extractSparkline = (key: string) =>
    metricsHistory.map((m) => parseFloat(m[key]) || 0).slice(-30)

  return (
    <div className="hero-stats">
      <MetricCard
        label="TPS"
        value={metrics?.txn_sec}
        icon={Activity}
        sparklineData={extractSparkline('txn_sec')}
        sparklineColor="#32e685"
      />
      <MetricCard
        label="Ledger Interval"
        value={metrics?.ledger_interval ? `${metrics.ledger_interval}s` : undefined}
        icon={Timer}
        sparklineData={extractSparkline('ledger_interval')}
        sparklineColor="#19a3ff"
      />
      <MetricCard
        label="Txn / Ledger"
        value={metrics?.txn_ledger}
        icon={Layers}
        sparklineData={extractSparkline('txn_ledger')}
        sparklineColor="#9a52ff"
      />
      <MetricCard
        label="Avg Fee"
        value={formatFee(metrics?.avg_fee)}
        unit="PFT"
        icon={DollarSign}
        sparklineData={extractSparkline('avg_fee')}
        sparklineColor="#ff884b"
      />
      <MetricCard
        label="Base Fee"
        value={formatFee(metrics?.base_fee)}
        unit="PFT"
        icon={Zap}
        sparklineColor="#faff19"
      />
      <MetricCard
        label="Quorum"
        value={metrics?.quorum}
        icon={Shield}
        sparklineColor="#ff198b"
      />
    </div>
  )
}
