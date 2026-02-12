import { FC, useMemo } from 'react'
import { useStreams } from '../../shared/hooks/useStreams'
import { getCategory } from '../../shared/components/Transaction'
import { TransactionCategory } from '../../shared/components/Transaction/types'

const CATEGORY_LABELS: Record<string, string> = {
  [TransactionCategory.PAYMENT]: 'Payments',
  [TransactionCategory.DEX]: 'DEX',
  [TransactionCategory.ACCOUNT]: 'Account',
  [TransactionCategory.NFT]: 'NFT',
  [TransactionCategory.XCHAIN]: 'Cross-Chain',
  [TransactionCategory.MPT]: 'MPT',
  [TransactionCategory.PSEUDO]: 'Pseudo',
  [TransactionCategory.OTHER]: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  [TransactionCategory.PAYMENT]: 'var(--green-50)',
  [TransactionCategory.DEX]: 'var(--blue-50)',
  [TransactionCategory.ACCOUNT]: 'var(--magenta-50)',
  [TransactionCategory.NFT]: 'var(--blue-purple-50)',
  [TransactionCategory.XCHAIN]: 'var(--yellow-50)',
  [TransactionCategory.MPT]: 'var(--blue-50)',
  [TransactionCategory.PSEUDO]: 'var(--black-50)',
  [TransactionCategory.OTHER]: 'var(--black-50)',
}

interface CategoryStat {
  category: string
  label: string
  count: number
  percentage: number
  color: string
}

export const TransactionBreakdown: FC = () => {
  const { latestTransactions } = useStreams()

  const stats = useMemo((): CategoryStat[] => {
    if (latestTransactions.length === 0) return []

    const counts: Record<string, number> = {}
    latestTransactions.forEach((tx) => {
      const type = tx.type || tx.TransactionType || ''
      const category = getCategory(type)
      counts[category] = (counts[category] || 0) + 1
    })

    const total = latestTransactions.length
    return Object.entries(counts)
      .map(([category, count]) => ({
        category,
        label: CATEGORY_LABELS[category] || category,
        count,
        percentage: (count / total) * 100,
        color: CATEGORY_COLORS[category] || 'var(--black-50)',
      }))
      .sort((a, b) => b.count - a.count)
  }, [latestTransactions])

  const total = latestTransactions.length

  return (
    <div className="dashboard-panel">
      <h3 className="dashboard-panel-title">Transaction Types</h3>
      <div className="tx-breakdown">
        {total === 0 ? (
          <div className="dashboard-panel-empty">
            Waiting for transactions...
          </div>
        ) : (
          <>
            <div className="tx-breakdown-bar">
              {stats.map((s) => (
                <div
                  key={s.category}
                  className="tx-breakdown-bar-segment"
                  style={{
                    width: `${s.percentage}%`,
                    backgroundColor: s.color,
                  }}
                  title={`${s.label}: ${s.count}`}
                />
              ))}
            </div>
            <div className="tx-breakdown-list">
              {stats.map((s) => (
                <div key={s.category} className="tx-breakdown-row">
                  <span
                    className="tx-breakdown-dot"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="tx-breakdown-label">{s.label}</span>
                  <span className="tx-breakdown-count">{s.count}</span>
                  <span className="tx-breakdown-pct">
                    {s.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="tx-breakdown-total">
              {total} transactions sampled
            </div>
          </>
        )}
      </div>
    </div>
  )
}
