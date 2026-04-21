import { FC, useState } from 'react'
import { MetricCard } from '../shared/components/MetricCard/MetricCard'
import {
  HealthSignal,
  ScoringContext,
  ScoringHealth,
  ScoringRoundMeta,
  formatRelativeTime,
} from '../Network/scoringUtils'

interface ScoringBannerProps {
  context: ScoringContext
  latestAttempt: ScoringRoundMeta | null
  health: ScoringHealth | null
}

const formatCountdown = (
  completedAt: string | null,
  cadenceHours: number,
): string => {
  if (!completedAt) return 'unknown'
  const completedMs = Date.parse(completedAt)
  if (Number.isNaN(completedMs)) return 'unknown'
  const nextMs = completedMs + cadenceHours * 60 * 60 * 1000
  const remainingMs = nextMs - Date.now()
  if (remainingMs <= 0) return 'due now'

  const totalSeconds = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const toneFor = (signal: HealthSignal | undefined): string => {
  if (!signal) return 'neutral'
  return signal.healthy ? 'green' : 'red'
}

const HealthDot: FC<{ signal: HealthSignal | undefined; label: string }> = ({
  signal,
  label,
}) => {
  const tone = toneFor(signal)
  const tooltip = signal ? `${label}: ${signal.detail}` : `${label}: unknown`
  return (
    <span
      className={`unl-scoring-health-dot unl-scoring-health-${tone}`}
      title={tooltip}
      aria-label={tooltip}
    />
  )
}

const HealthStrip: FC<{ health: ScoringHealth | null }> = ({ health }) => (
  <div className="unl-scoring-health-strip">
    <HealthDot signal={health?.scheduler} label="Scheduler" />
    <HealthDot signal={health?.llm_endpoint} label="LLM endpoint" />
    <HealthDot signal={health?.publisher_wallet} label="Publisher wallet" />
  </div>
)

export const ScoringBanner: FC<ScoringBannerProps> = ({
  context,
  latestAttempt,
  health,
}) => {
  const { round, config } = context
  const status = latestAttempt?.status ?? round.status

  if (
    latestAttempt &&
    status === 'FAILED' &&
    latestAttempt.round_number > round.round_number
  ) {
    return (
      <FailedBanner
        failedRound={latestAttempt}
        lastSuccessfulRoundNumber={round.round_number}
        lastCompletedAt={round.completed_at}
        health={health}
      />
    )
  }

  if (
    latestAttempt &&
    latestAttempt.status !== 'COMPLETE' &&
    latestAttempt.status !== 'FAILED' &&
    latestAttempt.round_number > round.round_number
  ) {
    return <InProgressBanner runningRound={latestAttempt} health={health} />
  }

  return (
    <IdleBanner
      roundNumber={round.round_number}
      completedAt={round.completed_at}
      cadenceHours={config.cadence_hours}
      health={health}
    />
  )
}

const IdleBanner: FC<{
  roundNumber: number
  completedAt: string | null
  cadenceHours: number
  health: ScoringHealth | null
}> = ({ roundNumber, completedAt, cadenceHours, health }) => {
  const countdown = formatCountdown(completedAt, cadenceHours)

  return (
    <div className="network-stats">
      <MetricCard label="Last round" value={`#${roundNumber}`} />
      <MetricCard label="Next round in" value={countdown} />
      <MetricCard label="Health" value={<HealthStrip health={health} />} />
    </div>
  )
}

const InProgressBanner: FC<{
  runningRound: ScoringRoundMeta
  health: ScoringHealth | null
}> = ({ runningRound, health }) => (
  <div className="unl-scoring-banner unl-scoring-banner-running dashboard-panel">
    <div className="unl-scoring-banner-row">
      <div className="unl-scoring-banner-col unl-scoring-banner-col-main">
        <span className="unl-scoring-banner-running-label">
          Round #{runningRound.round_number} running
        </span>
        <span className="unl-scoring-banner-sub">
          {runningRound.completed_at
            ? `started ${formatRelativeTime(runningRound.completed_at)}`
            : 'in progress'}
        </span>
      </div>
      <div className="unl-scoring-banner-col unl-scoring-banner-col-health">
        <span className="unl-scoring-banner-label">Health</span>
        <HealthStrip health={health} />
      </div>
    </div>
  </div>
)

const FailedBanner: FC<{
  failedRound: ScoringRoundMeta
  lastSuccessfulRoundNumber: number
  lastCompletedAt: string | null
  health: ScoringHealth | null
}> = ({ failedRound, lastSuccessfulRoundNumber, lastCompletedAt, health }) => {
  const [expanded, setExpanded] = useState(false)
  const errorMsg = (failedRound as any).error_message as string | undefined
  const shortError = errorMsg && errorMsg.length > 120
  const displayError =
    shortError && !expanded ? `${errorMsg.slice(0, 120)}…` : errorMsg

  return (
    <div className="unl-scoring-banner unl-scoring-banner-failed dashboard-panel">
      <div className="unl-scoring-banner-failed-header">
        <span className="unl-scoring-banner-failed-title">
          Round #{failedRound.round_number} failed at stage{' '}
          <code>{failedRound.status}</code>
        </span>
        <a
          className="unl-scoring-banner-failed-link"
          href={`/unl-scoring/rounds/${failedRound.round_number}`}
        >
          View round #{failedRound.round_number} details →
        </a>
      </div>
      {displayError && (
        <div className="unl-scoring-banner-failed-error">
          <span>Error: {displayError}</span>
          {shortError && (
            <button
              type="button"
              className="unl-scoring-banner-failed-toggle"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? '[ less ▲ ]' : '[ more ▼ ]'}
            </button>
          )}
        </div>
      )}
      <div className="unl-scoring-banner-failed-footer">
        <span className="unl-scoring-banner-sub">
          Showing data from last successful round #{lastSuccessfulRoundNumber}
          {lastCompletedAt && ` (${formatRelativeTime(lastCompletedAt)})`}
        </span>
        <HealthStrip health={health} />
      </div>
    </div>
  )
}
