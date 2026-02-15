import { FC } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useStreams } from '../../shared/hooks/useStreams'
import { buildPath } from '../../shared/routing'
import { LEDGER_ROUTE } from '../../App/routes'
import { localizeDate } from '../../shared/utils'

export const RecentLedgers: FC = () => {
  const { ledgers } = useStreams()
  const recentLedgers = ledgers.slice(0, 8)

  const maxTxnCount = Math.max(...recentLedgers.map((l) => l.txn_count || 0), 1)

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">
        <h3 className="dashboard-panel-title">Recent Ledgers</h3>
        <Link to="/" className="dashboard-panel-link">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="recent-ledgers-list">
        {recentLedgers.length === 0 && (
          <div className="dashboard-panel-empty">
            Waiting for ledger data...
          </div>
        )}
        {recentLedgers.map((ledger) => {
          const txnCount = ledger.txn_count || 0
          const barWidth = maxTxnCount > 0 ? (txnCount / maxTxnCount) * 100 : 0

          return (
            <Link
              key={ledger.ledger_index}
              to={buildPath(LEDGER_ROUTE, { identifier: ledger.ledger_index })}
              className="recent-ledger-item"
            >
              <span className="recent-ledger-index">
                #{ledger.ledger_index?.toLocaleString()}
              </span>
              <span className="recent-ledger-bar-container">
                <span
                  className="recent-ledger-bar"
                  style={{ width: `${barWidth}%` }}
                />
                <span className="recent-ledger-txn-count">{txnCount} txn</span>
              </span>
              <span className="recent-ledger-time">
                {ledger.close_time
                  ? localizeDate(new Date(ledger.close_time))
                  : '—'}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
