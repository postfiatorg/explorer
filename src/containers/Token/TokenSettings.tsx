import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../shared/components/StatusBadge/StatusBadge'
import DomainLink from '../shared/components/DomainLink'
import { RouteLink } from '../shared/routing'
import { LEDGER_ROUTE, TRANSACTION_ROUTE } from '../App/routes'
import { TokenData } from '../../rippled/token'

interface TokenSettingsProps {
  data: TokenData
}

const FLAG_MAP: Array<{
  flag: string
  label: string
  enabledLabel: string
  disabledLabel: string
}> = [
  {
    flag: 'lsfDefaultRipple',
    label: 'Rippling',
    enabledLabel: 'Enabled',
    disabledLabel: 'Disabled',
  },
  {
    flag: 'lsfDepositAuth',
    label: 'Deposit Auth',
    enabledLabel: 'Enabled',
    disabledLabel: 'Disabled',
  },
  {
    flag: 'lsfDisableMaster',
    label: 'Master Key',
    enabledLabel: 'Disabled',
    disabledLabel: 'Enabled',
  },
  {
    flag: 'lsfDisallowXRP',
    label: 'Receiving PFT',
    enabledLabel: 'Disabled',
    disabledLabel: 'Enabled',
  },
  {
    flag: 'lsfGlobalFreeze',
    label: 'Frozen',
    enabledLabel: 'Enabled',
    disabledLabel: 'Disabled',
  },
  {
    flag: 'lsfNoFreeze',
    label: 'No Freeze',
    enabledLabel: 'Enabled',
    disabledLabel: 'Disabled',
  },
  {
    flag: 'lsfRequireAuth',
    label: 'Require Auth',
    enabledLabel: 'Enabled',
    disabledLabel: 'Disabled',
  },
  {
    flag: 'lsfRequireDestTag',
    label: 'Require Dest Tag',
    enabledLabel: 'Enabled',
    disabledLabel: 'Disabled',
  },
  {
    flag: 'lsfAllowTrustLineClawback',
    label: 'Clawback',
    enabledLabel: 'Enabled',
    disabledLabel: 'Disabled',
  },
]

export const TokenSettings: FC<TokenSettingsProps> = ({ data }) => {
  const { t } = useTranslation()
  const { domain, emailHash, previousLedger, previousTxn, flags } = data
  const truncatedTxn = previousTxn?.replace(/(.{20})..+/, '$1...')

  return (
    <div className="token-settings-columns">
      <div className="token-details-panel dashboard-panel">
        <h3 className="dashboard-panel-title">{t('details')}</h3>
        <div className="token-details-list">
          {domain && (
            <div className="token-detail-row">
              <span className="token-detail-label">Domain</span>
              <span className="token-detail-value">
                <DomainLink domain={domain} />
              </span>
            </div>
          )}
          {previousLedger && (
            <div className="token-detail-row">
              <span className="token-detail-label">Last Ledger</span>
              <span className="token-detail-value">
                <RouteLink
                  to={LEDGER_ROUTE}
                  params={{ identifier: previousLedger }}
                >
                  {previousLedger}
                </RouteLink>
              </span>
            </div>
          )}
          {previousTxn && (
            <div className="token-detail-row">
              <span className="token-detail-label">Last Transaction</span>
              <span className="token-detail-value">
                <RouteLink
                  to={TRANSACTION_ROUTE}
                  params={{ identifier: previousTxn }}
                >
                  {truncatedTxn}
                </RouteLink>
              </span>
            </div>
          )}
          {emailHash && (
            <div className="token-detail-row">
              <span className="token-detail-label">Email Hash</span>
              <span className="token-detail-value mono">
                {emailHash.replace(/(.{20})..+/, '$1...')}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="token-flags-panel dashboard-panel">
        <h3 className="dashboard-panel-title">{t('settings')}</h3>
        <div className="token-flags-grid">
          {FLAG_MAP.map(({ flag, label, enabledLabel, disabledLabel }) => {
            const isSet = flags?.includes(flag)
            const displayLabel = isSet ? enabledLabel : disabledLabel
            return (
              <div className="token-flag-item" key={flag}>
                <span className="token-flag-label">{label}</span>
                <StatusBadge
                  status={displayLabel === 'Enabled' ? 'enabled' : 'disabled'}
                  label={displayLabel}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
