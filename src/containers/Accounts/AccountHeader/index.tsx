import { CopyableAddress } from '../../shared/components/CopyableAddress/CopyableAddress'
import { StatusBadge } from '../../shared/components/StatusBadge/StatusBadge'
import './styles.scss'

interface AccountHeaderProps {
  accountId: string
  hasBridge?: boolean
  deleted?: boolean
}

export const AccountHeader = ({
  accountId,
  hasBridge = false,
  deleted = false,
}: AccountHeaderProps) => (
  <div className="account-header dashboard-panel">
    <div className="account-header-inner">
      <div className="account-header-top">
        <span className="account-header-label">Account ID</span>
        {hasBridge && <StatusBadge status="verified" label="Door Account" />}
        {deleted && <StatusBadge status="disabled" label="Deleted" />}
      </div>
      <div className="account-header-address">
        <CopyableAddress address={accountId} />
      </div>
    </div>
  </div>
)
