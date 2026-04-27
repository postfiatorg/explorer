import { useMemo } from 'react'
import { useQuery } from 'react-query'
import {
  ScoringConfig,
  ScoringContext,
  ScoringHealth,
  ScoringRoundMeta,
  ScoringUnlResponse,
  ScoresJson,
  SnapshotJson,
  UnlArtifact,
  fetchJsonOrNull,
} from './scoringUtils'

const FIVE_MINUTES_MS = 5 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const THIRTY_SECONDS_MS = 30 * 1000

export interface UseScoringContextResult {
  /** Full scoring context assembled from all four core fetches; null while any fetch is still pending or if the scoring service is unreachable / hasn't completed a round yet on this network. */
  context: ScoringContext | null
  /** Latest attempted round (may be running, failed, or complete). Used by callers that need to detect a failed-after-complete situation. */
  latestAttempt: ScoringRoundMeta | null
  /** Scores artifact for the round immediately prior to the current COMPLETE round. Used for Δ (delta vs previous round) computation on the Scoring page. */
  priorScores: ScoresJson | null
  /** UNL artifact for the round immediately prior to the current COMPLETE round. Used to detect `displaced` validators in Δ. */
  priorUnl: UnlArtifact | null
  /** Snapshot artifact for the current COMPLETE round — per-validator enrichment (domain, ASN, country, agreement buckets) that fed the LLM. Drives the drill-down enrichment block. */
  snapshot: SnapshotJson | null
  /** Pipeline-status health readout (scheduler, llm_endpoint, publisher_wallet) from the scoring service. Drives the Scoring page banner's health strip. */
  health: ScoringHealth | null
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
  const priorRoundNumber =
    typeof roundNumber === 'number' && roundNumber > 1
      ? roundNumber - 1
      : undefined

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

  const { data: priorScores } = useQuery<ScoresJson | null>(
    ['scoring-scores', priorRoundNumber],
    () =>
      fetchJsonOrNull<ScoresJson>(
        `/api/scoring/rounds/${priorRoundNumber}/scores.json`,
      ),
    {
      enabled: typeof priorRoundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: priorUnl } = useQuery<UnlArtifact | null>(
    ['scoring-unl', priorRoundNumber],
    () =>
      fetchJsonOrNull<UnlArtifact>(
        `/api/scoring/rounds/${priorRoundNumber}/unl.json`,
      ),
    {
      enabled: typeof priorRoundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: scoringSnapshot } = useQuery<SnapshotJson | null>(
    ['scoring-snapshot', roundNumber],
    () =>
      fetchJsonOrNull<SnapshotJson>(
        `/api/scoring/rounds/${roundNumber}/snapshot.json`,
      ),
    {
      enabled: typeof roundNumber === 'number',
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
    if (!scoringUnl || !scoringScores || !scoringRound) {
      return null
    }
    return {
      unl: scoringUnl,
      scores: scoringScores,
      round: scoringRound,
      config: scoringConfig ?? null,
    }
  }, [scoringUnl, scoringScores, scoringRound, scoringConfig])

  return {
    context,
    latestAttempt,
    priorScores: priorScores ?? null,
    priorUnl: priorUnl ?? null,
    snapshot: scoringSnapshot ?? null,
    health: health ?? null,
  }
}
