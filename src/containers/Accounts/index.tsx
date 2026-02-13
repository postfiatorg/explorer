import { useContext, useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { isValidClassicAddress, isValidXAddress } from 'ripple-address-codec'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { AccountHeader } from './AccountHeader'
import { AccountSidebar } from './AccountSidebar'
import { AccountTransactionTable } from './AccountTransactionTable'
import { Tabs } from '../shared/components/Tabs'
import { AccountAssetTab } from './AccountAssetTab/AccountAssetTab'
import { useAnalytics } from '../shared/analytics'
import { buildPath, useRouteParams } from '../shared/routing'
import { ACCOUNT_ROUTE } from '../App/routes'
import { BAD_REQUEST } from '../shared/utils'
import { getAccountState } from '../../rippled'
import SocketContext from '../shared/SocketContext'
import { Loader } from '../shared/components/Loader'
import './styles.scss'

export const Accounts = () => {
  const { trackScreenLoaded, trackException } = useAnalytics()
  const { id: accountId = '', tab = 'transactions' } =
    useRouteParams(ACCOUNT_ROUTE)
  const [currencySelected, setCurrencySelected] = useState('PFT')
  const mainPath = buildPath(ACCOUNT_ROUTE, { id: accountId })
  const rippledSocket = useContext(SocketContext)
  const { t } = useTranslation()

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
          />
          <div className="accounts-layout">
            {account && (
              <AccountSidebar
                account={account}
                currencySelected={currencySelected}
                onSetCurrencySelected={setCurrencySelected}
              />
            )}
            <div className="accounts-main">
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
            </div>
          </div>
        </>
      )}
      {isLoading && <Loader />}
    </div>
  )
}
