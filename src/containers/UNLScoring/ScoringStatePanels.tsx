import { FC } from 'react'
import { RefreshCw } from 'lucide-react'
import { Skeleton } from '../shared/components/Skeleton/Skeleton'
import { SCORING_DIMENSIONS } from '../Network/scoringUtils'

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
