import { FC } from 'react'
import { ScoringStatus, getStatusColor, getStatusLabel } from './scoringUtils'
import './css/scoreSparkline.scss'

export interface SparklinePoint {
  round_number: number
  score: number
  status: ScoringStatus
}

interface ScoreSparklineProps {
  points: SparklinePoint[]
  width?: number
  height?: number
  ariaLabel?: string
}

const PADDING = 3
const BAR_GAP = 2
const MIN_BAR_WIDTH = 2

export const ScoreSparkline: FC<ScoreSparklineProps> = ({
  points,
  width = 200,
  height = 60,
  ariaLabel,
}) => {
  if (points.length === 0) return null

  const innerWidth = width - PADDING * 2
  const innerHeight = height - PADDING * 2

  const totalGap = BAR_GAP * Math.max(0, points.length - 1)
  const barWidth = Math.max(
    MIN_BAR_WIDTH,
    (innerWidth - totalGap) / points.length,
  )

  const label = ariaLabel ?? `Score history across last ${points.length} rounds`

  return (
    <svg
      className="score-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={label}
      role="img"
    >
      {points.map((point, index) => {
        const clampedScore = Math.max(0, Math.min(100, point.score))
        const barHeight = (clampedScore / 100) * innerHeight
        const x = PADDING + index * (barWidth + BAR_GAP)
        const y = PADDING + innerHeight - barHeight
        const color = getStatusColor(point.status)
        const statusLabel = getStatusLabel(point.status)
        return (
          <rect
            key={point.round_number}
            className={`score-sparkline-bar score-sparkline-bar-${color}`}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={1}
          >
            <title>
              {`Round #${point.round_number} · ${point.score} · ${statusLabel}`}
            </title>
          </rect>
        )
      })}
    </svg>
  )
}
