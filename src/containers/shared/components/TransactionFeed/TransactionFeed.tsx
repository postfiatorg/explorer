import { FC, Fragment, MouseEventHandler } from 'react'
import { useTranslation } from 'react-i18next'
import { TransactionFeedCard } from './TransactionFeedCard'
import { Loader } from '../Loader'
import { LoadMoreButton } from '../../LoadMoreButton'
import './transactionFeed.scss'

const normalizeTimestamp = (timestamp: number | string | Date): number => {
  if (typeof timestamp !== 'number') return new Date(timestamp).getTime()
  return timestamp > 1e12 ? timestamp : timestamp * 1000
}

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const getDateGroup = (tx: any): string | null => {
  const raw = tx.close_time || tx.date
  if (!raw) return null

  const txDate = new Date(normalizeTimestamp(raw))
  const now = new Date()
  const today = startOfDay(now)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  if (txDate >= today) return 'Today'
  if (txDate >= yesterday) return 'Yesterday'
  if (txDate >= weekAgo) return 'This Week'
  if (txDate >= monthStart) return 'This Month'

  return txDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export interface TransactionFeedProps {
  transactions?: any[]
  emptyMessage?: string
  loading?: boolean
  onLoadMore?: MouseEventHandler
  hasAdditionalResults?: boolean
  compact?: boolean
  accountId?: string
}

export const TransactionFeed: FC<TransactionFeedProps> = ({
  transactions = [],
  emptyMessage,
  loading = false,
  onLoadMore,
  hasAdditionalResults = false,
  compact = false,
  accountId,
}) => {
  const { t } = useTranslation()

  if (!loading && transactions.length === 0) {
    return (
      <div className="tx-feed-empty">
        {emptyMessage || t('no_transactions_message')}
      </div>
    )
  }

  return (
    <div className={`tx-feed ${compact ? 'tx-feed-compact' : ''}`}>
      <div className="tx-feed-list">
        {transactions.map((tx, index) => {
          if (compact) {
            return <TransactionFeedCard key={tx.hash} tx={tx} compact />
          }

          const group = getDateGroup(tx)
          const prevGroup =
            index > 0 ? getDateGroup(transactions[index - 1]) : null
          const showSeparator = group && group !== prevGroup

          return (
            <Fragment key={tx.hash}>
              {showSeparator && (
                <div className="tx-feed-date-separator">
                  <span>{group}</span>
                </div>
              )}
              <TransactionFeedCard tx={tx} accountId={accountId} />
            </Fragment>
          )
        })}
      </div>
      {loading && <Loader />}
      {!loading && hasAdditionalResults && onLoadMore && (
        <LoadMoreButton onClick={onLoadMore} />
      )}
    </div>
  )
}
