import { FC } from 'react'
import Currency from '../shared/components/Currency'
import { Account } from '../shared/components/Account'
import DomainLink from '../shared/components/DomainLink'

interface TokenHeroProps {
  currency: string
  accountId: string
  domain?: string
  emailHash?: string
}

export const TokenHero: FC<TokenHeroProps> = ({
  currency,
  accountId,
  domain,
  emailHash,
}) => (
  <div className="token-hero dashboard-panel">
    <div className="token-hero-top">
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
    </div>
    <div className="token-hero-meta">
      <div className="token-hero-meta-row">
        <span className="token-hero-meta-label">Issuer</span>
        <Account account={accountId} />
      </div>
      {domain && (
        <div className="token-hero-meta-row">
          <span className="token-hero-meta-label">Domain</span>
          <DomainLink domain={domain} />
        </div>
      )}
    </div>
  </div>
)
