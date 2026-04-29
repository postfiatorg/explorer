import { useQuery } from 'react-query'
import {
  ScoresJson,
  ScoringRoundMeta,
  ScoringStatus,
  UnlArtifact,
  fetchJsonOrNull,
  isScoredRound,
} from '../Network/scoringUtils'

const THREE_MINUTES_MS = 3 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const HISTORY_LIMIT = 10

interface RecentRoundsResponse {
  rounds: ScoringRoundMeta[]
}

interface RoundArtifacts {
  scores: ScoresJson | null
  unl: UnlArtifact | null
}

export interface ScoreHistoryPoint {
  round_number: number
  score: number
  status: ScoringStatus
}

export interface UseScoreHistoryResult {
  points: ScoreHistoryPoint[]
  isLoading: boolean
}

const resolveStatus = (masterKey: string, unl: UnlArtifact): ScoringStatus => {
  if (unl.unl.includes(masterKey)) return 'on_unl'
  if (unl.alternates.includes(masterKey)) return 'candidate'
  return 'ineligible'
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

  const roundNumbers = (recentRounds?.rounds ?? [])
    .filter(isScoredRound)
    .map((r) => r.round_number)
  const batchKey = roundNumbers.join(',')

  const { data: artifactsByRound, isLoading: loadingArtifacts } = useQuery<
    Record<number, RoundArtifacts>
  >(
    ['scoring-history-artifacts', batchKey],
    async () => {
      const results = await Promise.all(
        roundNumbers.flatMap((n) => [
          fetchJsonOrNull<ScoresJson>(`/api/scoring/rounds/${n}/scores.json`),
          fetchJsonOrNull<UnlArtifact>(`/api/scoring/rounds/${n}/unl.json`),
        ]),
      )
      const byRound: Record<number, RoundArtifacts> = {}
      roundNumbers.forEach((n, i) => {
        byRound[n] = {
          scores: results[i * 2] as ScoresJson | null,
          unl: results[i * 2 + 1] as UnlArtifact | null,
        }
      })
      return byRound
    },
    {
      enabled: enabled && roundNumbers.length > 0,
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  if (!artifactsByRound) {
    return { points: [], isLoading: loadingRounds || loadingArtifacts }
  }

  // Reverse so the series reads oldest → newest for left-to-right sparkline rendering.
  const points: ScoreHistoryPoint[] = roundNumbers
    .slice()
    .reverse()
    .map((n) => {
      const round = artifactsByRound[n]
      if (!round?.scores || !round.unl) return null
      const entry = round.scores.validator_scores.find(
        (e) => e.master_key === masterKey,
      )
      if (!entry) return null
      return {
        round_number: n,
        score: entry.score,
        status: resolveStatus(masterKey, round.unl),
      }
    })
    .filter((p): p is ScoreHistoryPoint => p !== null)

  return { points, isLoading: false }
}
