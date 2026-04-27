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
import { ScoringStatusBadge } from '../Network/ScoringStatusBadge'
import { ScoringRing } from '../Network/ScoringRing'
import { useScoringContext } from '../Network/useScoringContext'
import { useScoringAvailability } from '../Network/useScoringAvailability'
import { Skeleton } from '../shared/components/Skeleton/Skeleton'
import {
  SCORING_DIMENSIONS,
  findScoreEntry,
  getAgreementColor,
  getScoringInfoForValidator,
  getScoreColor,
  getStatusColor,
} from '../Network/scoringUtils'
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

  const { context: scoringContext, latestAttempt } = useScoringContext()
  const { state: scoringState } = useScoringAvailability()

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

  function renderScoringSection() {
    // Genesis — no rounds have ever completed on this network; omit the
    // Scoring section entirely until the first round lands.
    if (scoringState === 'genesis') return null

    // Loading — show a skeleton placeholder instead of a dashed "no data"
    // state so the section doesn't pop in after a visible delay.
    if (scoringState === 'loading' && !scoringContext) {
      return (
        <div className="detail-scoring dashboard-panel">
          <div className="detail-scoring-header">
            <span className="detail-scoring-title">Scoring</span>
          </div>
          <div className="detail-scoring-body">
            <div className="detail-scoring-overall-half">
              <Skeleton variant="circle" width={120} height={120} />
            </div>
            <div className="detail-scoring-dimensions-half">
              {SCORING_DIMENSIONS.map((dim) => (
                <div className="detail-scoring-dim-row" key={dim.key}>
                  <Skeleton variant="text" width={80} />
                  <div className="detail-scoring-dim-bar-wrapper">
                    <Skeleton variant="rect" height={8} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Error without a warm cache — the service is unreachable and the proxy
    // has nothing to serve; render a compact inline notice rather than an
    // empty section.
    if (scoringState === 'error' && !scoringContext) {
      return (
        <div className="detail-scoring dashboard-panel">
          <div className="detail-scoring-header">
            <span className="detail-scoring-title">Scoring</span>
          </div>
          <p className="detail-scoring-no-data">
            Scoring data temporarily unavailable.
          </p>
        </div>
      )
    }

    if (!scoringContext) return null

    const masterKey = data?.master_key ?? data?.signing_key
    const scoringInfo = getScoringInfoForValidator(
      data?.master_key,
      scoringContext,
    )
    const scoreEntry = findScoreEntry(data?.master_key, scoringContext.scores)
    const { round } = scoringContext

    const scoringLink = masterKey
      ? `/unl-scoring/rounds/${round.round_number}?validator=${masterKey}`
      : '/unl-scoring'

    const failedRoundNote =
      latestAttempt &&
      latestAttempt.status === 'FAILED' &&
      latestAttempt.round_number > round.round_number ? (
        <a
          className="detail-scoring-failed-note"
          href={`/unl-scoring/rounds/${latestAttempt.round_number}`}
        >
          round #{latestAttempt.round_number} failed — see why
        </a>
      ) : null

    if (scoringInfo.status === 'no_data' || !scoreEntry) {
      return (
        <div className="detail-scoring dashboard-panel">
          <div className="detail-scoring-header">
            <span className="detail-scoring-title">Scoring</span>
            {failedRoundNote}
          </div>
          <p className="detail-scoring-no-data">
            This validator wasn&apos;t scored in the latest round. Validators
            appear in rounds automatically once they&apos;re active on the
            network — no registration required.
          </p>
        </div>
      )
    }

    const overall = scoreEntry.score
    const overallColor = getStatusColor(scoringInfo.status)

    return (
      <div className="detail-scoring dashboard-panel">
        <div className="detail-scoring-header">
          <span className="detail-scoring-title">Scoring</span>
          {failedRoundNote}
        </div>

        <div className="detail-scoring-body">
          <div className="detail-scoring-overall-half">
            <ScoringRing score={overall} color={overallColor} size={120} />
            <ScoringStatusBadge info={scoringInfo} hideScore />
          </div>

          <div className="detail-scoring-dimensions-half">
            {SCORING_DIMENSIONS.map((dim) => {
              const value = scoreEntry[dim.key]
              const color = getScoreColor(value)
              return (
                <div
                  className="detail-scoring-dim-row"
                  key={dim.key}
                  title={dim.tooltip}
                >
                  <span className="detail-scoring-dim-label">{dim.label}</span>
                  <div className="detail-scoring-dim-bar-wrapper">
                    <div className="agreement-bar-track">
                      <div
                        className={`agreement-bar-fill ${color}`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`detail-scoring-dim-value agreement-value ${color}`}
                  >
                    {value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="detail-scoring-footer">
          <a className="detail-scoring-link" href={scoringLink}>
            View reasoning and round history →
          </a>
        </div>
      </div>
    )
  }

  function renderValidator() {
    return (
      <>
        {renderPageTitle()}
        {renderHero()}
        {renderOverviewGrid()}
        {renderScoringSection()}
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
