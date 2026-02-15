import { useContext } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { useRouteParams, RouteLink } from '../shared/routing'
import { AMENDMENT_ROUTE, TRANSACTION_ROUTE } from '../App/routes'
import NetworkContext from '../shared/NetworkContext'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { CopyableAddress } from '../shared/components/CopyableAddress/CopyableAddress'
import { StatusBadge } from '../shared/components/StatusBadge/StatusBadge'
import {
  FETCH_INTERVAL_VHS_MILLIS,
  NOT_FOUND,
  SERVER_ERROR,
  localizeDate,
} from '../shared/utils'
import { useLanguage } from '../shared/hooks'
import { AmendmentData } from '../shared/vhsTypes'
import './amendment.scss'
import NoMatch from '../NoMatch'
import { useAnalytics } from '../shared/analytics'
import { Loader } from '../shared/components/Loader'

const DATE_OPTIONS = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
  timeZone: 'UTC',
}

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

export const Amendment = () => {
  const network = useContext(NetworkContext)
  const { identifier = '' } = useRouteParams(AMENDMENT_ROUTE)
  const { t } = useTranslation()
  const language = useLanguage()
  const { trackException } = useAnalytics()

  const {
    data,
    error,
    isLoading,
  } = useQuery<AmendmentData, keyof typeof ERROR_MESSAGES | null>(
    ['fetchAmendmentData', identifier, network],
    async () => {
      const url = `${process.env.VITE_DATA_URL}/amendment/vote/${network}/${identifier}`
      return axios
        .get(url)
        .then((resp) => resp.data.amendment)
        .catch((axiosError) => {
          const status = axiosError.response?.status ?? SERVER_ERROR
          trackException(`${url} --- ${JSON.stringify(axiosError)}`)
          return Promise.reject(status)
        })
    },
    {
      refetchInterval: () => FETCH_INTERVAL_VHS_MILLIS,
      refetchOnMount: true,
      enabled: !!network,
    },
  )

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

  const detailsUrl = data
    ? `https://xrpl.org/resources/known-amendments#${data.name.toLowerCase()}`
    : null

  const shortId = identifier.substring(0, 12)

  let body
  if (error) {
    const message = getErrorMessage(error)
    body = <NoMatch title={message.title} hints={message.hints} errorCode={(error as any)?.code} />
  } else if (data?.id) {
    body = (
      <div className="amendment-hero detail-summary dashboard-panel">
        <div className="detail-summary-label">Amendment</div>
        <div className="detail-summary-title">{data.name || shortId}</div>
        <div className="amendment-hero-badges">
          <StatusBadge status={getStatus()} label={getStatusLabel()} />
        </div>
        <div className="detail-summary-hash-row">
          <span className="detail-summary-hash-label">Amendment ID:</span>
          <CopyableAddress address={data.id} truncate />
        </div>

        <div className="amendment-info">
          {data.date && (
            <div className="amendment-info-row">
              <span className="amendment-info-label">{t('enabled')}</span>
              <span className="amendment-info-value">
                {localizeDate(new Date(data.date), language, DATE_OPTIONS)} UTC
              </span>
            </div>
          )}
          {data.rippled_version && (
            <div className="amendment-info-row">
              <span className="amendment-info-label">{t('introduced_in')}</span>
              <span className="amendment-info-value">
                <Link
                  to={`https://github.com/postfiatorg/pftld/releases/tag/${data.rippled_version}`}
                  target="_blank"
                >
                  v{data.rippled_version}
                </Link>
              </span>
            </div>
          )}
          {data.tx_hash && (
            <div className="amendment-info-row">
              <span className="amendment-info-label">{t('enable_tx')}</span>
              <span className="amendment-info-value amendment-info-truncate">
                <RouteLink to={TRANSACTION_ROUTE} params={{ identifier: data.tx_hash }}>
                  {data.tx_hash}
                </RouteLink>
              </span>
            </div>
          )}
          {detailsUrl && (
            <div className="amendment-info-row">
              <span className="amendment-info-label">{t('details')}</span>
              <span className="amendment-info-value amendment-info-truncate">
                <Link to={detailsUrl} target="_blank">{detailsUrl}</Link>
              </span>
            </div>
          )}
        </div>
      </div>
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
      {isLoading && <Loader />}
      {body}
    </div>
  )
}
