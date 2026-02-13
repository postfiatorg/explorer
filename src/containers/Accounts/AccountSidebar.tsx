import { FC } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Account } from '../shared/components/Account'
import Currency from '../shared/components/Currency'
import DomainLink from '../shared/components/DomainLink'
import { localizeNumber } from '../shared/utils'
import { useLanguage } from '../shared/hooks'
import { AccountState } from '../../rippled/accountState'

const CURRENCY_OPTIONS = {
  style: 'currency',
  currency: 'PFT',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
}

interface AccountSidebarProps {
  account: AccountState
  currencySelected: string
  onSetCurrencySelected: (currency: string) => void
}

export const AccountSidebar: FC<AccountSidebarProps> = ({
  account,
  currencySelected,
  onSetCurrencySelected,
}) => {
  const { t } = useTranslation()
  const language = useLanguage()
  const { balances = {}, info, escrows, paychannels, signerList, xAddress } = account

  const displayBalances = { ...balances }
  if ('XRP' in displayBalances) {
    displayBalances.PFT = displayBalances.XRP
    delete displayBalances.XRP
  }

  const balanceKey = currencySelected === 'PFT' ? 'XRP' : currencySelected
  const balance = localizeNumber(balances[balanceKey] || 0.0, language, {
    style: 'currency',
    currency: currencySelected,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const reserve = info
    ? localizeNumber(info.reserve || 0.0, language, CURRENCY_OPTIONS)
    : null

  return (
    <div className="account-sidebar">
      {!account.deleted && (
        <div className="sidebar-balance-card dashboard-panel">
          <div className="sidebar-balance-label">
            <Trans i18nKey="currency_balance">
              <Currency currency={currencySelected} />
            </Trans>
          </div>
          <div className="sidebar-balance-value">{balance}</div>
          {reserve && (
            <div className="sidebar-reserve">
              <span className="sidebar-reserve-label">{t('reserve')}</span>
              <span className="sidebar-reserve-value">{reserve}</span>
            </div>
          )}
        </div>
      )}

      {info && (
        <div className="sidebar-meta dashboard-panel">
          <h3 className="dashboard-panel-title">{t('account_info')}</h3>
          <div className="sidebar-meta-list">
            {info.sequence != null && (
              <div className="sidebar-meta-row">
                <span className="sidebar-meta-label">{t('current_sequence')}</span>
                <span className="sidebar-meta-value">{localizeNumber(info.sequence, language)}</span>
              </div>
            )}
            {info.domain && (
              <div className="sidebar-meta-row">
                <span className="sidebar-meta-label">{t('domain')}</span>
                <span className="sidebar-meta-value"><DomainLink domain={info.domain} /></span>
              </div>
            )}
            {info.emailHash && (
              <div className="sidebar-meta-row">
                <span className="sidebar-meta-label">{t('email_hash')}</span>
                <span className="sidebar-meta-value mono">{info.emailHash}</span>
              </div>
            )}
            {info.nftMinter && (
              <div className="sidebar-meta-row">
                <span className="sidebar-meta-label">{t('nftoken_minter')}</span>
                <span className="sidebar-meta-value"><Account account={info.nftMinter} /></span>
              </div>
            )}
            {info.ticketCount > 0 && (
              <div className="sidebar-meta-row">
                <span className="sidebar-meta-label">{t('ticket_count')}</span>
                <span className="sidebar-meta-value">{localizeNumber(info.ticketCount, language)}</span>
              </div>
            )}
            {info.flags.length > 0 && (
              <div className="sidebar-flags">
                {info.flags.map((flag) => (
                  <span className="sidebar-flag" key={flag}>{flag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {Object.keys(displayBalances).length > 1 && (
        <div className="sidebar-tokens dashboard-panel">
          <h3 className="dashboard-panel-title">Token Balances</h3>
          <div className="sidebar-tokens-list">
            {Object.entries(displayBalances).map(([currency, amount]) => (
              <button
                type="button"
                key={currency}
                className={`sidebar-token-row ${currencySelected === currency ? 'active' : ''}`}
                onClick={() => onSetCurrencySelected(currency)}
              >
                <span className="sidebar-token-currency">{currency}</span>
                <span className="sidebar-token-amount">
                  {localizeNumber(amount as number, language, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {escrows && (
        <div className="sidebar-card dashboard-panel">
          <h3 className="dashboard-panel-title">{t('escrows')}</h3>
          <div className="sidebar-meta-list">
            <div className="sidebar-meta-row">
              <span className="sidebar-meta-label">{t('inbound_total')}</span>
              <span className="sidebar-meta-value">
                {localizeNumber(escrows.totalIn, language, CURRENCY_OPTIONS)}
              </span>
            </div>
            <div className="sidebar-meta-row">
              <span className="sidebar-meta-label">{t('outbound_total')}</span>
              <span className="sidebar-meta-value">
                {localizeNumber(escrows.totalOut, language, CURRENCY_OPTIONS)}
              </span>
            </div>
          </div>
        </div>
      )}

      {paychannels && (
        <div className="sidebar-card dashboard-panel">
          <h3 className="dashboard-panel-title">{t('payment_channels')}</h3>
          <div className="sidebar-meta-list">
            <div className="sidebar-meta-row">
              <span className="sidebar-meta-label">Available</span>
              <span className="sidebar-meta-value">
                {localizeNumber(paychannels.total_available, language, CURRENCY_OPTIONS)}
              </span>
            </div>
            <div className="sidebar-meta-row">
              <span className="sidebar-meta-label">{t('channels')}</span>
              <span className="sidebar-meta-value">
                {localizeNumber(paychannels.channels.length, language)}
              </span>
            </div>
          </div>
        </div>
      )}

      {signerList && (
        <div className="sidebar-card dashboard-panel">
          <h3 className="dashboard-panel-title">{t('signers')}</h3>
          <div className="sidebar-meta-list">
            {signerList.signers.map((d) => (
              <div className="sidebar-meta-row" key={d.account}>
                <span className="sidebar-meta-value">
                  <Account account={d.account} link={false} />
                </span>
                <span className="sidebar-meta-label">w: {d.weight}</span>
              </div>
            ))}
            <div className="sidebar-meta-row">
              <span className="sidebar-meta-label">
                <Trans i18nKey="min_signer_quorum" values={{ quorum: signerList.quorum }} />
              </span>
            </div>
          </div>
        </div>
      )}

      {xAddress && (
        <div className="sidebar-card dashboard-panel">
          <h3 className="dashboard-panel-title">X-Address Details</h3>
          <div className="sidebar-meta-list">
            <div className="sidebar-meta-row">
              <span className="sidebar-meta-label">Classic Address</span>
              <span className="sidebar-meta-value">
                <Account account={xAddress.classicAddress} />
              </span>
            </div>
            <div className="sidebar-meta-row">
              <span className="sidebar-meta-label">Tag</span>
              <span className="sidebar-meta-value">
                {xAddress.tag === false ? 'false' : String(xAddress.tag)}
              </span>
            </div>
            <div className="sidebar-meta-row">
              <span className="sidebar-meta-label">Network</span>
              <span className="sidebar-meta-value">
                {xAddress.test ? 'Testnet' : 'Mainnet'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
