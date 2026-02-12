import { FC } from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Coins } from 'lucide-react'
import { buildPath } from '../../shared/routing'
import { TOKEN_ROUTE } from '../../App/routes'
import Log from '../../shared/log'

const fetchTopTokens = () =>
  axios
    .get('/api/v1/tokens/search/a')
    .then((res) => res.data?.tokens?.slice(0, 8) || [])
    .catch((e) => {
      Log.error(e)
      return []
    })

export const TopTokens: FC = () => {
  const { data: tokens = [] } = useQuery('topTokens', fetchTopTokens, {
    staleTime: 60000,
    refetchInterval: 120000,
  })

  return (
    <div className="dashboard-panel">
      <h3 className="dashboard-panel-title">Tokens</h3>
      <div className="top-tokens-grid">
        {tokens.length === 0 && (
          <div className="dashboard-panel-empty">No token data available</div>
        )}
        {tokens.map((token: any) => {
          const tokenId = `${token.currency}.${token.issuer}`
          return (
            <Link
              key={tokenId}
              to={buildPath(TOKEN_ROUTE, { token: tokenId })}
              className="top-token-card"
            >
              <Coins size={16} className="top-token-icon" />
              <div className="top-token-info">
                <span className="top-token-code">{token.currency}</span>
                <span className="top-token-issuer">
                  {token.issuer?.slice(0, 8)}...{token.issuer?.slice(-4)}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
