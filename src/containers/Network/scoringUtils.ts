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

export const compareSemver = (a: string, b: string): number => {
  const parse = (v: string): [number, number, number] | null => {
    const m = v.match(/^(\d+)\.(\d+)\.(\d+)/)
    if (!m) return null
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]
  }
  const pa = parse(a)
  const pb = parse(b)
  if (pa && pb) {
    if (pa[0] !== pb[0]) return pa[0] - pb[0]
    if (pa[1] !== pb[1]) return pa[1] - pb[1]
    return pa[2] - pb[2]
  }
  if (pa && !pb) return 1
  if (!pa && pb) return -1
  return a.localeCompare(b)
}
