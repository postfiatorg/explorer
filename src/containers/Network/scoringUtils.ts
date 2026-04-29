import axios from 'axios'

export const fetchJsonOrNull = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await axios.get<T>(url)
    return response.data
  } catch {
    return null
  }
}

export type ScoringStatus = 'on_unl' | 'candidate' | 'ineligible' | 'no_data'

export interface ScoringUnlResponse {
  round_number: number
  unl: string[]
  alternates: string[]
}

export interface ScoringRoundMeta {
  round_number: number
  status: string
  completed_at: string | null
  error_message?: string
  // Optional fields populated on completed rounds — used by the audit-trail
  // panel and by client-side stage derivation.
  created_at?: string | null
  started_at?: string | null
  snapshot_hash?: string | null
  scores_hash?: string | null
  vl_sequence?: number | null
  ipfs_cid?: string | null
  memo_tx_hash?: string | null
  github_pages_commit_url?: string | null
  override_type?: string | null
  override_reason?: string | null
}

export type FailedAtStage =
  | 'COLLECTING'
  | 'SCORED'
  | 'SELECTED_OR_VL_SIGNED'
  | 'IPFS_PUBLISHED'
  | 'VL_DISTRIBUTED'
  | 'ONCHAIN_PUBLISHED'

export const deriveFailedAtStage = (
  round: ScoringRoundMeta,
): FailedAtStage | null => {
  if (round.status !== 'FAILED') return null
  if (round.snapshot_hash == null) return 'COLLECTING'
  if (round.scores_hash == null) return 'SCORED'
  if (round.vl_sequence == null) return 'SELECTED_OR_VL_SIGNED'
  if (round.ipfs_cid == null) return 'IPFS_PUBLISHED'
  if (round.github_pages_commit_url == null) return 'VL_DISTRIBUTED'
  if (round.memo_tx_hash == null) return 'ONCHAIN_PUBLISHED'
  return null
}

// Non-terminal pipeline stages — rounds in any of these states are in-flight.
export const IN_PROGRESS_STATUSES = new Set([
  'COLLECTING',
  'SCORED',
  'SELECTED',
  'VL_SIGNED',
  'IPFS_PUBLISHED',
  'VL_DISTRIBUTED',
])

export type RoundStateKind =
  | 'complete'
  | 'failed'
  | 'running'
  | 'dry_run_complete'

export const classifyRoundState = (status: string): RoundStateKind => {
  if (status === 'COMPLETE') return 'complete'
  if (status === 'FAILED') return 'failed'
  if (status === 'DRY_RUN_COMPLETE') return 'dry_run_complete'
  return 'running'
}

export interface ValidatorScoreEntry {
  master_key: string
  score: number
  consensus: number
  reliability: number
  software: number
  diversity: number
  identity: number
  reasoning: string
}

export interface ScoresJson {
  network_summary?: string
  validator_scores: ValidatorScoreEntry[]
}

export interface ScoringConfig {
  cadence_hours: number
  unl_score_cutoff: number
  unl_max_size: number
  unl_min_score_gap: number
}

export interface ScoringContext {
  activeRound: ScoringRoundMeta
  unl: ScoringUnlResponse
  scores: ScoresJson
  round: ScoringRoundMeta
  config: ScoringConfig | null
}

export interface ScoringInfo {
  status: ScoringStatus
  score: number | null
}

export const STATUS_RANK: Record<ScoringStatus, number> = {
  on_unl: 0,
  candidate: 1,
  ineligible: 2,
  no_data: 3,
}

export const isOverrideRound = (round: ScoringRoundMeta): boolean =>
  Boolean(round.override_type)

export const isScoredRound = (round: ScoringRoundMeta): boolean =>
  round.status === 'COMPLETE' && !isOverrideRound(round)

export const findLatestScoredRound = (
  rounds: ScoringRoundMeta[] | null | undefined,
): ScoringRoundMeta | null => {
  if (!rounds) return null
  return (
    rounds
      .filter(isScoredRound)
      .sort((a, b) => b.round_number - a.round_number)[0] ?? null
  )
}

export const findPreviousScoredRound = (
  rounds: ScoringRoundMeta[] | null | undefined,
  beforeRoundNumber: number | undefined,
): ScoringRoundMeta | null => {
  if (!rounds || beforeRoundNumber === undefined) return null
  return (
    rounds
      .filter((round) => round.round_number < beforeRoundNumber)
      .sort((a, b) => b.round_number - a.round_number)
      .find(isScoredRound) ?? null
  )
}

export const getScoringInfoForValidator = (
  masterKey: string | undefined,
  ctx: ScoringContext | null,
): ScoringInfo => {
  if (!ctx || !masterKey) return { status: 'no_data', score: null }

  const unlSet = new Set(ctx.unl.unl)
  const alternatesSet = new Set(ctx.unl.alternates)
  const scoreByKey = new Map(
    ctx.scores.validator_scores.map((e) => [e.master_key, e.score]),
  )

  if (unlSet.has(masterKey)) {
    return { status: 'on_unl', score: scoreByKey.get(masterKey) ?? null }
  }
  if (alternatesSet.has(masterKey)) {
    return { status: 'candidate', score: scoreByKey.get(masterKey) ?? null }
  }
  if (scoreByKey.has(masterKey)) {
    return { status: 'ineligible', score: scoreByKey.get(masterKey) ?? null }
  }
  return { status: 'no_data', score: null }
}

export type ScoringDimension =
  | 'consensus'
  | 'reliability'
  | 'software'
  | 'diversity'
  | 'identity'

export interface DimensionMeta {
  key: ScoringDimension
  label: string
  tooltip: string
}

export const SCORING_DIMENSIONS: DimensionMeta[] = [
  {
    key: 'consensus',
    label: 'Consensus',
    tooltip:
      "How reliably the validator's proposals match consensus across recent ledgers.",
  },
  {
    key: 'reliability',
    label: 'Reliability',
    tooltip:
      'Operational reliability signaled by verified domain (public accountability) and current UNL membership.',
  },
  {
    key: 'software',
    label: 'Software',
    tooltip:
      'Whether the validator runs up-to-date software and votes reasonable fees.',
  },
  {
    key: 'diversity',
    label: 'Diversity',
    tooltip:
      'Geographic and infrastructure spread. Validators in underrepresented countries or on less common cloud providers score higher.',
  },
  {
    key: 'identity',
    label: 'Identity',
    tooltip:
      'Identity and reputation. Verified domain and organizational identity raise this score.',
  },
]

export const findScoreEntry = (
  masterKey: string | undefined,
  scores: ScoresJson | null | undefined,
): ValidatorScoreEntry | null => {
  if (!masterKey || !scores) return null
  return scores.validator_scores.find((e) => e.master_key === masterKey) ?? null
}

export type ScoreColor = 'green' | 'yellow' | 'orange' | 'neutral'

export const getScoreColor = (value: number | null | undefined): ScoreColor => {
  if (value == null) return 'neutral'
  if (value >= 70) return 'green'
  if (value >= 40) return 'yellow'
  return 'orange'
}

export const getStatusColor = (status: ScoringStatus): ScoreColor => {
  if (status === 'on_unl') return 'green'
  if (status === 'candidate') return 'yellow'
  if (status === 'ineligible') return 'orange'
  return 'neutral'
}

export const getAgreementColor = (value: number): ScoreColor => {
  if (value >= 0.99) return 'green'
  if (value >= 0.95) return 'yellow'
  return 'orange'
}

export const getStatusLabel = (status: ScoringStatus): string => {
  if (status === 'on_unl') return 'on UNL'
  if (status === 'candidate') return 'candidate'
  if (status === 'ineligible') return 'ineligible'
  return 'no data'
}

export interface UnlArtifact {
  unl: string[]
  alternates: string[]
}

export interface ASNInfo {
  asn: number
  as_name: string
}

export interface GeoLocation {
  country: string
}

export interface AgreementBucket {
  score: number
  total: number
  missed: number
}

export interface SnapshotValidator {
  master_key: string
  domain: string | null
  domain_verified: boolean
  asn: ASNInfo | null
  geolocation: GeoLocation | null
  agreement_1h: AgreementBucket | null
  agreement_24h: AgreementBucket | null
  agreement_30d: AgreementBucket | null
  server_version: string | null
  unl: boolean
  base_fee: number | null
  identity: string | null
  signing_key: string | null
  // IP is present in the snapshot artifact but must not be rendered on public
  // scoring surfaces (DDoS risk). Preserved here so per-validator download
  // artifacts round-trip the full record the pipeline consumed.
  ip: string
}

export interface SnapshotJson {
  validators: SnapshotValidator[]
}

export interface HealthSignal {
  healthy: boolean
  detail: string
}

export interface ScoringHealth {
  scheduler: HealthSignal
  llm_endpoint: HealthSignal
  publisher_wallet: HealthSignal
}

export type DeltaKind =
  | 'up'
  | 'down'
  | 'same'
  | 'new'
  | 'displaced'
  | 'unresolved'

export interface ValidatorDelta {
  kind: DeltaKind
  value?: number
}

export const computeValidatorDelta = (
  masterKey: string,
  currentScore: number,
  currentStatus: ScoringStatus,
  priorScores: ScoresJson | null | undefined,
  priorUnl: UnlArtifact | null | undefined,
): ValidatorDelta => {
  if (priorScores === undefined) return { kind: 'unresolved' }
  if (priorScores === null) return { kind: 'new' }

  const priorEntry = priorScores.validator_scores.find(
    (e) => e.master_key === masterKey,
  )
  if (!priorEntry) return { kind: 'new' }

  const priorWasOnUnl = priorUnl ? priorUnl.unl.includes(masterKey) : false
  if (priorWasOnUnl && currentStatus !== 'on_unl') {
    return { kind: 'displaced' }
  }

  const diff = currentScore - priorEntry.score
  if (diff > 0) return { kind: 'up', value: diff }
  if (diff < 0) return { kind: 'down', value: -diff }
  return { kind: 'same' }
}

export type StalenessLevel = 'neutral' | 'amber' | 'red'

export const getStalenessLevel = (
  completedAt: string | null | undefined,
  cadenceHours: number | null | undefined,
  now: number = Date.now(),
): StalenessLevel => {
  if (!completedAt || !cadenceHours) return 'neutral'
  const completedMs = Date.parse(completedAt)
  if (Number.isNaN(completedMs)) return 'neutral'

  const elapsedHours = (now - completedMs) / (60 * 60 * 1000)
  if (elapsedHours > cadenceHours * 2) return 'red'
  if (elapsedHours > cadenceHours + 24) return 'amber'
  return 'neutral'
}

export const formatCadence = (
  cadenceHours: number | null | undefined,
): string => {
  if (
    cadenceHours == null ||
    !Number.isFinite(cadenceHours) ||
    cadenceHours <= 0
  ) {
    return 'unknown'
  }

  if (cadenceHours === 1) return 'hourly'
  if (cadenceHours === 24) return 'daily'
  if (cadenceHours === 168) return 'weekly'

  const totalMinutes = Math.round(cadenceHours * 60)

  if (totalMinutes < 60) {
    return `every ${totalMinutes} minutes`
  }

  if (totalMinutes < 1440) {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (minutes === 0) return `every ${hours} hours`
    return `every ${hours}h ${minutes}m`
  }

  if (totalMinutes < 10080) {
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    if (hours === 0) return `every ${days} days`
    return `every ${days}d ${hours}h`
  }

  const weeks = Math.floor(totalMinutes / 10080)
  const days = Math.floor((totalMinutes % 10080) / 1440)
  if (days === 0) return `every ${weeks} weeks`
  return `every ${weeks}w ${days}d`
}

export const formatRelativeTime = (
  completedAt: string | null | undefined,
  now: number = Date.now(),
): string => {
  if (!completedAt) return 'unknown'
  const completedMs = Date.parse(completedAt)
  if (Number.isNaN(completedMs)) return 'unknown'

  const diffSec = Math.max(0, Math.floor((now - completedMs) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) {
    const remMin = diffMin % 60
    return remMin === 0 ? `${diffHr}h ago` : `${diffHr}h ${remMin}m ago`
  }
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}
