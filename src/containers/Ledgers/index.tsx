import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { LedgerMetrics } from './LedgerMetrics'
import { Ledgers } from './Ledgers'
import { useAnalytics } from '../shared/analytics'
import { TooltipProvider } from '../shared/components/Tooltip'
import { SelectedValidatorProvider } from './useSelectedValidator'
import { useStreams } from '../shared/hooks/useStreams'

export const LedgersPage = () => {
  const { trackScreenLoaded } = useAnalytics()
  const { ledgers, metrics, externalValidators, unlCount } = useStreams()
  const [paused, setPaused] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    trackScreenLoaded()
    return () => {
      window.scrollTo(0, 0)
    }
  }, [trackScreenLoaded])

  const pause = () => setPaused(!paused)

  return (
    <div className="ledgers-page">
      <SEOHelmet
        title={t('ledgers')}
        description={t('meta.home.description')}
        path="/"
      />
      <SelectedValidatorProvider>
        <TooltipProvider>
          <LedgerMetrics
            data={metrics}
            onPause={() => pause()}
            paused={paused}
          />
        </TooltipProvider>
        <Ledgers
          ledgers={ledgers}
          validators={externalValidators}
          unlCount={unlCount}
          paused={paused}
        />
      </SelectedValidatorProvider>
    </div>
  )
}
