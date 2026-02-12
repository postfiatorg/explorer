import { FC } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { TransactionFeed } from '../../shared/components/TransactionFeed/TransactionFeed'
import { useStreams } from '../../shared/hooks/useStreams'

export const LiveTransactionFeed: FC = () => {
  const { latestTransactions } = useStreams()

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">
        <h3 className="dashboard-panel-title">Live Transactions</h3>
        <Link to="/transactions" className="dashboard-panel-link">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="dashboard-feed-scroll">
        <TransactionFeed
          transactions={latestTransactions.slice(0, 15)}
          compact
          loading={latestTransactions.length === 0}
        />
      </div>
    </div>
  )
}
