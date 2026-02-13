import { useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { useWindowSize } from 'usehooks-ts'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import NoMatch from '../NoMatch'
import { Loader } from '../shared/components/Loader'
import {
  NOT_FOUND,
  BAD_REQUEST,
  HASH256_REGEX,
  CTID_REGEX,
} from '../shared/utils'
import { SimpleTab } from './SimpleTab'
import { DetailTab } from './DetailTab'
import { TransactionFlowDiagram } from './TransactionFlowDiagram'
import { CollapsibleJsonPanel } from './CollapsibleJsonPanel'
import { CopyableAddress } from '../shared/components/CopyableAddress/CopyableAddress'
import './transaction.scss'
import { AnalyticsFields, useAnalytics } from '../shared/analytics'
import SocketContext from '../shared/SocketContext'
import { TxStatus } from '../shared/components/TxStatus'
import { getAction, getCategory } from '../shared/components/Transaction'
import { useRouteParams } from '../shared/routing'
import { SUCCESSFUL_TRANSACTION, XRP_BASE } from '../shared/transactionUtils'
import { getTransaction } from '../../rippled'
import { TRANSACTION_ROUTE } from '../App/routes'

const WRONG_NETWORK = 406

const ERROR_MESSAGES: Record<string, { title: string; hints: string[] }> = {}
ERROR_MESSAGES[NOT_FOUND] = {
  title: 'transaction_not_found',
  hints: ['server_ledgers_hint', 'check_transaction_hash'],
}
ERROR_MESSAGES[BAD_REQUEST] = {
  title: 'invalid_transaction_hash',
  hints: ['check_transaction_hash'],
}
ERROR_MESSAGES[WRONG_NETWORK] = {
  title: 'wrong_network',
  hints: ['check_transaction_hash'],
}
ERROR_MESSAGES.default = {
  title: 'generic_error',
  hints: ['not_your_fault'],
}

const getErrorMessage = (error) =>
  ERROR_MESSAGES[error] || ERROR_MESSAGES.default

export const Transaction = () => {
  const { identifier = '' } = useRouteParams(TRANSACTION_ROUTE)
  const { t } = useTranslation()
  const rippledSocket = useContext(SocketContext)
  const { trackException, trackScreenLoaded } = useAnalytics()
  const { isLoading, data, error, isError } = useQuery(
    ['transaction', identifier],
    () => {
      if (identifier === '') return undefined
      if (HASH256_REGEX.test(identifier) || CTID_REGEX.test(identifier)) {
        return getTransaction(identifier, rippledSocket).catch(
          (transactionRequestError) => {
            const status = transactionRequestError.code
            trackException(
              `transaction ${identifier} --- ${JSON.stringify(
                transactionRequestError.message,
              )}`,
            )
            return Promise.reject(status)
          },
        )
      }
      return Promise.reject(BAD_REQUEST)
    },
  )
  const { width } = useWindowSize()

  useEffect(() => {
    if (!data?.processed) return
    const type = data.processed.tx.TransactionType
    const status = data.processed.meta.TransactionResult
    const transactionProperties: AnalyticsFields = {
      transaction_action: getAction(type),
      transaction_category: getCategory(type),
      transaction_type: type,
    }
    if (status !== SUCCESSFUL_TRANSACTION) {
      transactionProperties.tec_code = status
    }
    trackScreenLoaded(transactionProperties)
  }, [identifier, data?.processed, trackScreenLoaded])

  function renderTransaction() {
    if (!data) return undefined
    const { processed, raw } = data
    const type = processed.tx.TransactionType
    const category = getCategory(type)
    const destination = processed.tx.Destination
    const deliverAmount = processed.tx.DeliverMax || processed.tx.Amount
    let amountStr: string | undefined
    let currencyStr: string | undefined

    if (deliverAmount && typeof deliverAmount === 'string') {
      amountStr = (Number(deliverAmount) / XRP_BASE).toFixed(6)
      currencyStr = 'PFT'
    } else if (deliverAmount && typeof deliverAmount === 'object') {
      amountStr = deliverAmount.value
      currencyStr = deliverAmount.currency
    }

    return (
      <>
        <div className={`tx-summary dashboard-panel tx-border-${category}`}>
          <div className="tx-summary-type">{type}</div>
          <TxStatus status={processed.meta.TransactionResult} />
          <div className="tx-summary-hash">
            <span className="tx-summary-hash-label">{t('hash')}:</span>
            <CopyableAddress address={processed.hash} truncate />
          </div>
          {processed.tx.ctid && (
            <div className="tx-summary-hash">
              <span className="tx-summary-hash-label">CTID:</span>
              <CopyableAddress address={processed.tx.ctid} truncate />
            </div>
          )}
        </div>

        <TransactionFlowDiagram
          type={type}
          account={processed.tx.Account}
          destination={destination}
          amount={amountStr}
          currency={currencyStr}
        />

        <div className="tx-content-columns">
          <div className="tx-content-left dashboard-panel">
            <SimpleTab data={data} width={width} />
          </div>
        </div>

        <div className="tx-detail-section dashboard-panel">
          <DetailTab data={processed} />
        </div>

        <CollapsibleJsonPanel data={raw} />
      </>
    )
  }

  let body
  if (isError) {
    const message = getErrorMessage(error)
    body = <NoMatch title={message.title} hints={message.hints} />
  } else if (data?.processed?.hash) {
    body = renderTransaction()
  } else if (!identifier) {
    body = (
      <NoMatch
        title="transaction_empty_title"
        hints={['transaction_empty_hint']}
        isError={false}
      />
    )
  }

  return (
    <div className="transaction">
      <SEOHelmet
        title={`${t('transaction_short')} ${identifier.substring(0, 8)}...`}
        description={t('meta.transaction.description', {
          id: identifier.substring(0, 12),
        })}
        path={`/transactions/${identifier}`}
        breadcrumbs={[
          { name: t('ledgers'), path: '/' },
          {
            name: `${t('transaction_short')} ${identifier.substring(0, 8)}...`,
            path: `/transactions/${identifier}`,
          },
        ]}
      />
      {isLoading && <Loader />}
      {body}
    </div>
  )
}
