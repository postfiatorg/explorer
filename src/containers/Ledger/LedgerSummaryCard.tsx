import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyableAddress } from '../shared/components/CopyableAddress/CopyableAddress'
import { useLanguage } from '../shared/hooks'
import { localizeNumber, formatPrice, localizeDate } from '../shared/utils'

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
    <div className="ledger-summary dashboard-panel">
      <div className="ledger-summary-title">
        {t('ledger')} #{data.ledger_index}
      </div>
      <div className="ledger-summary-grid">
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">{t('total_transactions')}</span>
          <span className="ledger-summary-value">
            {localizeNumber(data.transactions.length, language)}
          </span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">{t('total_fees')}</span>
          <span className="ledger-summary-value">
            {formatPrice(data.total_fees, { lang: language, currency: 'PFT' })}
          </span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Close Time</span>
          <span className="ledger-summary-value">
            {localizeDate(date, language, DATE_OPTIONS)} {TIME_ZONE}
          </span>
        </div>
      </div>
      <div className="ledger-summary-hashes">
        <div className="ledger-summary-hash-row">
          <span className="ledger-summary-label">{t('hash')}</span>
          <CopyableAddress address={data.ledger_hash} truncate />
        </div>
        {data.parent_hash && (
          <div className="ledger-summary-hash-row">
            <span className="ledger-summary-label">Parent Hash</span>
            <CopyableAddress address={data.parent_hash} truncate />
          </div>
        )}
      </div>
    </div>
  )
}
