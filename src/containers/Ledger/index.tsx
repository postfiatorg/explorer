import { useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import NoMatch from '../NoMatch'
import { Loader } from '../shared/components/Loader'
import { TransactionFeed } from '../shared/components/TransactionFeed/TransactionFeed'
import SocketContext from '../shared/SocketContext'
import { useAnalytics } from '../shared/analytics'
import { NOT_FOUND, BAD_REQUEST, DECIMAL_REGEX, HASH256_REGEX, localizeNumber } from '../shared/utils'
import { useLanguage } from '../shared/hooks'
import { LedgerSummaryCard } from './LedgerSummaryCard'

import './ledger.scss'
import { getLedger } from '../../rippled'
import { useRouteParams, RouteLink } from '../shared/routing'
import { LEDGER_ROUTE } from '../App/routes'

const ERROR_MESSAGES: any = {}
ERROR_MESSAGES[NOT_FOUND] = {
  title: 'ledger_not_found',
  hints: ['server_ledgers_hint'],
}
ERROR_MESSAGES[BAD_REQUEST] = {
  title: 'invalid_ledger_id',
  hints: ['check_ledger_id'],
}
ERROR_MESSAGES.default = {
  title: 'generic_error',
  hints: ['not_your_fault'],
}

const getErrorMessage = (error) =>
  ERROR_MESSAGES[error] || ERROR_MESSAGES.default

export const Ledger = () => {
  const rippledSocket = useContext(SocketContext)
  const { identifier = '' } = useRouteParams(LEDGER_ROUTE)
  const { t } = useTranslation()
  const language = useLanguage()
  const { trackException, trackScreenLoaded } = useAnalytics()

  const {
    data: ledgerData,
    error,
    isLoading,
  } = useQuery(['ledger', identifier], () => {
    if (
      !DECIMAL_REGEX.test(identifier.toString()) &&
      !HASH256_REGEX.test(identifier.toString())
    ) {
      return Promise.reject(BAD_REQUEST)
    }

    return getLedger(identifier, rippledSocket).catch(
      (transactionRequestError) => {
        const status = transactionRequestError.code
        trackException(`ledger ${identifier} --- ${JSON.stringify(error)}`)
        return Promise.reject(status)
      },
    )
  })

  useEffect(() => {
    trackScreenLoaded()
  }, [trackScreenLoaded])

  const renderNav = (data: any) => {
    const previousIndex = data.ledger_index - 1
    const nextIndex = data.ledger_index + 1

    return (
      <div className="ledger-nav">
        <RouteLink to={LEDGER_ROUTE} params={{ identifier: previousIndex }}>
          <span className="ledger-nav-btn">
            <ChevronLeft size={14} />
            {localizeNumber(previousIndex, language)}
          </span>
        </RouteLink>
        <RouteLink to={LEDGER_ROUTE} params={{ identifier: nextIndex }}>
          <span className="ledger-nav-btn">
            {localizeNumber(nextIndex, language)}
            <ChevronRight size={14} />
          </span>
        </RouteLink>
      </div>
    )
  }

  const renderLedger = () =>
    ledgerData?.ledger_hash ? (
      <>
        {renderNav(ledgerData)}
        <LedgerSummaryCard data={ledgerData} />
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2 className="dashboard-panel-title">{t('transactions')}</h2>
          </div>
          <div className="ledger-feed-scroll">
            <TransactionFeed
              transactions={ledgerData.transactions}
              loading={isLoading}
            />
          </div>
        </div>
      </>
    ) : null

  const renderError = () => {
    if (!error) return null
    const message = getErrorMessage(error)
    return <NoMatch title={message.title} hints={message.hints} />
  }

  return (
    <div className="ledger-page">
      <SEOHelmet
        title={`${t('ledger')} ${identifier}`}
        description={t('meta.ledger.description', { identifier })}
        path={`/ledgers/${identifier}`}
        breadcrumbs={[
          { name: t('ledgers'), path: '/' },
          {
            name: `${t('ledger')} ${identifier}`,
            path: `/ledgers/${identifier}`,
          },
        ]}
      />
      {isLoading && <Loader />}
      {renderLedger()}
      {renderError()}
    </div>
  )
}
