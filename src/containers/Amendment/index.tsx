import { useContext } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { useWindowSize } from 'usehooks-ts'
import { useRouteParams } from '../shared/routing'
import { AMENDMENT_ROUTE } from '../App/routes'
import NetworkContext from '../shared/NetworkContext'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { CopyableAddress } from '../shared/components/CopyableAddress/CopyableAddress'
import { StatusBadge } from '../shared/components/StatusBadge/StatusBadge'
import {
  FETCH_INTERVAL_ERROR_MILLIS,
  FETCH_INTERVAL_VHS_MILLIS,
  NOT_FOUND,
  SERVER_ERROR,
  localizeDate,
} from '../shared/utils'
import { useLanguage } from '../shared/hooks'
import { Simple } from './Simple'
import { AmendmentData } from '../shared/vhsTypes'
import Log from '../shared/log'
import { Votes } from './Votes'
import './amendment.scss'
import NoMatch from '../NoMatch'
import { useAnalytics } from '../shared/analytics'
import { Loader } from '../shared/components/Loader'

const DATE_OPTIONS_OVERVIEW = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
  timeZone: 'UTC',
}

export const Amendment = () => {
  const network = useContext(NetworkContext)
  const { identifier = '' } = useRouteParams(AMENDMENT_ROUTE)
  const { width } = useWindowSize()
  const { t } = useTranslation()
  const language = useLanguage()
  const { trackException } = useAnalytics()

  const ERROR_MESSAGES = {
    [NOT_FOUND]: {
      title: 'amendment_not_found',
      hints: ['check_amendment_key'],
    },
    default: {
      title: 'generic_error',
      hints: ['not_your_fault'],
    },
  }

  const getErrorMessage = (error: keyof typeof ERROR_MESSAGES | null) =>
    (error && ERROR_MESSAGES[error]) || ERROR_MESSAGES.default

  const {
    data,
    error,
    isLoading: isAmendmentLoading,
  } = useQuery<AmendmentData, keyof typeof ERROR_MESSAGES | null>(
    ['fetchAmendmentData', identifier, network],
    async () => fetchAmendmentData(),
    {
      refetchInterval: (_) => FETCH_INTERVAL_VHS_MILLIS,
      refetchOnMount: true,
      enabled: !!network,
    },
  )

  const { data: validators, isLoading: isValidatorsLoading } = useQuery(
    ['fetchValidatorsData'],
    () => fetchValidatorsData(),
    {
      refetchInterval: (returnedData, _) =>
        returnedData == null
          ? FETCH_INTERVAL_ERROR_MILLIS
          : FETCH_INTERVAL_VHS_MILLIS,
      refetchOnMount: true,
      enabled: process.env.VITE_ENVIRONMENT !== 'custom' || !!network,
    },
  )

  const fetchAmendmentData = async (): Promise<AmendmentData> => {
    const url = `${process.env.VITE_DATA_URL}/amendment/vote/${network}/${identifier}`
    return axios
      .get(url)
      .then((resp) => resp.data.amendment)
      .catch((axiosError) => {
        const status =
          axiosError.response?.status ?? SERVER_ERROR
        trackException(`${url} --- ${JSON.stringify(axiosError)}`)
        return Promise.reject(status)
      })
  }

  const fetchValidatorsData = () => {
    const url = `${process.env.VITE_DATA_URL}/validators/${network}`
    return axios
      .get(url)
      .then((resp) => resp.data.validators)
      .then((vals) =>
        vals.map((val) => ({
          pubkey: val.validation_public_key,
          signing_key: val.signing_key,
          domain: val.domain,
          unl: val.unl,
        })),
      )
      .catch((e) => Log.error(e))
  }

  const getStatus = (): 'enabled' | 'voting' | 'deprecated' | 'disabled' => {
    if (!data) return 'disabled'
    if (data.deprecated) return 'deprecated'
    if (!data.voted) return 'enabled'
    return 'voting'
  }

  const getStatusLabel = (): string => {
    const status = getStatus()
    if (status === 'enabled') return 'Enabled'
    if (status === 'voting') return 'In Voting'
    if (status === 'deprecated') return 'Deprecated'
    return 'Not Enabled'
  }

  const voting = data?.voted !== undefined

  function renderOverviewGrid() {
    if (!data || !(validators instanceof Array)) return null

    if (voting && data.voted) {
      const yeasAll = data.voted.validators.length
      const naysAll = validators.length - yeasAll
      return (
        <div className="detail-overview-grid">
          <div className="detail-overview-item">
            <span className="detail-overview-label">{`${t('yeas')} (${t('all')})`}</span>
            <span className="detail-overview-value">{yeasAll}</span>
          </div>
          <div className="detail-overview-item">
            <span className="detail-overview-label">{`${t('nays')} (${t('all')})`}</span>
            <span className="detail-overview-value">{naysAll}</span>
          </div>
          {data.threshold && (
            <div className="detail-overview-item">
              <span className="detail-overview-label">{t('threshold')}</span>
              <span className="detail-overview-value">{data.threshold}</span>
            </div>
          )}
          {data.consensus && (
            <div className="detail-overview-item">
              <span className="detail-overview-label">{t('consensus')}</span>
              <span className="detail-overview-value">{data.consensus}</span>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="detail-overview-grid">
        {data.rippled_version && (
          <div className="detail-overview-item">
            <span className="detail-overview-label">{t('introduced_in')}</span>
            <span className="detail-overview-value">v{data.rippled_version}</span>
          </div>
        )}
        {data.date && (
          <div className="detail-overview-item detail-overview-item-wide">
            <span className="detail-overview-label">{t('enabled')}</span>
            <span className="detail-overview-value">
              {localizeDate(new Date(data.date), language, DATE_OPTIONS_OVERVIEW)} UTC
            </span>
          </div>
        )}
      </div>
    )
  }

  let body
  const shortId = identifier.substring(0, 12)

  if (error) {
    const message = getErrorMessage(error)
    body = <NoMatch title={message.title} hints={message.hints} errorCode={(error as any)?.code} />
  } else if (data?.id && validators instanceof Array) {
    body = (
      <>
        <div className="amendment-hero detail-summary dashboard-panel">
          <div className="detail-summary-label">Amendment</div>
          <div className="detail-summary-title">
            {data.name || shortId}
          </div>
          <div className="amendment-hero-badges">
            <StatusBadge status={getStatus()} label={getStatusLabel()} />
          </div>
          <div className="detail-summary-hash-row">
            <span className="detail-summary-hash-label">Amendment ID:</span>
            <CopyableAddress address={data.id} truncate />
          </div>
        </div>
        {renderOverviewGrid()}
        <div className="amendment-content dashboard-panel">
          {data && validators && (
            <Simple data={data} validators={validators} width={width} />
          )}
        </div>
        {data && validators && <Votes data={data} validators={validators} />}
      </>
    )
  }

  return (
    <div className="amendment-page">
      <SEOHelmet
        title={`${t('amendments')} ${shortId}...`}
        description={t('meta.amendment.description', { id: shortId })}
        path={`/amendment/${identifier}`}
        breadcrumbs={[
          { name: t('amendments'), path: '/amendments' },
          { name: `${shortId}...`, path: `/amendment/${identifier}` },
        ]}
      />
      {(isValidatorsLoading || isAmendmentLoading) && <Loader />}
      {body}
    </div>
  )
}
