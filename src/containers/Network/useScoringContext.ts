import axios from 'axios'
import { useMemo } from 'react'
import { useQuery } from 'react-query'
import {
  ScoringConfig,
  ScoringContext,
  ScoringRoundMeta,
  ScoringUnlResponse,
  ScoresJson,
} from './scoringUtils'

const FIVE_MINUTES_MS = 5 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const THIRTY_SECONDS_MS = 30 * 1000

const fetchJsonOrNull = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await axios.get<T>(url)
    return response.data
  } catch {
    return null
  }
}

export interface UseScoringContextResult {
  /** Full scoring context assembled from all four fetches; null while any fetch is still pending or if the scoring service is unreachable / hasn't completed a round yet on this network. */
  context: ScoringContext | null
  /** Latest attempted round (may be running, failed, or complete). Used by callers that need to detect a failed-after-complete situation. */
  latestAttempt: ScoringRoundMeta | null
}

export const useScoringContext = (): UseScoringContextResult => {
  const { data: scoringUnl } = useQuery<ScoringUnlResponse | null>(
    ['scoring-unl-current'],
    () => fetchJsonOrNull<ScoringUnlResponse>('/api/scoring/unl/current'),
    {
      staleTime: FIVE_MINUTES_MS,
      refetchInterval: FIVE_MINUTES_MS,
      retry: false,
    },
  )

  const { data: scoringConfig } = useQuery<ScoringConfig | null>(
    ['scoring-config'],
    () => fetchJsonOrNull<ScoringConfig>('/api/scoring/config'),
    {
      staleTime: ONE_HOUR_MS,
      refetchInterval: ONE_HOUR_MS,
      retry: false,
    },
  )

  const roundNumber = scoringUnl?.round_number

  const { data: scoringRound } = useQuery<ScoringRoundMeta | null>(
    ['scoring-round', roundNumber],
    () =>
      fetchJsonOrNull<ScoringRoundMeta>(`/api/scoring/rounds/${roundNumber}`),
    {
      enabled: typeof roundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: scoringScores } = useQuery<ScoresJson | null>(
    ['scoring-scores', roundNumber],
    () =>
      fetchJsonOrNull<ScoresJson>(
        `/api/scoring/rounds/${roundNumber}/scores.json`,
      ),
    {
      enabled: typeof roundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  interface LatestRoundsResponse {
    rounds: ScoringRoundMeta[]
  }

  const { data: latestRoundsResp } = useQuery<LatestRoundsResponse | null>(
    ['scoring-rounds-latest'],
    () => fetchJsonOrNull<LatestRoundsResponse>('/api/scoring/rounds?limit=1'),
    {
      staleTime: THIRTY_SECONDS_MS,
      refetchInterval: THIRTY_SECONDS_MS,
      retry: false,
    },
  )

  const latestAttempt = useMemo<ScoringRoundMeta | null>(() => {
    if (!latestRoundsResp?.rounds || latestRoundsResp.rounds.length === 0) {
      return null
    }
    return latestRoundsResp.rounds[0]
  }, [latestRoundsResp])

  const context = useMemo<ScoringContext | null>(() => {
    if (!scoringUnl || !scoringScores || !scoringRound || !scoringConfig) {
      return null
    }
    return {
      unl: scoringUnl,
      scores: scoringScores,
      round: scoringRound,
      config: scoringConfig,
    }
  }, [scoringUnl, scoringScores, scoringRound, scoringConfig])

  return { context, latestAttempt }
}
