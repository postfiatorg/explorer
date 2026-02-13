import { FC } from 'react'
import { Wallet, Shield, Scale, Hash } from 'lucide-react'
import { MetricCard } from '../shared/components/MetricCard/MetricCard'
import { useLanguage } from '../shared/hooks'
import { localizeNumber, formatLargeNumber } from '../shared/utils'
import { XRP_BASE } from '../shared/transactionUtils'

const CURRENCY_OPTIONS = {
  style: 'currency',
  currency: 'PFT',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
}

interface TokenStatsProps {
  balance: string
  reserve: number
  obligations?: string
  sequence: number
}

export const TokenStats: FC<TokenStatsProps> = ({
  balance,
  reserve,
  obligations,
  sequence,
}) => {
  const language = useLanguage()
  const currencyBalance = localizeNumber(
    parseInt(balance, 10) / XRP_BASE || 0.0,
    language,
    CURRENCY_OPTIONS,
  )
  const reserveBalance = localizeNumber(reserve || 0.0, language, CURRENCY_OPTIONS)
  const obligationsFormatted = formatLargeNumber(Number.parseFloat(obligations || '0'))
  const obligationsDisplay = `${obligationsFormatted.num}${obligationsFormatted.unit}`

  return (
    <div className="token-stats">
      <MetricCard label="Balance" value={currencyBalance} icon={Wallet} />
      <MetricCard label="Reserve" value={reserveBalance} icon={Shield} />
      <MetricCard label="Obligations" value={obligationsDisplay} icon={Scale} />
      <MetricCard label="Sequence" value={sequence} icon={Hash} />
    </div>
  )
}
