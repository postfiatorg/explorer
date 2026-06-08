import { useQuery } from 'react-query'
import {
  ScoringConfig,
  ScoringRoundMeta,
  fetchJsonOrNull,
  findLatestScoredRound,
  isRoundFresh,
} from './scoringUtils'

const THIRTY_SECONDS_MS = 30 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

interface RoundsResponse {
  rounds: ScoringRoundMeta[]
}

export interface UseScoringFreshnessResult {
  isFresh: boolean
}

// Nav-facing hook that lights the UNL Scoring freshness dot while the latest
// scored round is recent. Freshness tracks the latest operationally published,
// non-override scored round — not merely the newest round attempt — so an
// in-progress, failed, or admin-override round does not suppress the dot while
// a real round is still inside the window. It shares the scoring page's React
// Query keys (`scoring-rounds-scored-context`, `scoring-config`) so it dedupes
// with that page; on other routes it polls the rounds list every 30s and config
// hourly.
export const useScoringFreshness = (): UseScoringFreshnessResult => {
  const { data: rounds } = useQuery<RoundsResponse | null>(
    ['scoring-rounds-scored-context'],
    () => fetchJsonOrNull<RoundsResponse>('/api/scoring/rounds?limit=100'),
    {
      staleTime: THIRTY_SECONDS_MS,
      refetchInterval: THIRTY_SECONDS_MS,
      retry: false,
    },
  )

  const { data: config } = useQuery<ScoringConfig | null>(
    ['scoring-config'],
    () => fetchJsonOrNull<ScoringConfig>('/api/scoring/config'),
    {
      staleTime: ONE_HOUR_MS,
      refetchInterval: ONE_HOUR_MS,
      retry: false,
    },
  )

  const latestScoredRound = findLatestScoredRound(rounds?.rounds)

  return {
    isFresh: isRoundFresh(latestScoredRound, config?.cadence_hours ?? null),
  }
}
