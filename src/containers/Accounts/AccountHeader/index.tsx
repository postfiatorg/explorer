import { CopyableAddress } from '../../shared/components/CopyableAddress/CopyableAddress'
import { StatusBadge } from '../../shared/components/StatusBadge/StatusBadge'
import DomainLink from '../../shared/components/DomainLink'
import './styles.scss'

interface AccountHeaderProps {
  accountId: string
  hasBridge?: boolean
  deleted?: boolean
  domain?: string
}

export const AccountHeader = ({
  accountId,
  hasBridge = false,
  deleted = false,
  domain,
}: AccountHeaderProps) => (
  <div className="account-header detail-summary dashboard-panel">
    <div className="detail-summary-label">Account</div>
    <div className="account-header-address">
      <CopyableAddress address={accountId} />
    </div>
    {domain && (
      <div className="account-header-domain">
        <DomainLink domain={domain} />
      </div>
    )}
    {(hasBridge || deleted) && (
      <div className="account-header-badges">
        {hasBridge && <StatusBadge status="verified" label="Door Account" />}
        {deleted && <StatusBadge status="disabled" label="Deleted" />}
      </div>
    )}
  </div>
)
