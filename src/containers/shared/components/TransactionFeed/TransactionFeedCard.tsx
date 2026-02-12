import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { TransactionActionIcon } from '../TransactionActionIcon/TransactionActionIcon'
import { TxStatus } from '../TxStatus'
import { Account } from '../Account'
import { getCategory } from '../Transaction'
import { buildPath } from '../../routing'
import { TRANSACTION_ROUTE } from '../../../App/routes'
import { SUCCESSFUL_TRANSACTION } from '../../transactionUtils'
import { localizeDate } from '../../utils'

interface TransactionFeedCardProps {
  tx: any
  compact?: boolean
}

const formatTimeAgo = (timestamp: number | string | Date): string => {
  const now = Date.now()
  const time = typeof timestamp === 'number'
    ? (timestamp > 1e12 ? timestamp : timestamp * 1000)
    : new Date(timestamp).getTime()
  const diffMs = now - time

  if (diffMs < 0) return 'just now'
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`
  return localizeDate(new Date(time))
}

export const TransactionFeedCard: FC<TransactionFeedCardProps> = ({ tx, compact = false }) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const category = getCategory(tx.type)
  const isSuccess = tx.result === SUCCESSFUL_TRANSACTION

  const txPath = buildPath(TRANSACTION_ROUTE, { identifier: tx.hash })

  return (
    <div className={`tx-feed-card tx-category-border-${category} ${compact ? 'compact' : ''}`}>
      <div className="tx-feed-card-main">
        <div className="tx-feed-card-icon">
          <TransactionActionIcon type={tx.type} withBackground />
        </div>
        <div className="tx-feed-card-body">
          <div className="tx-feed-card-header">
            <Link to={txPath} className="tx-feed-card-type">
              {t('transaction_type_name', { context: tx.type, defaultValue: tx.type })}
            </Link>
            <span className="tx-feed-card-time">
              {tx.close_time ? formatTimeAgo(tx.close_time) : '—'}
            </span>
          </div>
          <div className="tx-feed-card-details">
            {tx.account && (
              <span className="tx-feed-card-account">
                <Account account={tx.account} />
              </span>
            )}
          </div>
        </div>
        <div className="tx-feed-card-status">
          <span className={`tx-feed-card-pill ${isSuccess ? 'success' : 'fail'}`}>
            {isSuccess ? t('success') : t('fail')}
          </span>
        </div>
        {!compact && tx.details && (
          <button
            type="button"
            className="tx-feed-card-expand"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown size={16} className={expanded ? 'rotated' : ''} />
          </button>
        )}
      </div>
      {expanded && tx.details && (
        <div className="tx-feed-card-expanded">
          {tx.details}
        </div>
      )}
    </div>
  )
}
