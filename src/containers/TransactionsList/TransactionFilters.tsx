import { FC, useState } from 'react'
import { Filter, X } from 'lucide-react'
import './transactionsList.scss'

interface TransactionFiltersProps {
  onFilterChange: (filters: TransactionFilterState) => void
}

export interface TransactionFilterState {
  type: string
  status: 'all' | 'success' | 'fail'
}

const TRANSACTION_TYPES = [
  'All Types',
  'Payment',
  'OfferCreate',
  'OfferCancel',
  'TrustSet',
  'AccountSet',
  'SetRegularKey',
  'SignerListSet',
  'EscrowCreate',
  'EscrowFinish',
  'EscrowCancel',
  'NFTokenMint',
  'NFTokenBurn',
  'NFTokenCreateOffer',
  'NFTokenAcceptOffer',
  'NFTokenCancelOffer',
]

export const TransactionFilters: FC<TransactionFiltersProps> = ({ onFilterChange }) => {
  const [type, setType] = useState('All Types')
  const [status, setStatus] = useState<'all' | 'success' | 'fail'>('all')

  const handleTypeChange = (newType: string) => {
    setType(newType)
    onFilterChange({ type: newType, status })
  }

  const handleStatusChange = (newStatus: 'all' | 'success' | 'fail') => {
    setStatus(newStatus)
    onFilterChange({ type, status: newStatus })
  }

  const hasActiveFilters = type !== 'All Types' || status !== 'all'

  const clearFilters = () => {
    setType('All Types')
    setStatus('all')
    onFilterChange({ type: 'All Types', status: 'all' })
  }

  return (
    <div className="tx-filters">
      <div className="tx-filters-left">
        <Filter size={16} />
        <select
          className="tx-filter-select"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="tx-filter-status-group">
          {(['all', 'success', 'fail'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`tx-filter-status-btn ${status === s ? 'active' : ''}`}
              onClick={() => handleStatusChange(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {hasActiveFilters && (
        <button type="button" className="tx-filter-clear" onClick={clearFilters}>
          <X size={14} /> Clear
        </button>
      )}
    </div>
  )
}
