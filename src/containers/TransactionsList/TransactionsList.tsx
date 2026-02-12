import { FC, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { useAnalytics } from '../shared/analytics'
import { useStreams } from '../shared/hooks/useStreams'
import { TransactionFeed } from '../shared/components/TransactionFeed/TransactionFeed'
import { TransactionFilters, TransactionFilterState } from './TransactionFilters'
import { SUCCESSFUL_TRANSACTION } from '../shared/transactionUtils'
import './transactionsList.scss'

export const TransactionsList: FC = () => {
  const { trackScreenLoaded } = useAnalytics()
  const { t } = useTranslation()
  const { latestTransactions } = useStreams()

  const [filters, setFilters] = useState<TransactionFilterState>({
    type: 'All Types',
    status: 'all',
  })

  useEffect(() => {
    trackScreenLoaded()
  }, [trackScreenLoaded])

  const filteredTransactions = useMemo(() => {
    let result = latestTransactions

    if (filters.type !== 'All Types') {
      result = result.filter((tx) => tx.type === filters.type)
    }

    if (filters.status === 'success') {
      result = result.filter((tx) => tx.result === SUCCESSFUL_TRANSACTION)
    } else if (filters.status === 'fail') {
      result = result.filter((tx) => tx.result !== SUCCESSFUL_TRANSACTION)
    }

    return result
  }, [latestTransactions, filters])

  return (
    <div className="transactions-list-page">
      <SEOHelmet
        title="Transactions"
        description="View recent transactions on the PFT Ledger"
        path="/transactions"
      />
      <div className="transactions-list-header">
        <h1 className="transactions-list-title">Transactions</h1>
        <span className="transactions-list-count">
          {filteredTransactions.length} recent
        </span>
      </div>
      <TransactionFilters onFilterChange={setFilters} />
      <TransactionFeed
        transactions={filteredTransactions}
        loading={latestTransactions.length === 0}
        emptyMessage={
          filters.type !== 'All Types' || filters.status !== 'all'
            ? 'No transactions match the current filters'
            : undefined
        }
      />
    </div>
  )
}
