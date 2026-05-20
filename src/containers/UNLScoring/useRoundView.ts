import { useMemo } from 'react'
import { useQuery } from 'react-query'
import {
  ScoresJson,
  RoundScoringConfig,
  ScoringRoundMeta,
  SnapshotJson,
  UnlArtifact,
  ValidatorIdMap,
  fetchJsonOrNull,
  fetchRoundScoringConfig,
  fetchRoundScores,
  fetchRoundSelectedUnl,
  fetchRoundSnapshot,
  fetchRoundValidatorIdMap,
  findPreviousScoredRound,
  isFailedRound,
  isInProgressRound,
  isOverrideRound,
} from '../Network/scoringUtils'

const THIRTY_SECONDS_MS = 30 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

interface RoundsResponse {
  rounds: ScoringRoundMeta[]
}

interface BaseRoundView {
  round: ScoringRoundMeta
  unl: UnlArtifact
  snapshot: SnapshotJson | null
  priorScores: ScoresJson | null | undefined
  priorUnl: UnlArtifact | null | undefined
  validatorIdMap: ValidatorIdMap | null
  roundConfig: RoundScoringConfig | null
}

export interface ScoredRoundView extends BaseRoundView {
  kind: 'scored'
  scores: ScoresJson
}

export interface OverrideRoundView extends BaseRoundView {
  kind: 'override'
  scores: null
}

export interface RunningRoundView {
  kind: 'running'
  round: ScoringRoundMeta
}

export interface FailedRoundView {
  kind: 'failed'
  round: ScoringRoundMeta
}

export type RoundView =
  | ScoredRoundView
  | OverrideRoundView
  | RunningRoundView
  | FailedRoundView

export interface UseRoundViewResult {
  view: RoundView | null
  roundMeta: ScoringRoundMeta | null
  isLoading: boolean
  roundNotFound: boolean
}

export const useRoundView = (
  roundNumber: number | undefined,
): UseRoundViewResult => {
  const enabled = typeof roundNumber === 'number'

  const { data: round, isLoading: loadingRound } =
    useQuery<ScoringRoundMeta | null>(
      ['scoring-round', roundNumber],
      () =>
        fetchJsonOrNull<ScoringRoundMeta>(`/api/scoring/rounds/${roundNumber}`),
      {
        enabled,
        staleTime: TWENTY_FOUR_HOURS_MS,
        refetchInterval: (returnedData) =>
          returnedData && isInProgressRound(returnedData)
            ? THIRTY_SECONDS_MS
            : false,
        retry: false,
      },
    )

  const isOverride = round ? isOverrideRound(round) : false
  const isRunning = round ? isInProgressRound(round) : false
  const isFailed = round ? isFailedRound(round) : false
  const shouldFetchRoundArtifacts =
    enabled && Boolean(round) && !isRunning && !isFailed
  const shouldFetchScoredArtifacts = shouldFetchRoundArtifacts && !isOverride

  const { data: scores, isLoading: loadingScores } =
    useQuery<ScoresJson | null>(
      ['scoring-scores', roundNumber],
      () => fetchRoundScores(roundNumber as number),
      {
        enabled: shouldFetchScoredArtifacts,
        staleTime: TWENTY_FOUR_HOURS_MS,
        retry: false,
      },
    )

  const { data: unl, isLoading: loadingUnl } = useQuery<UnlArtifact | null>(
    ['scoring-unl', roundNumber],
    () => fetchRoundSelectedUnl(roundNumber as number),
    {
      enabled: shouldFetchRoundArtifacts,
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: snapshot } = useQuery<SnapshotJson | null>(
    ['scoring-snapshot', roundNumber],
    () => fetchRoundSnapshot(roundNumber as number),
    {
      enabled: shouldFetchScoredArtifacts,
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: validatorIdMap } = useQuery<ValidatorIdMap | null>(
    ['scoring-validator-id-map', roundNumber],
    () => fetchRoundValidatorIdMap(roundNumber as number),
    {
      enabled: shouldFetchScoredArtifacts,
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: roundConfig } = useQuery<RoundScoringConfig | null>(
    ['scoring-round-config', roundNumber],
    () => fetchRoundScoringConfig(roundNumber as number),
    {
      enabled: shouldFetchScoredArtifacts,
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: roundsResp } = useQuery<RoundsResponse | null>(
    ['scoring-rounds-for-round-view'],
    () => fetchJsonOrNull<RoundsResponse>('/api/scoring/rounds?limit=100'),
    {
      enabled: shouldFetchScoredArtifacts,
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const previousScoredRound = useMemo<ScoringRoundMeta | null>(
    () => findPreviousScoredRound(roundsResp?.rounds, roundNumber),
    [roundNumber, roundsResp],
  )

  const previousScoredRoundNumber = previousScoredRound?.round_number

  const { data: priorScores } = useQuery<ScoresJson | null>(
    ['scoring-scores', previousScoredRoundNumber],
    () => fetchRoundScores(previousScoredRoundNumber as number),
    {
      enabled:
        shouldFetchScoredArtifacts &&
        typeof previousScoredRoundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: priorUnl } = useQuery<UnlArtifact | null>(
    ['scoring-unl', previousScoredRoundNumber],
    () => fetchRoundSelectedUnl(previousScoredRoundNumber as number),
    {
      enabled:
        shouldFetchScoredArtifacts &&
        typeof previousScoredRoundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const priorScoresForView = useMemo<ScoresJson | null | undefined>(() => {
    if (!shouldFetchScoredArtifacts) return null
    if (!roundsResp) return undefined
    if (typeof previousScoredRoundNumber !== 'number') return null
    return priorScores ?? undefined
  }, [
    priorScores,
    previousScoredRoundNumber,
    roundsResp,
    shouldFetchScoredArtifacts,
  ])

  const priorUnlForView = useMemo<UnlArtifact | null | undefined>(() => {
    if (!shouldFetchScoredArtifacts) return null
    if (!roundsResp) return undefined
    if (typeof previousScoredRoundNumber !== 'number') return null
    return priorUnl ?? undefined
  }, [
    previousScoredRoundNumber,
    priorUnl,
    roundsResp,
    shouldFetchScoredArtifacts,
  ])

  const view = useMemo<RoundView | null>(() => {
    if (!round) return null
    if (isFailedRound(round)) {
      return {
        kind: 'failed',
        round,
      }
    }
    if (isInProgressRound(round)) {
      return {
        kind: 'running',
        round,
      }
    }
    if (!unl) return null
    if (isOverrideRound(round)) {
      return {
        kind: 'override',
        round,
        scores: null,
        unl,
        snapshot: null,
        priorScores: null,
        priorUnl: null,
        validatorIdMap: null,
        roundConfig: null,
      }
    }
    if (!scores) return null
    return {
      kind: 'scored',
      round,
      scores,
      unl,
      snapshot: snapshot ?? null,
      priorScores: priorScoresForView,
      priorUnl: priorUnlForView,
      validatorIdMap: validatorIdMap ?? null,
      roundConfig: roundConfig ?? null,
    }
  }, [
    round,
    scores,
    unl,
    snapshot,
    priorScoresForView,
    priorUnlForView,
    validatorIdMap,
    roundConfig,
  ])

  const roundNotFound = enabled && !loadingRound && round === null

  return {
    view,
    roundMeta: round ?? null,
    isLoading:
      loadingRound ||
      (shouldFetchRoundArtifacts && loadingUnl) ||
      (shouldFetchScoredArtifacts && loadingScores),
    roundNotFound,
  }
}
