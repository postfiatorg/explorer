import { FC } from 'react'
import Currency from '../shared/components/Currency'
import { Account } from '../shared/components/Account'

interface TokenHeroProps {
  currency: string
  accountId: string
  emailHash?: string
}

export const TokenHero: FC<TokenHeroProps> = ({
  currency,
  accountId,
  emailHash,
}) => (
  <div className="token-hero detail-summary dashboard-panel">
    <div className="detail-summary-label">Token</div>
    <div className="token-hero-identity">
      {emailHash && (
        <img
          alt={`${currency} logo`}
          className="token-hero-avatar"
          src={`https://www.gravatar.com/avatar/${emailHash.toLowerCase()}`}
        />
      )}
      <div className="token-hero-name">
        <Currency currency={currency} />
      </div>
    </div>
    <div className="token-hero-meta">
      <div className="detail-summary-hash-row">
        <span className="detail-summary-hash-label">Issuer:</span>
        <Account account={accountId} />
      </div>
    </div>
  </div>
)
