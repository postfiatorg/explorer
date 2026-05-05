import { useMemo } from 'react'
import { useQuery } from 'react-query'
import {
  ScoringConfig,
  ScoringContext,
  ScoringHealth,
  ScoringRoundMeta,
  ScoringUnlResponse,
  RoundScoringConfig,
  ScoresJson,
  SnapshotJson,
  UnlArtifact,
  fetchJsonOrNull,
  findLatestScoredRound,
  findPreviousScoredRound,
  isScoredRound,
} from './scoringUtils'

const ONE_HOUR_MS = 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const THIRTY_SECONDS_MS = 30 * 1000

export interface UseScoringContextResult {
  /** Full scoring context assembled from active UNL plus latest scored artifacts; null while any required fetch is pending or unavailable. */
  context: ScoringContext | null
  /** True while any required context query is still in its initial fetch. */
  contextLoading: boolean
  /** Active published UNL, which may come from an admin override round. */
  activeUnl: ScoringUnlResponse | null
  /** Round metadata for the active published UNL. */
  activeRound: ScoringRoundMeta | null
  /** Latest completed non-override round that has score-based surfaces. */
  latestScoredRound: ScoringRoundMeta | null
  /** Latest attempted round (may be running, failed, or complete). Used by callers that need to detect a failed-after-complete situation. */
  latestAttempt: ScoringRoundMeta | null
  /** Scores artifact for the previous scored round. Undefined means the prior artifact state is still unresolved. */
  priorScores: ScoresJson | null | undefined
  /** UNL artifact for the previous scored round. Undefined means the prior artifact state is still unresolved. */
  priorUnl: UnlArtifact | null | undefined
  /** Snapshot artifact for the latest scored round. Drives the drill-down enrichment block. */
  snapshot: SnapshotJson | null
  /** Pipeline-status health readout (scheduler, llm_endpoint, publisher_wallet) from the scoring service. Drives the Scoring page banner's health strip. */
  health: ScoringHealth | null
}

interface RoundsResponse {
  rounds: ScoringRoundMeta[]
}

export const useScoringContext = (): UseScoringContextResult => {
  const { data: scoringUnl, isLoading: loadingUnl } =
    useQuery<ScoringUnlResponse | null>(
      ['scoring-unl-current'],
      () => fetchJsonOrNull<ScoringUnlResponse>('/api/scoring/unl/current'),
      {
        staleTime: THIRTY_SECONDS_MS,
        refetchInterval: THIRTY_SECONDS_MS,
        retry: false,
      },
    )

  const { data: scoringConfig, isLoading: loadingConfig } =
    useQuery<ScoringConfig | null>(
      ['scoring-config'],
      () => fetchJsonOrNull<ScoringConfig>('/api/scoring/config'),
      {
        staleTime: ONE_HOUR_MS,
        refetchInterval: ONE_HOUR_MS,
        retry: false,
      },
    )

  const activeRoundNumber = scoringUnl?.round_number

  const { data: activeRound, isLoading: loadingActiveRound } =
    useQuery<ScoringRoundMeta | null>(
      ['scoring-round', activeRoundNumber],
      () =>
        fetchJsonOrNull<ScoringRoundMeta>(
          `/api/scoring/rounds/${activeRoundNumber}`,
        ),
      {
        enabled: typeof activeRoundNumber === 'number',
        staleTime: TWENTY_FOUR_HOURS_MS,
        retry: false,
      },
    )

  const { data: latestRoundsResp } = useQuery<RoundsResponse | null>(
    ['scoring-rounds-latest'],
    () => fetchJsonOrNull<RoundsResponse>('/api/scoring/rounds?limit=1'),
    {
      staleTime: THIRTY_SECONDS_MS,
      refetchInterval: THIRTY_SECONDS_MS,
      retry: false,
    },
  )

  const { data: scoredRoundsResp, isLoading: loadingScoredRounds } =
    useQuery<RoundsResponse | null>(
      ['scoring-rounds-scored-context'],
      () => fetchJsonOrNull<RoundsResponse>('/api/scoring/rounds?limit=100'),
      {
        enabled: typeof activeRoundNumber === 'number',
        staleTime: THIRTY_SECONDS_MS,
        refetchInterval: THIRTY_SECONDS_MS,
        retry: false,
      },
    )

  const latestScoredRound = useMemo<ScoringRoundMeta | null>(() => {
    const fromRecent = findLatestScoredRound(scoredRoundsResp?.rounds)
    if (fromRecent) return fromRecent
    return activeRound && isScoredRound(activeRound) ? activeRound : null
  }, [activeRound, scoredRoundsResp])

  const previousScoredRound = useMemo<ScoringRoundMeta | null>(
    () =>
      findPreviousScoredRound(
        scoredRoundsResp?.rounds,
        latestScoredRound?.round_number,
      ),
    [latestScoredRound, scoredRoundsResp],
  )

  const scoredRoundNumber = latestScoredRound?.round_number
  const previousScoredRoundNumber = previousScoredRound?.round_number

  const { data: scoringScores, isLoading: loadingScores } =
    useQuery<ScoresJson | null>(
      ['scoring-scores', scoredRoundNumber],
      () =>
        fetchJsonOrNull<ScoresJson>(
          `/api/scoring/rounds/${scoredRoundNumber}/scores.json`,
        ),
      {
        enabled: typeof scoredRoundNumber === 'number',
        staleTime: TWENTY_FOUR_HOURS_MS,
        retry: false,
      },
    )

  const { data: roundScoringConfig } = useQuery<RoundScoringConfig | null>(
    ['scoring-round-config', scoredRoundNumber],
    () =>
      fetchJsonOrNull<RoundScoringConfig>(
        `/api/scoring/rounds/${scoredRoundNumber}/scoring_config.json`,
      ),
    {
      enabled: typeof scoredRoundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: priorScores } = useQuery<ScoresJson | null>(
    ['scoring-scores', previousScoredRoundNumber],
    () =>
      fetchJsonOrNull<ScoresJson>(
        `/api/scoring/rounds/${previousScoredRoundNumber}/scores.json`,
      ),
    {
      enabled: typeof previousScoredRoundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: priorUnl } = useQuery<UnlArtifact | null>(
    ['scoring-unl', previousScoredRoundNumber],
    () =>
      fetchJsonOrNull<UnlArtifact>(
        `/api/scoring/rounds/${previousScoredRoundNumber}/unl.json`,
      ),
    {
      enabled: typeof previousScoredRoundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const priorScoresForContext = useMemo<ScoresJson | null | undefined>(() => {
    if (!scoredRoundsResp) return undefined
    if (typeof previousScoredRoundNumber !== 'number') return null
    return priorScores ?? undefined
  }, [previousScoredRoundNumber, priorScores, scoredRoundsResp])

  const priorUnlForContext = useMemo<UnlArtifact | null | undefined>(() => {
    if (!scoredRoundsResp) return undefined
    if (typeof previousScoredRoundNumber !== 'number') return null
    return priorUnl ?? undefined
  }, [previousScoredRoundNumber, priorUnl, scoredRoundsResp])

  const { data: scoringSnapshot } = useQuery<SnapshotJson | null>(
    ['scoring-snapshot', scoredRoundNumber],
    () =>
      fetchJsonOrNull<SnapshotJson>(
        `/api/scoring/rounds/${scoredRoundNumber}/snapshot.json`,
      ),
    {
      enabled: typeof scoredRoundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: health } = useQuery<ScoringHealth | null>(
    ['scoring-health'],
    () => fetchJsonOrNull<ScoringHealth>('/api/scoring/health'),
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

  // `config` is treated as a soft dependency. An isolated `/api/scoring/config`
  // failure leaves downstream surfaces (banner, methodology, ranked table)
  // rendering with `—` placeholders instead of the whole page collapsing.
  const context = useMemo<ScoringContext | null>(() => {
    if (!activeRound || !scoringUnl || !scoringScores || !latestScoredRound) {
      return null
    }
    return {
      activeRound,
      unl: scoringUnl,
      scores: scoringScores,
      round: latestScoredRound,
      config: scoringConfig ?? null,
      roundConfig: roundScoringConfig ?? null,
    }
  }, [
    activeRound,
    scoringUnl,
    scoringScores,
    latestScoredRound,
    scoringConfig,
    roundScoringConfig,
  ])

  const contextLoading =
    loadingUnl ||
    loadingConfig ||
    loadingActiveRound ||
    loadingScoredRounds ||
    loadingScores

  return {
    context,
    contextLoading,
    activeUnl: scoringUnl ?? null,
    activeRound: activeRound ?? null,
    latestScoredRound,
    latestAttempt,
    priorScores: priorScoresForContext,
    priorUnl: priorUnlForContext,
    snapshot: scoringSnapshot ?? null,
    health: health ?? null,
  }
}
