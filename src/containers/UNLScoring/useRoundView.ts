import { useMemo } from 'react'
import { useQuery } from 'react-query'
import {
  ScoresJson,
  ScoringRoundMeta,
  SnapshotJson,
  UnlArtifact,
  fetchJsonOrNull,
} from '../Network/scoringUtils'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export interface RoundView {
  round: ScoringRoundMeta
  scores: ScoresJson
  unl: UnlArtifact
  snapshot: SnapshotJson | null
  priorScores: ScoresJson | null
  priorUnl: UnlArtifact | null
}

export interface UseRoundViewResult {
  view: RoundView | null
  isLoading: boolean
  roundNotFound: boolean
}

export const useRoundView = (
  roundNumber: number | undefined,
): UseRoundViewResult => {
  const enabled = typeof roundNumber === 'number'
  const priorNumber =
    enabled && roundNumber !== undefined && roundNumber > 1
      ? roundNumber - 1
      : undefined

  const { data: round, isLoading: loadingRound } =
    useQuery<ScoringRoundMeta | null>(
      ['scoring-round', roundNumber],
      () =>
        fetchJsonOrNull<ScoringRoundMeta>(`/api/scoring/rounds/${roundNumber}`),
      {
        enabled,
        staleTime: TWENTY_FOUR_HOURS_MS,
        retry: false,
      },
    )

  const { data: scores, isLoading: loadingScores } =
    useQuery<ScoresJson | null>(
      ['scoring-scores', roundNumber],
      () =>
        fetchJsonOrNull<ScoresJson>(
          `/api/scoring/rounds/${roundNumber}/scores.json`,
        ),
      {
        enabled,
        staleTime: TWENTY_FOUR_HOURS_MS,
        retry: false,
      },
    )

  const { data: unl, isLoading: loadingUnl } = useQuery<UnlArtifact | null>(
    ['scoring-unl', roundNumber],
    () =>
      fetchJsonOrNull<UnlArtifact>(
        `/api/scoring/rounds/${roundNumber}/unl.json`,
      ),
    {
      enabled,
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: snapshot } = useQuery<SnapshotJson | null>(
    ['scoring-snapshot', roundNumber],
    () =>
      fetchJsonOrNull<SnapshotJson>(
        `/api/scoring/rounds/${roundNumber}/snapshot.json`,
      ),
    {
      enabled,
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: priorScores } = useQuery<ScoresJson | null>(
    ['scoring-scores', priorNumber],
    () =>
      fetchJsonOrNull<ScoresJson>(
        `/api/scoring/rounds/${priorNumber}/scores.json`,
      ),
    {
      enabled: typeof priorNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: priorUnl } = useQuery<UnlArtifact | null>(
    ['scoring-unl', priorNumber],
    () =>
      fetchJsonOrNull<UnlArtifact>(
        `/api/scoring/rounds/${priorNumber}/unl.json`,
      ),
    {
      enabled: typeof priorNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const view = useMemo<RoundView | null>(() => {
    if (!round || !scores || !unl) return null
    return {
      round,
      scores,
      unl,
      snapshot: snapshot ?? null,
      priorScores: priorScores ?? null,
      priorUnl: priorUnl ?? null,
    }
  }, [round, scores, unl, snapshot, priorScores, priorUnl])

  const roundNotFound = enabled && !loadingRound && round === null

  return {
    view,
    isLoading: loadingRound || loadingScores || loadingUnl,
    roundNotFound,
  }
}
