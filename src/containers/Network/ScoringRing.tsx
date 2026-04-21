import { FC } from 'react'
import { ScoreColor } from './scoringUtils'
import './css/scoringRing.scss'

interface ScoringRingProps {
  score: number
  color: ScoreColor
  size?: number
  ariaLabel?: string
}

export const ScoringRing: FC<ScoringRingProps> = ({
  score,
  color,
  size = 120,
  ariaLabel,
}) => {
  const strokeWidth = Math.max(6, Math.round(size * 0.08))
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <div className="scoring-ring-wrapper" style={{ width: size, height: size }}>
      <svg
        className="scoring-ring"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={ariaLabel ?? `Overall score ${score}`}
        role="img"
      >
        <circle
          className="scoring-ring-track"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className={`scoring-ring-fill scoring-ring-fill-${color}`}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="scoring-ring-center">
        <span className={`scoring-ring-value scoring-ring-value-${color}`}>
          {score}
        </span>
      </div>
    </div>
  )
}
