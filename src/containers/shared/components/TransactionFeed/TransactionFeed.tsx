import { FC, HTMLAttributes, MouseEventHandler } from 'react'
import { useTranslation } from 'react-i18next'
import { TransactionFeedCard } from './TransactionFeedCard'
import { Loader } from '../Loader'
import { LoadMoreButton } from '../../LoadMoreButton'
import './transactionFeed.scss'

export interface TransactionFeedProps extends HTMLAttributes<HTMLElement> {
  transactions?: any[]
  emptyMessage?: string
  loading?: boolean
  onLoadMore?: MouseEventHandler
  hasAdditionalResults?: boolean
  compact?: boolean
}

export const TransactionFeed: FC<TransactionFeedProps> = ({
  transactions = [],
  emptyMessage,
  loading = false,
  onLoadMore,
  hasAdditionalResults = false,
  compact = false,
  ...rest
}) => {
  const { t } = useTranslation()

  if (!loading && transactions.length === 0) {
    return (
      <div className="tx-feed-empty" {...rest}>
        {emptyMessage || t('no_transactions_message')}
      </div>
    )
  }

  return (
    <div className={`tx-feed ${compact ? 'tx-feed-compact' : ''}`} {...rest}>
      <div className="tx-feed-list">
        {transactions.map((tx) => (
          <TransactionFeedCard key={tx.hash} tx={tx} compact={compact} />
        ))}
      </div>
      {loading && <Loader />}
      {!loading && hasAdditionalResults && onLoadMore && <LoadMoreButton onClick={onLoadMore} />}
    </div>
  )
}
