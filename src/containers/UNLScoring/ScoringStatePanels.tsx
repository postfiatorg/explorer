import { FC, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Skeleton } from '../shared/components/Skeleton/Skeleton'
import {
  SCORING_DIMENSIONS,
  ScoringRoundMeta,
  formatRelativeTime,
} from '../Network/scoringUtils'

const RUNNING_ROUND_TICK_MS = 1000

const useTicker = (intervalMs: number): number => {
  const [tick, setTick] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return tick
}

export const ScoringPageSkeleton: FC = () => (
  <div className="unl-scoring-skeleton">
    <div className="unl-scoring-skeleton-banner network-stats">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
    <div className="unl-scoring-skeleton-table dashboard-panel">
      <Skeleton variant="text" width="30%" />
      {Array.from({ length: 6 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="unl-scoring-skeleton-row" key={i}>
          <Skeleton variant="text" width="4%" />
          <Skeleton variant="text" width="28%" />
          <Skeleton variant="text" width="8%" />
          {SCORING_DIMENSIONS.map((dim) => (
            <Skeleton key={dim.key} variant="text" width="10%" />
          ))}
        </div>
      ))}
    </div>
  </div>
)

interface ScoringGenesisPanelProps {
  networkLabel: string
}

export const ScoringGenesisPanel: FC<ScoringGenesisPanelProps> = ({
  networkLabel,
}) => (
  <div className="unl-scoring-genesis dashboard-panel">
    <h2>No scoring rounds yet</h2>
    <p>
      No scoring rounds have completed on the {networkLabel} network yet.
      Validator scores, UNL composition, and the audit trail will appear here
      once the first round lands.
    </p>
  </div>
)

interface ScoringErrorPanelProps {
  onRetry: () => void
  isRetrying: boolean
}

export const ScoringErrorPanel: FC<ScoringErrorPanelProps> = ({
  onRetry,
  isRetrying,
}) => (
  <div className="unl-scoring-error dashboard-panel">
    <h2>Scoring service unreachable</h2>
    <p>
      The scoring service did not respond and no cached data is available on
      this explorer instance. Retry in a moment.
    </p>
    <button
      type="button"
      className="unl-scoring-retry-button"
      onClick={onRetry}
      disabled={isRetrying}
    >
      <RefreshCw
        className={`unl-scoring-retry-icon ${
          isRetrying ? 'unl-scoring-retry-spinning' : ''
        }`}
        size={14}
      />
      {isRetrying ? 'Retrying…' : 'Retry'}
    </button>
  </div>
)

export const ScoringStaleBanner: FC = () => (
  <div className="unl-scoring-stale-banner">
    Showing cached data — scoring service unreachable.
  </div>
)

export const ScoringRunningRoundPanel: FC<{ round: ScoringRoundMeta }> = ({
  round,
}) => {
  const now = useTicker(RUNNING_ROUND_TICK_MS)
  const startedAt = round.started_at ?? round.created_at ?? null

  return (
    <div className="unl-scoring-running-round dashboard-panel">
      <h2>Round #{round.round_number} is running</h2>
      <p>
        Scoring artifacts are not available yet. This round will be available
        after the scoring service completes it.
      </p>
      <div className="unl-scoring-running-round-meta">
        <span>{round.status}</span>
        {startedAt && <span>started {formatRelativeTime(startedAt, now)}</span>}
      </div>
    </div>
  )
}

export const ScoringFinalizingRoundPanel: FC<{ round: ScoringRoundMeta }> = ({
  round,
}) => (
  <div className="unl-scoring-finalizing-round dashboard-panel">
    <h2>Round #{round.round_number} completed</h2>
    <p>Loading scoring artifacts. Ranked validators will appear shortly.</p>
    <div className="unl-scoring-finalizing-round-meta">
      <span>{round.status}</span>
      {round.completed_at && (
        <span>completed {formatRelativeTime(round.completed_at)}</span>
      )}
    </div>
  </div>
)
