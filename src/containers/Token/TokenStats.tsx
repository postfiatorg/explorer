import { FC } from 'react'
import { MetricCard } from '../shared/components/MetricCard/MetricCard'
import { formatLargeNumber } from '../shared/utils'

interface TokenStatsProps {
  obligations?: string
  rate?: number
}

export const TokenStats: FC<TokenStatsProps> = ({
  obligations,
  rate,
}) => {
  const obligationsFormatted = formatLargeNumber(Number.parseFloat(obligations || '0'))
  const supplyDisplay = `${obligationsFormatted.num}${obligationsFormatted.unit}`
  const feeDisplay = rate != null ? `${rate * 100}%` : '0%'

  return (
    <div className="token-stats">
      <MetricCard label="Circulating Supply" value={supplyDisplay} />
      <MetricCard label="Transfer Fee" value={feeDisplay} />
    </div>
  )
}
