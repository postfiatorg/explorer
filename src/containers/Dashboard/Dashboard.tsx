import { FC, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { useAnalytics } from '../shared/analytics'
import { HeroStats } from './HeroStats/HeroStats'
import { NetworkActivityChart } from './NetworkActivityChart/NetworkActivityChart'
import { LiveTransactionFeed } from './LiveTransactionFeed/LiveTransactionFeed'
import { RecentLedgers } from './RecentLedgers/RecentLedgers'
import { TransactionBreakdown } from './TransactionBreakdown/TransactionBreakdown'
import { NetworkHealth } from './NetworkHealth/NetworkHealth'
import './dashboard.scss'

export const Dashboard: FC = () => {
  const { trackScreenLoaded } = useAnalytics()
  const { t } = useTranslation()

  useEffect(() => {
    trackScreenLoaded()
  }, [trackScreenLoaded])

  return (
    <div className="dashboard">
      <SEOHelmet
        title={t('ledgers')}
        description={t('meta.home.description')}
        path="/"
      />
      <HeroStats />
      <div className="dashboard-columns">
        <div className="dashboard-column">
          <NetworkActivityChart />
          <RecentLedgers />
        </div>
        <div className="dashboard-column">
          <LiveTransactionFeed />
          <TransactionBreakdown />
        </div>
      </div>
      <NetworkHealth />
    </div>
  )
}
