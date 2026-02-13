import { FC } from 'react'
import { ArrowRight } from 'lucide-react'
import { Account } from '../shared/components/Account'
import { TransactionActionIcon } from '../shared/components/TransactionActionIcon/TransactionActionIcon'

interface TransactionFlowDiagramProps {
  type: string
  account: string
  destination?: string
  amount?: string
  currency?: string
}

const SINGLE_PARTY_TYPES = new Set([
  'AccountSet',
  'SetRegularKey',
  'SignerListSet',
  'AccountDelete',
  'DepositPreauth',
])

export const TransactionFlowDiagram: FC<TransactionFlowDiagramProps> = ({
  type,
  account,
  destination,
  amount,
  currency,
}) => {
  const isSingleParty = SINGLE_PARTY_TYPES.has(type) || !destination

  if (isSingleParty) {
    return (
      <div className="tx-flow">
        <div className="tx-flow-box">
          <div className="tx-flow-box-label">Account</div>
          <Account account={account} />
        </div>
        <div className="tx-flow-action">
          <TransactionActionIcon type={type} withBackground />
          <span className="tx-flow-action-type">{type}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="tx-flow">
      <div className="tx-flow-box">
        <div className="tx-flow-box-label">Sender</div>
        <Account account={account} />
      </div>
      <div className="tx-flow-action">
        <TransactionActionIcon type={type} withBackground />
        {amount && (
          <span className="tx-flow-action-amount">
            {amount} {currency || ''}
          </span>
        )}
        <ArrowRight size={18} className="tx-flow-arrow" />
      </div>
      <div className="tx-flow-box">
        <div className="tx-flow-box-label">Receiver</div>
        <Account account={destination} />
      </div>
    </div>
  )
}
