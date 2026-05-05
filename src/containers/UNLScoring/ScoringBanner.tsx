import { FC, useEffect, useState } from 'react'
import { MetricCard } from '../shared/components/MetricCard/MetricCard'
import {
  HealthSignal,
  ScoringContext,
  ScoringHealth,
  ScoringRoundMeta,
  formatCadence,
  formatRelativeTime,
  isInProgressRound,
  isMemoFailedPublishedRound,
} from '../Network/scoringUtils'

interface ScoringBannerProps {
  context: ScoringContext
  latestAttempt: ScoringRoundMeta | null
  health: ScoringHealth | null
}

type CountdownTone = 'neutral' | 'amber' | 'red'

interface CountdownDisplay {
  text: string
  tone: CountdownTone
}

const BANNER_TICK_MS = 30 * 1000
const OVERDUE_AMBER_RATIO = 0.1
const OVERDUE_RED_RATIO = 0.5

const useTicker = (intervalMs: number): number => {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return tick
}

const formatOverdue = (overdueMin: number): string => {
  if (overdueMin < 1) return 'due now'
  if (overdueMin < 60) return `due ${overdueMin}m ago`
  const overdueHr = Math.floor(overdueMin / 60)
  if (overdueHr < 24) {
    const remMin = overdueMin % 60
    return remMin === 0
      ? `due ${overdueHr}h ago`
      : `due ${overdueHr}h ${remMin}m ago`
  }
  const overdueDays = Math.floor(overdueHr / 24)
  const remHr = overdueHr % 24
  return remHr === 0
    ? `due ${overdueDays}d ago`
    : `due ${overdueDays}d ${remHr}h ago`
}

const formatCountdown = (
  completedAt: string | null,
  cadenceHours: number | null,
  now: number,
): CountdownDisplay => {
  if (!completedAt || cadenceHours == null) {
    return { text: '—', tone: 'neutral' }
  }
  const completedMs = Date.parse(completedAt)
  if (Number.isNaN(completedMs)) {
    return { text: '—', tone: 'neutral' }
  }

  const cadenceMs = cadenceHours * 60 * 60 * 1000
  const remainingMs = completedMs + cadenceMs - now

  if (remainingMs > 0) {
    // Ceil so the countdown and the floored "X ago" elapsed card always sum to the cadence without losing a sub-minute residual.
    const totalMinutes = Math.ceil(remainingMs / 60000)
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60

    let text: string
    if (days > 0) text = `${days}d ${hours}h`
    else if (hours > 0) text = `${hours}h ${minutes}m`
    else text = `${minutes}m`

    return { text, tone: 'neutral' }
  }

  const overdueMs = -remainingMs
  const text = formatOverdue(Math.floor(overdueMs / 60000))

  let tone: CountdownTone
  if (overdueMs < cadenceMs * OVERDUE_AMBER_RATIO) tone = 'neutral'
  else if (overdueMs < cadenceMs * OVERDUE_RED_RATIO) tone = 'amber'
  else tone = 'red'

  return { text, tone }
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
  const now = useTicker(BANNER_TICK_MS)
  const { round, config } = context
  const activeOverride = Boolean(
    context.activeRound.override_type &&
      context.activeRound.round_number !== round.round_number,
  )
  const memoWarningRound = [latestAttempt, context.activeRound, round].find(
    (candidate): candidate is ScoringRoundMeta =>
      Boolean(
        candidate &&
          isMemoFailedPublishedRound(candidate) &&
          candidate.round_number >= round.round_number,
      ),
  )

  if (
    latestAttempt &&
    latestAttempt.status === 'FAILED' &&
    latestAttempt.round_number > round.round_number
  ) {
    return (
      <FailedBanner
        failedRound={latestAttempt}
        lastSuccessfulRoundNumber={round.round_number}
        lastCompletedAt={round.completed_at}
        health={health}
        now={now}
      />
    )
  }

  if (
    latestAttempt &&
    isInProgressRound(latestAttempt) &&
    latestAttempt.round_number > round.round_number
  ) {
    return (
      <InProgressBanner
        runningRound={latestAttempt}
        health={health}
        now={now}
      />
    )
  }

  if (memoWarningRound) {
    return (
      <>
        <MemoFailedBanner round={memoWarningRound} />
        <IdleBanner
          label={activeOverride ? 'Last scored round' : 'Last round'}
          roundNumber={round.round_number}
          completedAt={round.completed_at}
          cadenceHours={config?.cadence_hours ?? null}
          health={health}
          now={now}
        />
      </>
    )
  }

  return (
    <IdleBanner
      label={activeOverride ? 'Last scored round' : 'Last round'}
      roundNumber={round.round_number}
      completedAt={round.completed_at}
      cadenceHours={config?.cadence_hours ?? null}
      health={health}
      now={now}
    />
  )
}

const MemoFailedBanner: FC<{ round: ScoringRoundMeta }> = ({ round }) => (
  <div className="unl-scoring-banner unl-scoring-banner-memo-warning dashboard-panel">
    <div className="unl-scoring-banner-memo-warning-header">
      <span className="unl-scoring-banner-memo-warning-title">
        Round #{round.round_number} VL published, memo failed
      </span>
      <a
        className="unl-scoring-banner-memo-warning-link"
        href={`/unl-scoring/rounds/${round.round_number}`}
      >
        View round #{round.round_number} details →
      </a>
    </div>
    <p className="unl-scoring-banner-memo-warning-copy">
      Validators can still load the published VL; the audit bundle is available,
      but no memo transaction was anchored for this round.
    </p>
    {round.error_message && (
      <p className="unl-scoring-banner-memo-warning-error">
        {round.error_message}
      </p>
    )}
  </div>
)

const IdleBanner: FC<{
  label: string
  roundNumber: number
  completedAt: string | null
  cadenceHours: number | null
  health: ScoringHealth | null
  now: number
}> = ({ label, roundNumber, completedAt, cadenceHours, health, now }) => {
  const countdown = formatCountdown(completedAt, cadenceHours, now)

  return (
    <div className="network-stats">
      <MetricCard
        label={label}
        value={`#${roundNumber}`}
        subtitle={completedAt ? formatRelativeTime(completedAt, now) : null}
      />
      <MetricCard
        label="Next round in"
        value={
          <span
            className={`banner-countdown banner-countdown-${countdown.tone}`}
          >
            {countdown.text}
          </span>
        }
        subtitle={cadenceHours != null ? formatCadence(cadenceHours) : '—'}
      />
      <MetricCard label="Health" value={<HealthStrip health={health} />} />
    </div>
  )
}

const InProgressBanner: FC<{
  runningRound: ScoringRoundMeta
  health: ScoringHealth | null
  now: number
}> = ({ runningRound, health, now }) => (
  <div className="unl-scoring-banner unl-scoring-banner-running dashboard-panel">
    <div className="unl-scoring-banner-row">
      <div className="unl-scoring-banner-col unl-scoring-banner-col-main">
        <span className="unl-scoring-banner-running-label">
          Round #{runningRound.round_number} running
        </span>
        <span className="unl-scoring-banner-sub">
          {runningRound.completed_at
            ? `started ${formatRelativeTime(runningRound.completed_at, now)}`
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
  now: number
}> = ({
  failedRound,
  lastSuccessfulRoundNumber,
  lastCompletedAt,
  health,
  now,
}) => {
  const [expanded, setExpanded] = useState(false)
  const errorMsg = failedRound.error_message
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
          {lastCompletedAt && ` (${formatRelativeTime(lastCompletedAt, now)})`}
        </span>
        <HealthStrip health={health} />
      </div>
    </div>
  )
}
