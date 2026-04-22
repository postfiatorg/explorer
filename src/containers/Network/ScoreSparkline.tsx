import { FC, useMemo } from 'react'
import { ScoreColor, getScoreColor } from './scoringUtils'
import './css/scoreSparkline.scss'

interface ScoreSparklineProps {
  scores: number[]
  currentScore: number
  width?: number
  height?: number
  ariaLabel?: string
}

const PADDING = 3

export const ScoreSparkline: FC<ScoreSparklineProps> = ({
  scores,
  currentScore,
  width = 200,
  height = 60,
  ariaLabel,
}) => {
  // Unique gradient id per mounted sparkline so multiple instances on the page
  // don't share a <defs> reference and collide.
  const gradientId = useMemo(
    () => `score-spark-${Math.random().toString(36).slice(2, 10)}`,
    [],
  )

  if (scores.length === 0) return null

  const color: ScoreColor = getScoreColor(currentScore)
  const innerWidth = width - PADDING * 2
  const innerHeight = height - PADDING * 2
  const baselineY = PADDING + innerHeight

  const pointAt = (score: number, index: number): [number, number] => {
    const clamped = Math.max(0, Math.min(100, score))
    const x =
      scores.length === 1
        ? width / 2
        : PADDING + (index / (scores.length - 1)) * innerWidth
    const y = PADDING + innerHeight - (clamped / 100) * innerHeight
    return [x, y]
  }

  const label = ariaLabel ?? `Score trend across last ${scores.length} rounds`

  if (scores.length === 1) {
    const [x, y] = pointAt(scores[0], 0)
    return (
      <svg
        className={`score-sparkline score-sparkline-${color}`}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={label}
        role="img"
      >
        <circle cx={x} cy={y} r={3} className="score-sparkline-dot" />
      </svg>
    )
  }

  const coords = scores.map((s, i) => pointAt(s, i))
  const linePath = coords.map(([x, y]) => `${x},${y}`).join(' ')
  const [firstX] = coords[0]
  const [lastX, lastY] = coords[coords.length - 1]
  const areaPath = [
    `M ${firstX},${baselineY}`,
    ...coords.map(([x, y], i) => (i === 0 ? `L ${x},${y}` : `L ${x},${y}`)),
    `L ${lastX},${baselineY}`,
    'Z',
  ].join(' ')

  return (
    <svg
      className={`score-sparkline score-sparkline-${color}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={label}
      role="img"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="score-sparkline-area-stop-top" />
          <stop offset="100%" className="score-sparkline-area-stop-bottom" />
        </linearGradient>
      </defs>
      <path
        className="score-sparkline-area"
        d={areaPath}
        fill={`url(#${gradientId})`}
      />
      <polyline className="score-sparkline-line" points={linePath} />
      <circle className="score-sparkline-current" cx={lastX} cy={lastY} r={3} />
    </svg>
  )
}
