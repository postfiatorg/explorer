import { useTranslation } from 'react-i18next'
import { FC } from 'react'
import { RouteLink } from '../shared/routing'
import { localizeDate } from '../shared/utils'
import { useLanguage } from '../shared/hooks'
import { ValidatorSupplemented } from '../shared/vhsTypes'
import { LEDGER_ROUTE } from '../App/routes'
import DomainLink from '../shared/components/DomainLink'
import SuccessIcon from '../shared/images/success.svg'
import successIcon from '../shared/images/success.png'
import './simpleTab.scss'

const TIME_ZONE = 'UTC'
const DATE_OPTIONS = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour12: true,
  timeZone: TIME_ZONE,
}

export const SimpleTab: FC<{
  data: ValidatorSupplemented
}> = ({ data }) => {
  const language = useLanguage()
  const { t } = useTranslation()

  return (
    <div className="validator-details">
      <div className="validator-detail-row">
        <span className="validator-detail-label">{t('domain')}</span>
        <span className="validator-detail-value">
          {data.domain ? <DomainLink domain={data.domain} /> : 'Unknown'}
        </span>
      </div>
      {data.domain_verified && (
        <div className="validator-detail-row">
          <span className="validator-detail-label">{t('domain_verified')}</span>
          <span className="validator-detail-value validator-detail-verified">
            <SuccessIcon title="Domain verified" alt="Domain verified" />
          </span>
        </div>
      )}
      <div className="validator-detail-row">
        <span className="validator-detail-label">{t('rippled_version')}</span>
        <span className="validator-detail-value">
          {data.server_version || 'Unknown'}
        </span>
      </div>
      <div className="validator-detail-row">
        <span className="validator-detail-label">Master Key</span>
        <span className="validator-detail-value validator-detail-truncate">
          {data.master_key || 'Unknown'}
        </span>
      </div>
      <div className="validator-detail-row">
        <span className="validator-detail-label">Signing Key</span>
        <span className="validator-detail-value validator-detail-truncate">
          {data.signing_key || 'Unknown'}
        </span>
      </div>
      {data.current_index && (
        <div className="validator-detail-row">
          <span className="validator-detail-label">{t('ledger')}</span>
          <span className="validator-detail-value validator-detail-truncate">
            <RouteLink
              to={LEDGER_ROUTE}
              params={{ identifier: data.current_index }}
            >
              {data.ledger_hash || data.current_index}
            </RouteLink>
          </span>
        </div>
      )}
      {data.last_ledger_time && (
        <div className="validator-detail-row">
          <span className="validator-detail-label">
            Last Ledger {t('formatted_date', { timeZone: TIME_ZONE })}
          </span>
          <span className="validator-detail-value">
            {localizeDate(
              new Date(data.last_ledger_time),
              language,
              DATE_OPTIONS,
            )}
          </span>
        </div>
      )}
      {data.unl && (
        <div className="validator-detail-row">
          <span className="validator-detail-label">UNL</span>
          <span className="validator-detail-value validator-detail-unl">
            <img src={successIcon} alt={data.unl.toString()} /> {data.unl}
          </span>
        </div>
      )}
    </div>
  )
}
