import { FC, PropsWithChildren, useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import NoMatch from '../NoMatch'
import { NOT_FOUND, BAD_REQUEST } from '../shared/utils'
import { useAnalytics } from '../shared/analytics'
import { ErrorMessages } from '../shared/Interfaces'
import { TOKEN_ROUTE } from '../App/routes'
import { useRouteParams } from '../shared/routing'
import { getToken } from '../../rippled'
import SocketContext from '../shared/SocketContext'
import { Loader } from '../shared/components/Loader'
import { TokenHero } from './TokenHero'
import { TokenStats } from './TokenStats'
import { TokenSettings } from './TokenSettings'
import { TokenTransactionTable } from './TokenTransactionTable'

import './styles.scss'

const ERROR_MESSAGES: ErrorMessages = {
  default: {
    title: 'generic_error',
    hints: ['not_your_fault'],
  },
  [NOT_FOUND]: {
    title: 'account_not_found',
    hints: ['check_account_id'],
  },
  [BAD_REQUEST]: {
    title: 'invalid_xrpl_address',
    hints: ['check_account_id'],
  },
}

const getErrorMessage = (error) =>
  ERROR_MESSAGES[error] || ERROR_MESSAGES.default

const Page: FC<PropsWithChildren<{ token: string; issuer: string }>> = ({
  token,
  issuer,
  children,
}) => {
  const shortIssuer = issuer.substring(0, 12)
  const shortToken = token.substring(0, 12)
  const title = `${(issuer ? shortIssuer : shortToken) || 'Token'}...`
  const description = token
    ? `View token ${token} on the PFT Ledger.`
    : `View token issued by ${shortIssuer}... on the PFT Ledger.`
  const path = token ? `/token/${token}` : undefined

  return (
    <div className="token-page">
      <SEOHelmet title={title} description={description} path={path} />
      {children}
    </div>
  )
}

export const Token = () => {
  const rippledSocket = useContext(SocketContext)
  const { trackScreenLoaded } = useAnalytics()
  const { token = '' } = useRouteParams(TOKEN_ROUTE)
  const [currency = '', accountId = ''] = token.split('.')
  const { t } = useTranslation()
  const {
    data: tokenData,
    error: tokenDataError,
    isLoading: isTokenDataLoading,
  } = useQuery({
    queryKey: ['token', currency, accountId],
    queryFn: () => getToken(currency, accountId, rippledSocket),
  })

  useEffect(() => {
    trackScreenLoaded({
      issuer: accountId,
      currency_code: currency,
    })

    return () => {
      window.scrollTo(0, 0)
    }
  }, [accountId, currency, trackScreenLoaded])

  if (tokenDataError) {
    const message = getErrorMessage(tokenDataError)
    return (
      <Page token={token} issuer={accountId}>
        <NoMatch title={message.title} hints={message.hints} />
      </Page>
    )
  }

  return (
    <Page token={token} issuer={accountId}>
      {isTokenDataLoading ? (
        <Loader />
      ) : (
        tokenData && (
          <>
            <TokenHero
              currency={currency}
              accountId={accountId}
              emailHash={tokenData.emailHash}
            />
            <TokenStats
              obligations={tokenData.obligations}
              rate={tokenData.rate}
            />
            <TokenSettings data={tokenData} />
          </>
        )
      )}
      {accountId && tokenData && (
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2 className="dashboard-panel-title">{t('token_transactions')}</h2>
          </div>
          <div className="token-feed-scroll">
            <TokenTransactionTable accountId={accountId} currency={currency} />
          </div>
        </div>
      )}
      {!accountId && (
        <div className="token-empty-message">
          <h2>Enter an account ID in the search box</h2>
        </div>
      )}
    </Page>
  )
}
