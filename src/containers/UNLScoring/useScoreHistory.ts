import axios from 'axios'
import { useQuery } from 'react-query'
import { ScoresJson, ScoringRoundMeta } from '../Network/scoringUtils'

const THREE_MINUTES_MS = 3 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const HISTORY_LIMIT = 10

interface RecentRoundsResponse {
  rounds: ScoringRoundMeta[]
}

const fetchJsonOrNull = async <T>(url: string): Promise<T | null> => {
  try {
    const resp = await axios.get<T>(url)
    return resp.data
  } catch {
    return null
  }
}

export interface ScoreHistoryPoint {
  round_number: number
  score: number | null
}

export interface UseScoreHistoryResult {
  points: ScoreHistoryPoint[]
  isLoading: boolean
}

export const useScoreHistory = (
  masterKey: string,
  enabled: boolean,
): UseScoreHistoryResult => {
  const { data: recentRounds, isLoading: loadingRounds } =
    useQuery<RecentRoundsResponse | null>(
      ['scoring-rounds-recent', HISTORY_LIMIT],
      () =>
        fetchJsonOrNull<RecentRoundsResponse>(
          `/api/scoring/rounds?limit=${HISTORY_LIMIT}`,
        ),
      {
        enabled,
        staleTime: THREE_MINUTES_MS,
        retry: false,
      },
    )

  const roundNumbers = (recentRounds?.rounds ?? []).map((r) => r.round_number)
  const batchKey = roundNumbers.join(',')

  const { data: scoresByRound, isLoading: loadingScores } = useQuery<
    Record<number, ScoresJson | null>
  >(
    ['scoring-history-batch', batchKey],
    async () => {
      const results = await Promise.all(
        roundNumbers.map((n) =>
          fetchJsonOrNull<ScoresJson>(`/api/scoring/rounds/${n}/scores.json`),
        ),
      )
      const byRound: Record<number, ScoresJson | null> = {}
      roundNumbers.forEach((n, i) => {
        byRound[n] = results[i]
      })
      return byRound
    },
    {
      enabled: enabled && roundNumbers.length > 0,
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  if (!scoresByRound) {
    return { points: [], isLoading: loadingRounds || loadingScores }
  }

  // Reverse so the series reads oldest → newest for left-to-right sparkline rendering.
  const points: ScoreHistoryPoint[] = roundNumbers
    .slice()
    .reverse()
    .map((n) => {
      const scores = scoresByRound[n]
      const entry = scores?.validator_scores.find(
        (e) => e.master_key === masterKey,
      )
      return { round_number: n, score: entry?.score ?? null }
    })

  return { points, isLoading: false }
}
