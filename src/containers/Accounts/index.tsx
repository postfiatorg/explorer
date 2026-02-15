import { useContext, useEffect } from 'react'
import { useQuery } from 'react-query'
import { Trans, useTranslation } from 'react-i18next'
import { isValidClassicAddress, isValidXAddress } from 'ripple-address-codec'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { AccountHeader } from './AccountHeader'
import { AccountTransactionTable } from './AccountTransactionTable'
import { Tabs } from '../shared/components/Tabs'
import { AccountAssetTab } from './AccountAssetTab/AccountAssetTab'
import { Account } from '../shared/components/Account'
import Currency from '../shared/components/Currency'
import { useAnalytics } from '../shared/analytics'
import { buildPath, useRouteParams } from '../shared/routing'
import { ACCOUNT_ROUTE } from '../App/routes'
import { BAD_REQUEST, localizeNumber } from '../shared/utils'
import { useLanguage } from '../shared/hooks'
import { getAccountState } from '../../rippled'
import SocketContext from '../shared/SocketContext'
import { Loader } from '../shared/components/Loader'
import './styles.scss'

const CURRENCY_OPTIONS = {
  style: 'currency',
  currency: 'PFT',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
}

export const Accounts = () => {
  const { trackScreenLoaded, trackException } = useAnalytics()
  const { id: accountId = '', tab = 'transactions' } =
    useRouteParams(ACCOUNT_ROUTE)
  const currencySelected = 'PFT'
  const mainPath = buildPath(ACCOUNT_ROUTE, { id: accountId })
  const rippledSocket = useContext(SocketContext)
  const { t } = useTranslation()
  const language = useLanguage()

  const { data: account, isLoading } = useQuery(
    ['accountState', accountId],
    () => {
      if (!isValidClassicAddress(accountId) && !isValidXAddress(accountId)) {
        return Promise.reject(BAD_REQUEST)
      }

      return getAccountState(accountId, rippledSocket).catch(
        (transactionRequestError) => {
          const status = transactionRequestError.code
          trackException(
            `ledger ${accountId} --- ${JSON.stringify(transactionRequestError)}`,
          )
          return Promise.reject(status)
        },
      )
    },
  )

  useEffect(() => {
    trackScreenLoaded()
    return () => {
      window.scrollTo(0, 0)
    }
  }, [tab, trackScreenLoaded])

  const tabs = ['transactions', 'assets']

  const balances: Record<string, number> = account?.balances ?? {}
  const balanceKey = currencySelected === 'PFT' ? 'XRP' : currencySelected
  const balance = localizeNumber(balances[balanceKey] || 0.0, language, {
    style: 'currency',
    currency: currencySelected,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const reserve = account?.info
    ? localizeNumber(account.info.reserve || 0.0, language, CURRENCY_OPTIONS)
    : null
  const { info, escrows, paychannels, signerList, xAddress } = account ?? {}

  return (
    <div className="accounts-page">
      <SEOHelmet
        title={`${accountId.substring(0, 12)}...`}
        description={t('meta.account.description', {
          id: accountId.substring(0, 12),
        })}
        path={`/accounts/${accountId}`}
        breadcrumbs={[
          { name: t('ledgers'), path: '/' },
          {
            name: `${accountId.substring(0, 12)}...`,
            path: `/accounts/${accountId}`,
          },
        ]}
      />
      {accountId && (
        <>
          <AccountHeader
            accountId={accountId}
            hasBridge={account?.hasBridge}
            deleted={account?.deleted}
            domain={info?.domain}
          />

          {account && !account.deleted && (
            <div className="detail-overview-grid">
              <div className="detail-overview-item account-balance-card">
                <span className="detail-overview-label">
                  <Trans i18nKey="currency_balance">
                    <Currency currency={currencySelected} />
                  </Trans>
                </span>
                <span className="detail-overview-value">{balance}</span>
              </div>
              {reserve && (
                <div className="detail-overview-item">
                  <span className="detail-overview-label">Reserve Balance</span>
                  <span className="detail-overview-value">{reserve}</span>
                </div>
              )}
            </div>
          )}

          <Tabs tabs={tabs} selected={tab} path={mainPath} />
          {tab === 'transactions' && (
            <div className="accounts-feed-panel dashboard-panel">
              <div className="accounts-feed-scroll">
                <AccountTransactionTable
                  accountId={accountId}
                  currencySelected={currencySelected}
                  hasTokensColumn={false}
                />
              </div>
            </div>
          )}
          {tab === 'assets' && account && <AccountAssetTab account={account} />}

          {escrows && (
            <div className="account-optional-panel dashboard-panel">
              <h3 className="dashboard-panel-title">{t('escrows')}</h3>
              <div className="account-details-list">
                <div className="account-detail-row">
                  <span className="account-detail-label">
                    {t('inbound_total')}
                  </span>
                  <span className="account-detail-value">
                    {localizeNumber(
                      escrows.totalIn,
                      language,
                      CURRENCY_OPTIONS,
                    )}
                  </span>
                </div>
                <div className="account-detail-row">
                  <span className="account-detail-label">
                    {t('outbound_total')}
                  </span>
                  <span className="account-detail-value">
                    {localizeNumber(
                      escrows.totalOut,
                      language,
                      CURRENCY_OPTIONS,
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {paychannels && (
            <div className="account-optional-panel dashboard-panel">
              <h3 className="dashboard-panel-title">{t('payment_channels')}</h3>
              <div className="account-details-list">
                <div className="account-detail-row">
                  <span className="account-detail-label">Available</span>
                  <span className="account-detail-value">
                    {localizeNumber(
                      paychannels.total_available,
                      language,
                      CURRENCY_OPTIONS,
                    )}
                  </span>
                </div>
                <div className="account-detail-row">
                  <span className="account-detail-label">{t('channels')}</span>
                  <span className="account-detail-value">
                    {localizeNumber(paychannels.channels.length, language)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {signerList && (
            <div className="account-optional-panel dashboard-panel">
              <h3 className="dashboard-panel-title">{t('signers')}</h3>
              <div className="account-details-list">
                {signerList.signers.map((d) => (
                  <div className="account-detail-row" key={d.account}>
                    <span className="account-detail-value">
                      <Account account={d.account} link={false} />
                    </span>
                    <span className="account-detail-label">w: {d.weight}</span>
                  </div>
                ))}
                <div className="account-detail-row">
                  <span className="account-detail-label">
                    <Trans
                      i18nKey="min_signer_quorum"
                      values={{ quorum: signerList.quorum }}
                    />
                  </span>
                </div>
              </div>
            </div>
          )}

          {xAddress && (
            <div className="account-optional-panel dashboard-panel">
              <h3 className="dashboard-panel-title">X-Address Details</h3>
              <div className="account-details-list">
                <div className="account-detail-row">
                  <span className="account-detail-label">Classic Address</span>
                  <span className="account-detail-value">
                    <Account account={xAddress.classicAddress} />
                  </span>
                </div>
                <div className="account-detail-row">
                  <span className="account-detail-label">Tag</span>
                  <span className="account-detail-value">
                    {xAddress.tag === false ? 'false' : String(xAddress.tag)}
                  </span>
                </div>
                <div className="account-detail-row">
                  <span className="account-detail-label">Network</span>
                  <span className="account-detail-value">
                    {xAddress.test ? 'Testnet' : 'Mainnet'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {isLoading && <Loader />}
    </div>
  )
}
