import { useQuery } from 'react-query'
import { ScoringRoundMeta, fetchJsonOrNull } from '../Network/scoringUtils'

const THIRTY_SECONDS_MS = 30 * 1000

// Foundation-side convergence outcome taxonomy. The scoring service classifies
// every observed committer; the explorer renders the label and tone for each.
export type ConvergenceOutcome =
  | 'valid'
  | 'divergent'
  | 'awaiting_reveal'
  | 'missing_reveal'
  | 'late'
  | 'commitment_mismatch'
  | 'announcement_mismatch'
  | 'signature_invalid'

export interface ConvergenceParticipant {
  validator_master_key: string
  outcome: ConvergenceOutcome
  conflicting_commit?: boolean
  conflicting_reveal?: boolean
  // Comma-joined matched levels, e.g. "RAW,PARSED,SELECTED_UNL".
  comparison_levels_matched?: string | null
}

export interface ConvergenceSummary {
  committers: number
  outcomes?: Record<string, number>
  levels_matched?: Record<string, number>
  divergence_categories?: Record<string, number>
}

export type ConvergencePhase = 'live' | 'sealed' | 'not_tracked'

// 'unavailable' covers an old backend (404 → null), a network failure, and a
// real round the service is not tracking for convergence (override, not yet
// announced, pre-protocol). The panel renders nothing in all three cases.
export type ConvergenceStatus = 'loading' | 'unavailable' | 'ready'

export interface ConvergenceResult {
  status: ConvergenceStatus
  phase: ConvergencePhase | null
  finalized: boolean
  roundNumber: number | null
  participants: ConvergenceParticipant[]
  summary: ConvergenceSummary | null
  convergenceBundleCid: string | null
  anchorTxHash: string | null
  sealedAt: string | null
}

interface RawConvergenceReport {
  round_number?: number
  participants?: ConvergenceParticipant[]
  summary?: ConvergenceSummary
}

interface RawConvergenceView extends RawConvergenceReport {
  phase?: string
  finalized?: boolean
  convergence_bundle_cid?: string | null
  anchor_tx_hash?: string | null
  sealed_at?: string | null
  // A sealed round nests participants/summary under `report`; a live round
  // spreads them at the top level.
  report?: RawConvergenceReport
}

const EMPTY = {
  participants: [] as ConvergenceParticipant[],
  summary: null,
  convergenceBundleCid: null,
  anchorTxHash: null,
  sealedAt: null,
}

const unavailable = (roundNumber: number | null): ConvergenceResult => ({
  status: 'unavailable',
  phase: 'not_tracked',
  finalized: false,
  roundNumber,
  ...EMPTY,
})

// Collapse the convergence service's two response shapes — live tally inline,
// sealed report nested under `report` — into one stable model the view renders
// from, regardless of where the round sits in its lifecycle.
export const normalizeConvergenceView = (
  view: RawConvergenceView | null,
): ConvergenceResult => {
  if (!view) return unavailable(null)

  if (view.phase === 'sealed') {
    const report = view.report ?? {}
    return {
      status: 'ready',
      phase: 'sealed',
      finalized: true,
      roundNumber: view.round_number ?? report.round_number ?? null,
      participants: report.participants ?? [],
      summary: report.summary ?? null,
      convergenceBundleCid: view.convergence_bundle_cid ?? null,
      anchorTxHash: view.anchor_tx_hash ?? null,
      sealedAt: view.sealed_at ?? null,
    }
  }

  if (view.phase === 'live') {
    return {
      status: 'ready',
      phase: 'live',
      finalized: false,
      roundNumber: view.round_number ?? null,
      participants: view.participants ?? [],
      summary: view.summary ?? null,
      convergenceBundleCid: null,
      anchorTxHash: null,
      sealedAt: null,
    }
  }

  return unavailable(view.round_number ?? null)
}

// Fetches the foundation convergence view for a round through the explorer's
// /api/scoring proxy. A live round is polled until it seals; a sealed round is
// immutable and never re-fetched.
export const useConvergence = (
  round: ScoringRoundMeta | null,
): ConvergenceResult => {
  const roundNumber = round?.round_number

  const { data, isLoading } = useQuery<RawConvergenceView | null>(
    ['scoring-convergence', roundNumber],
    () =>
      fetchJsonOrNull<RawConvergenceView>(
        `/api/scoring/rounds/${roundNumber}/convergence`,
      ),
    {
      enabled: typeof roundNumber === 'number',
      staleTime: THIRTY_SECONDS_MS,
      retry: false,
      refetchInterval: (latest) =>
        latest && latest.finalized ? false : THIRTY_SECONDS_MS,
    },
  )

  if (isLoading) {
    return {
      status: 'loading',
      phase: null,
      finalized: false,
      roundNumber: roundNumber ?? null,
      ...EMPTY,
    }
  }

  return normalizeConvergenceView(data ?? null)
}
