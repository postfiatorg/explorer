import { FC, useEffect, useMemo } from 'react'
import { Info } from 'lucide-react'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { useAnalytics } from '../shared/analytics'
import { useStreams } from '../shared/hooks/useStreams'
import { AnalyticsChart } from './AnalyticsChart'
import './analytics.scss'

export const Analytics: FC = () => {
  const { trackScreenLoaded } = useAnalytics()
  const { metricsHistory } = useStreams()

  useEffect(() => {
    trackScreenLoaded()
  }, [trackScreenLoaded])

  const extractSeries = useMemo(
    () => (key: string) =>
      metricsHistory
        .filter((m) => m[key] != null)
        .map((m) => ({
          timestamp: m.timestamp,
          value: parseFloat(m[key]) || 0,
        })),
    [metricsHistory],
  )

  return (
    <div className="analytics-page">
      <SEOHelmet
        title="Analytics"
        description="Network analytics and metrics for the PFT Ledger"
        path="/analytics"
      />
      <div className="analytics-header">
        <h1 className="analytics-title">Analytics</h1>
        <span className="analytics-session-label">
          <Info size={14} />
          Data shown from current session
        </span>
      </div>
      <div className="analytics-grid">
        <AnalyticsChart
          title="Transaction Volume"
          subtitle="Transactions per second"
          data={extractSeries('txn_sec')}
          color="#32e685"
          variant="area"
        />
        <AnalyticsChart
          title="Network TPS"
          subtitle="Transactions per second (live)"
          data={extractSeries('txn_sec')}
          color="#19a3ff"
          variant="area"
        />
        <AnalyticsChart
          title="Average Fee"
          subtitle="Average transaction fee (PFT)"
          data={extractSeries('avg_fee')}
          color="#ff884b"
          variant="line"
        />
        <AnalyticsChart
          title="Ledger Close Time"
          subtitle="Seconds between ledger closes"
          data={extractSeries('ledger_interval')}
          color="#9a52ff"
          variant="line"
        />
        <AnalyticsChart
          title="Transactions per Ledger"
          subtitle="Average transactions in each ledger"
          data={extractSeries('txn_ledger')}
          color="#ff198b"
          variant="line"
        />
        <AnalyticsChart
          title="Validator Agreement"
          subtitle="Quorum threshold"
          data={extractSeries('quorum')}
          color="#faff19"
          variant="line"
        />
      </div>
    </div>
  )
}
