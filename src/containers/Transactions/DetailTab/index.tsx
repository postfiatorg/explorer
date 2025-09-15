import { FC, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { TransactionMeta } from './Meta'
import { TransactionDescription } from './Description'
import { Account } from '../../shared/components/Account'
import { localizeDate, localizeNumber } from '../../shared/utils'
import {
  DATE_OPTIONS,
  CURRENCY_OPTIONS,
  SUCCESSFUL_TRANSACTION,
  XRP_BASE,
  buildFlags,
  buildMemos,
  buildMemosAsync,
  MemoInfo,
} from '../../shared/transactionUtils'
import { ParsedPointer } from '../../../utils/protobufParser'
import './detailTab.scss'
import { useLanguage } from '../../shared/hooks'
import { HookDetails } from './HookDetails'
import { RouteLink } from '../../shared/routing'
import { LEDGER_ROUTE } from '../../App/routes'

export const DetailTab: FC<{ data: any }> = ({ data }) => {
  const { t } = useTranslation()
  const language = useLanguage()

  const renderStatus = () => {
    const { TransactionResult } = data.meta
    const time = localizeDate(new Date(data.date), language, DATE_OPTIONS)
    let line1

    if (TransactionResult === SUCCESSFUL_TRANSACTION) {
      line1 = t('successful_transaction')
    } else {
      line1 = (
        <Trans i18nKey="fail_transaction" values={{ code: TransactionResult }}>
          <span className="tx-result fail" />
        </Trans>
      )
    }

    return (
      <div className="detail-section" data-testid="status">
        <div className="title">{t('status')}</div>
        {line1}
        {t('transaction_validated')}
        <RouteLink
          className="ledger"
          to={LEDGER_ROUTE}
          params={{ identifier: data.ledger_index }}
        >
          {data.ledger_index}
        </RouteLink>
        {t('on')}
        <span className="time">{`${time} ${DATE_OPTIONS.timeZone}`}</span>
      </div>
    )
  }

  const [parsedMemos, setParsedMemos] = useState<MemoInfo[] | null>(null)
  const [isLoadingMemos, setIsLoadingMemos] = useState(false)

  useEffect(() => {
    const loadMemos = async () => {
      setIsLoadingMemos(true)
      try {
        const memoInfos = await buildMemosAsync(data)
        setParsedMemos(memoInfos)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing memos:', error)
        // Fallback to simple memos
        const simpleMemos = buildMemos(data)
        setParsedMemos(simpleMemos.map((m) => ({ data: m })))
      } finally {
        setIsLoadingMemos(false)
      }
    }

    loadMemos()
  }, [data])

  const renderProtobufField = (label: string, value: any) => {
    if (value === undefined || value === null || value === '') return null
    return (
      <div style={{ marginLeft: '20px', marginBottom: '4px' }}>
        <strong>{label}:</strong> {value}
      </div>
    )
  }

  const renderParsedPointer = (pointer: ParsedPointer) => (
    <div
      style={{
        marginTop: '8px',
        borderLeft: '2px solid #e0e0e0',
        paddingLeft: '8px',
      }}
    >
      {renderProtobufField('Message Type', pointer.msg_type)}
      {renderProtobufField('CID', pointer.cid)}
      {renderProtobufField('Encryption', pointer.enc)}
      {renderProtobufField('Key ID', pointer.kid)}
      {renderProtobufField('Nonce', pointer.nonce)}
      {renderProtobufField('Bundle ID', pointer.bundle_id)}
      {renderProtobufField('Bundle Index', pointer.bundle_index)}
      {renderProtobufField('Pointer Version', pointer.ptr_version)}
      {renderProtobufField('Compression', pointer.comp)}
      {renderProtobufField('Schema', pointer.schema)}
      {renderProtobufField('Task ID', pointer.task_id)}
    </div>
  )

  const renderMemos = () => {
    if (!parsedMemos || parsedMemos.length === 0) return null

    return (
      <div className="detail-section">
        <div className="title">
          {t('memos')}
          <span>({t('decoded_hex')})</span>
        </div>
        {isLoadingMemos ? (
          <div>Loading memo data...</div>
        ) : (
          parsedMemos.map((memo) => (
            <div
              key={`${memo.type}-${memo.data}`}
              style={{ marginBottom: '12px' }}
            >
              {memo.type && (
                <div>
                  <strong>Type:</strong> {memo.type}
                  {memo.type === 'pf.ptr' && memo.isPfPtr && (
                    <span
                      style={{
                        marginLeft: '8px',
                        color: '#0066cc',
                        fontWeight: 'bold',
                      }}
                    >
                      (Protobuf Pointer Decoded)
                    </span>
                  )}
                </div>
              )}
              {memo.format && (
                <div>
                  <strong>Format:</strong> {memo.format}
                </div>
              )}
              {memo.data && (
                <div>
                  {memo.isPfPtr && typeof memo.data === 'object' ? (
                    <>
                      <strong>Data (Parsed Protobuf):</strong>
                      {renderParsedPointer(memo.data as ParsedPointer)}
                    </>
                  ) : (
                    <>
                      <strong>Data:</strong> {memo.data}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    )
  }

  const renderFee = () => {
    const numberOptions = { ...CURRENCY_OPTIONS, currency: 'PFT' }
    const totalCost = data.tx.Fee
      ? localizeNumber(
          Number.parseFloat(data.tx.Fee) / XRP_BASE,
          language,
          numberOptions,
        )
      : null
    return (
      totalCost && (
        <div className="detail-section">
          <div className="title transaction-cost">{t('transaction_cost')}</div>
          <div>
            {t('transaction_consumed_fee')}
            <b>
              <span> {totalCost}</span>
              <small>PFT</small>
            </b>
          </div>
        </div>
      )
    )
  }

  const renderFlags = () => {
    const flags = buildFlags(data)
    return flags.length ? (
      <div className="detail-section">
        <div className="title">{t('flags')}</div>
        <div className="flags">
          {flags.map((flag) => (
            <div key={flag}>{flag}</div>
          ))}
        </div>
      </div>
    ) : null
  }

  const renderSigners = () =>
    data.tx.Signers ? (
      <div className="detail-section">
        <div className="title">{t('signers')}</div>
        <ul className="signers">
          {data.tx.Signers.map((d) => (
            <li key={d.Signer.Account}>
              <Account account={d.Signer.Account} />
            </li>
          ))}
        </ul>
      </div>
    ) : null

  return (
    <div className="detail-body">
      {renderStatus()}
      <TransactionDescription data={data} />
      {renderSigners()}
      <HookDetails data={data} />
      {renderFlags()}
      {renderFee()}
      {renderMemos()}
      <TransactionMeta data={data} />
    </div>
  )
}
