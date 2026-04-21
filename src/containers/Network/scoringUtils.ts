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
  unl: ScoringUnlResponse
  scores: ScoresJson
  round: ScoringRoundMeta
  config: ScoringConfig
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

export interface UnlArtifact {
  unl: string[]
  alternates: string[]
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

export type DeltaKind = 'up' | 'down' | 'same' | 'new' | 'displaced'

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
  if (!priorScores) return { kind: 'new' }

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
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}
