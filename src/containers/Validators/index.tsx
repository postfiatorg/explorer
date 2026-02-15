import { useContext, useEffect } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import NoMatch from '../NoMatch'
import { Loader } from '../shared/components/Loader'
import { Tabs } from '../shared/components/Tabs'
import { CopyableAddress } from '../shared/components/CopyableAddress/CopyableAddress'
import { StatusBadge } from '../shared/components/StatusBadge/StatusBadge'
import { useAnalytics } from '../shared/analytics'
import {
  FETCH_INTERVAL_ERROR_MILLIS,
  FETCH_INTERVAL_VHS_MILLIS,
  NOT_FOUND,
  SERVER_ERROR,
} from '../shared/utils'
import { getLedger } from '../../rippled'
import { SimpleTab } from './SimpleTab'
import { HistoryTab } from './HistoryTab'
import './validator.scss'
import SocketContext from '../shared/SocketContext'
import { ValidatorReport, ValidatorSupplemented } from '../shared/vhsTypes'
import NetworkContext from '../shared/NetworkContext'
import { VALIDATOR_ROUTE } from '../App/routes'
import { buildPath, useRouteParams } from '../shared/routing'
import { VotingTab } from './VotingTab'
import logger from '../../rippled/lib/logger'

const log = logger({ name: 'validator' })

const ERROR_MESSAGES = {
  [NOT_FOUND]: {
    title: 'validator_not_found',
    hints: ['check_validator_key'],
  },
  default: {
    title: 'generic_error',
    hints: ['not_your_fault'],
  },
}

const getErrorMessage = (error: keyof typeof ERROR_MESSAGES | null) =>
  (error && ERROR_MESSAGES[error]) || ERROR_MESSAGES.default

export const Validator = () => {
  const rippledSocket = useContext(SocketContext)
  const network = useContext(NetworkContext)
  const { identifier = '', tab = 'details' } = useRouteParams(VALIDATOR_ROUTE)
  const { trackException, trackScreenLoaded } = useAnalytics()
  const { t } = useTranslation()

  const {
    data,
    error,
    isFetching: dataIsLoading,
  } = useQuery<ValidatorSupplemented, keyof typeof ERROR_MESSAGES | null>(
    ['fetchValidatorData', identifier],
    async () => fetchValidatorData(),
    {
      refetchInterval: (returnedData, query) => {
        if (query.state.error === NOT_FOUND) return false
        if (returnedData == null) return FETCH_INTERVAL_ERROR_MILLIS
        return FETCH_INTERVAL_VHS_MILLIS
      },
      retry: (_count, err) => err !== NOT_FOUND,
      refetchOnMount: true,
      enabled: !!network,
    },
  )

  const { data: reports, isFetching: reportIsLoading } = useQuery(
    ['fetchValidatorReport', identifier],
    async () => fetchValidatorReport(),
    {
      refetchInterval: FETCH_INTERVAL_VHS_MILLIS,
      refetchOnMount: true,
    },
  )

  useEffect(() => {
    trackScreenLoaded({ validator: identifier })
  }, [identifier, tab, trackScreenLoaded])

  function fetchValidatorReport(): Promise<ValidatorReport[]> {
    return axios
      .get(`${process.env.VITE_DATA_URL}/validator/${identifier}/reports`)
      .then((resp) => resp.data.reports ?? [])
      .then((vhsReports: ValidatorReport[]) =>
        vhsReports.sort((a, b) => (a.date > b.date ? -1 : 1)),
      )
  }

  function fetchValidatorData() {
    const url = `${process.env.VITE_DATA_URL}/validator/${identifier}`
    return axios
      .get(url)
      .then((resp) => resp.data)
      .then((response) => {
        if (response.ledger_hash == null) {
          return getLedger(response.current_index, rippledSocket)
            .then((ledgerData) => ({
              ...response,
              ledger_hash: ledgerData.ledger_hash,
              last_ledger_time: ledgerData.close_time,
            }))
            .catch((ledgerError) => {
              log.error(`Error fetching ledger data: ${ledgerError.message}`)
              return response
            })
        }
        return response
      })
      .catch((axiosError) => {
        const status = axiosError.response?.status ?? SERVER_ERROR
        trackException(`${url} --- ${JSON.stringify(axiosError)}`)
        return Promise.reject(status)
      })
  }

  function renderPageTitle() {
    if (!data) return undefined
    let short = ''
    if (data.domain) short = data.domain
    else if (data.master_key) short = `${data.master_key.substring(0, 8)}...`
    else if (data.signing_key) short = `${data.signing_key.substring(0, 8)}...`
    return (
      <SEOHelmet
        title={`${t('validator')} ${short}`}
        description={t('meta.validator.description', { id: short })}
        path={`/validators/${identifier}`}
        breadcrumbs={[
          { name: t('validators'), path: '/network/validators' },
          {
            name: `${t('validator')} ${short}`,
            path: `/validators/${identifier}`,
          },
        ]}
      />
    )
  }

  function getAgreementColor(score: number): string {
    if (score >= 0.99) return 'green'
    if (score >= 0.95) return 'yellow'
    return 'orange'
  }

  function renderHero() {
    const domain = data?.domain
    const masterKey = data?.master_key
    const signingKey = data?.signing_key
    const isUnl = Boolean(data?.unl)

    return (
      <div className="validator-hero detail-summary dashboard-panel">
        <div className="detail-summary-label">Validator</div>
        <div className="detail-summary-title">
          {domain ||
            (masterKey
              ? `${masterKey.substring(0, 12)}...`
              : 'Unknown Validator')}
        </div>
        <div className="validator-hero-badges">
          {isUnl && <StatusBadge status="verified" label="UNL" />}
          {data?.domain_verified && (
            <StatusBadge status="verified" label="Domain Verified" />
          )}
        </div>
        {masterKey && (
          <div className="detail-summary-hash-row">
            <span className="detail-summary-hash-label">Master Key:</span>
            <CopyableAddress address={masterKey} truncate />
          </div>
        )}
        {signingKey && signingKey !== masterKey && (
          <div className="detail-summary-hash-row">
            <span className="detail-summary-hash-label">Signing Key:</span>
            <CopyableAddress address={signingKey} truncate />
          </div>
        )}
      </div>
    )
  }

  function renderOverviewGrid() {
    if (!data) return null
    const scores = [
      { label: 'Agreement (1H)', score: data.agreement_1h },
      { label: 'Agreement (24H)', score: data.agreement_24h },
      { label: 'Agreement (30D)', score: data.agreement_30day },
    ]
    const hasScores = scores.some((s) => s.score != null)
    if (!hasScores) return null
    const hasIncomplete = scores.some((s) => s.score?.incomplete)

    return (
      <div className="detail-overview-grid">
        {scores.map((s) => {
          if (!s.score) return null
          const value = Number(s.score.score)
          const color = getAgreementColor(value)
          return (
            <div className="detail-overview-item" key={s.label}>
              <span className="detail-overview-label">{s.label}</span>
              <span
                className={`detail-overview-value agreement-value ${color}`}
              >
                {(value * 100).toFixed(2)}%{s.score.incomplete && '*'}
              </span>
              <div className="agreement-bar-track">
                <div
                  className={`agreement-bar-fill ${color}`}
                  style={{ width: `${value * 100}%` }}
                />
              </div>
            </div>
          )
        })}
        {hasIncomplete && (
          <span className="detail-overview-footnote">
            * Incomplete scoring period
          </span>
        )}
      </div>
    )
  }

  function renderTabs() {
    const tabsList = ['details', 'history', 'voting']
    const mainPath = buildPath(VALIDATOR_ROUTE, { identifier })
    return <Tabs tabs={tabsList} selected={tab} path={mainPath} />
  }

  function renderValidator() {
    return (
      <>
        {renderPageTitle()}
        {renderHero()}
        {renderOverviewGrid()}
        {renderTabs()}
        {tab === 'history' && (
          <div className="validator-tab-body dashboard-panel">
            <HistoryTab reports={reports ?? []} />
          </div>
        )}
        {tab === 'voting' && data && (
          <div className="validator-tab-body dashboard-panel">
            <VotingTab validatorData={data} network={network} />
          </div>
        )}
        {tab === 'details' && data && (
          <div className="validator-tab-body dashboard-panel">
            <SimpleTab data={data} />
          </div>
        )}
      </>
    )
  }

  const isLoading = dataIsLoading || reportIsLoading
  let body

  if (error) {
    const message = getErrorMessage(error)
    body = (
      <NoMatch
        title={message.title}
        hints={message.hints}
        errorCode={(error as any)?.code}
      />
    )
  } else if (data?.master_key || data?.signing_key) {
    body = renderValidator()
  } else if (!isLoading) {
    body = (
      <div className="validator-empty">
        <h2>Could not load validator</h2>
      </div>
    )
  }

  return (
    <div className="validator">
      {renderPageTitle()}
      {isLoading && <Loader />}
      {body}
    </div>
  )
}
