import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyableAddress } from '../shared/components/CopyableAddress/CopyableAddress'
import { useLanguage } from '../shared/hooks'
import { localizeNumber, localizeDate } from '../shared/utils'

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

interface LedgerSummaryCardProps {
  data: any
}

export const LedgerSummaryCard: FC<LedgerSummaryCardProps> = ({ data }) => {
  const { t } = useTranslation()
  const language = useLanguage()
  const date = new Date(data.close_time)

  return (
    <>
      <div className="ledger-summary dashboard-panel">
        <div className="ledger-summary-label">{t('ledger')}</div>
        <div className="ledger-summary-title">
          #{localizeNumber(data.ledger_index, language)}
        </div>
        <div className="ledger-summary-hashes">
          <div className="ledger-summary-hash-row">
            <span className="ledger-summary-hash-label">{t('hash')}:</span>
            <CopyableAddress address={data.ledger_hash} truncate />
          </div>
          {data.parent_hash && (
            <div className="ledger-summary-hash-row">
              <span className="ledger-summary-hash-label">Parent Hash:</span>
              <CopyableAddress address={data.parent_hash} truncate />
            </div>
          )}
        </div>
      </div>

      <div className="ledger-overview-grid">
        <div className="ledger-overview-item">
          <span className="ledger-overview-label">
            {t('total_transactions')}
          </span>
          <span className="ledger-overview-value">
            {localizeNumber(data.transactions.length, language)}
          </span>
        </div>
        <div className="ledger-overview-item">
          <span className="ledger-overview-label">{t('total_fees')}</span>
          <span className="ledger-overview-value">
            {localizeNumber(data.total_fees, language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 8,
            })}{' '}
            PFT
          </span>
        </div>
        <div className="ledger-overview-item ledger-overview-item-date">
          <span className="ledger-overview-label">Close Time</span>
          <span className="ledger-overview-value">
            {localizeDate(date, language, DATE_OPTIONS)} {TIME_ZONE}
          </span>
        </div>
      </div>
    </>
  )
}
