import { FC } from 'react'
import { ScoringInfo } from './scoringUtils'
import './css/scoringStatusBadge.scss'

const LABELS = {
  on_unl: 'on UNL',
  candidate: 'candidate',
  ineligible: 'ineligible',
  no_data: 'no data',
} as const

const GLYPHS = {
  on_unl: '●',
  candidate: '◐',
  ineligible: '○',
  no_data: '—',
} as const

interface ScoringStatusBadgeProps {
  info: ScoringInfo
  hideScore?: boolean
}

export const ScoringStatusBadge: FC<ScoringStatusBadgeProps> = ({
  info,
  hideScore = false,
}) => {
  const label = LABELS[info.status]
  const glyph = GLYPHS[info.status]
  const showScore =
    !hideScore && info.status !== 'no_data' && info.score != null
  const ariaLabel = showScore ? `Score ${info.score}, ${label}` : label
  const className = `scoring-status-badge scoring-status-${info.status.replace('_', '-')}`

  return (
    <span className={className} aria-label={ariaLabel}>
      <span className="scoring-status-glyph" aria-hidden="true">
        {glyph}
      </span>
      {showScore && <span className="scoring-status-score">{info.score}</span>}
      <span className="scoring-status-label">{label}</span>
    </span>
  )
}
