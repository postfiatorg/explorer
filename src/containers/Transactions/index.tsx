import { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import NoMatch from '../NoMatch'
import { Loader } from '../shared/components/Loader'
import {
  NOT_FOUND,
  BAD_REQUEST,
  HASH256_REGEX,
  CTID_REGEX,
  localizeDate,
  localizeNumber,
} from '../shared/utils'
import { SimpleTab } from './SimpleTab'
import { DetailTab } from './DetailTab'
import { CollapsibleJsonPanel } from './CollapsibleJsonPanel'
import { CopyableAddress } from '../shared/components/CopyableAddress/CopyableAddress'
import { Account } from '../shared/components/Account'
import { Sequence } from '../shared/components/Sequence'
import './transaction.scss'
import { AnalyticsFields, useAnalytics } from '../shared/analytics'
import SocketContext from '../shared/SocketContext'
import { TxStatus } from '../shared/components/TxStatus'
import { getAction, getCategory } from '../shared/components/Transaction'
import { TransactionActionIcon } from '../shared/components/TransactionActionIcon/TransactionActionIcon'
import { useRouteParams } from '../shared/routing'
import { RouteLink } from '../shared/routing'
import { SUCCESSFUL_TRANSACTION, CURRENCY_OPTIONS, XRP_BASE } from '../shared/transactionUtils'
import { getTransaction } from '../../rippled'
import { TRANSACTION_ROUTE, LEDGER_ROUTE } from '../App/routes'
import { useLanguage } from '../shared/hooks'

const WRONG_NETWORK = 406

const TIME_ZONE = 'UTC'
const DATE_OPTIONS = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour12: true,
  timeZone: TIME_ZONE,
}

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
  const language = useLanguage()
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

  const [simpleTabEmpty, setSimpleTabEmpty] = useState(false)
  const handleSimpleTabEmpty = useCallback((empty: boolean) => {
    setSimpleTabEmpty(empty)
  }, [])

  function renderOverview(processed: any) {
    const numberOptions = { ...CURRENCY_OPTIONS, currency: 'PFT' }
    const time = localizeDate(new Date(processed.date), language, DATE_OPTIONS)
    const ledgerIndex = processed.ledger_index
    const fee = processed.tx.Fee
      ? localizeNumber(
          Number.parseFloat(processed.tx.Fee) / XRP_BASE,
          language,
          numberOptions,
        )
      : 0
    const account = processed.tx.Account
    const delegate = processed.tx.Delegate
    const sequence = processed.tx.Sequence
    const ticketSequence = processed.tx.TicketSequence
    const isHook = !!processed.tx.EmitDetails

    return (
      <div className="tx-overview-grid">
        <div className="tx-overview-item tx-overview-item-date">
          <span className="tx-overview-label">
            {t('formatted_date', { timeZone: TIME_ZONE })}
          </span>
          <span className="tx-overview-value">{time}</span>
        </div>
        <div className="tx-overview-item">
          <span className="tx-overview-label">{t('ledger_index')}</span>
          <span className="tx-overview-value">
            <RouteLink to={LEDGER_ROUTE} params={{ identifier: ledgerIndex }}>
              {ledgerIndex}
            </RouteLink>
          </span>
        </div>
        {account && (
          <div className="tx-overview-item tx-overview-item-account">
            <span className="tx-overview-label">{t('account')}</span>
            <span className="tx-overview-value">
              <Account account={account} />
            </span>
          </div>
        )}
        {delegate && (
          <div className="tx-overview-item tx-overview-item-account">
            <span className="tx-overview-label">{t('delegate')}</span>
            <span className="tx-overview-value">
              <Account account={delegate} />
            </span>
          </div>
        )}
        <div className="tx-overview-item">
          <span className="tx-overview-label">{t('sequence_number')}</span>
          <span className="tx-overview-value">
            <Sequence
              sequence={sequence}
              ticketSequence={ticketSequence}
              account={account}
              isHook={isHook}
            />
          </span>
        </div>
        <div className="tx-overview-item">
          <span className="tx-overview-label">{t('transaction_cost')}</span>
          <span className="tx-overview-value">{fee}</span>
        </div>
      </div>
    )
  }

  function renderTransaction() {
    if (!data) return undefined
    const { processed, raw } = data
    const type = processed.tx.TransactionType
    const category = getCategory(type)

    return (
      <>
        <div className={`tx-summary dashboard-panel tx-border-${category}`}>
          <div className="tx-summary-top">
            <TransactionActionIcon type={type} withBackground />
            <div className="tx-summary-type">{type}</div>
          </div>
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

        {renderOverview(processed)}

        <div
          className="dashboard-panel"
          style={simpleTabEmpty ? { display: 'none' } : undefined}
        >
          <h3 className="dashboard-panel-title">
            {t('transaction_details')}
          </h3>
          <SimpleTab data={data} onEmpty={handleSimpleTabEmpty} />
        </div>

        <div className="tx-detail-section dashboard-panel">
          <h3 className="dashboard-panel-title">
            {t('execution_details')}
          </h3>
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
