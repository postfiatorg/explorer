import { FC, Fragment, useEffect, useMemo, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import DomainLink from '../shared/components/DomainLink'
import { buildPath } from '../shared/routing'
import { VALIDATOR_ROUTE } from '../App/routes'
import {
  NetworkReport,
  NetworkReportTone,
  SCORING_DIMENSIONS,
  ScoringContext,
  ScoringRoundMeta,
  ScoringStatus,
  ScoringDimension,
  ScoresJson,
  SnapshotJson,
  SnapshotValidator,
  UnlArtifact,
  ValidatorDelta,
  ValidatorIdMap,
  ValidatorScoreEntry,
  computeValidatorDelta,
  getScoreColor,
  getStatusColor,
} from '../Network/scoringUtils'
import {
  ValidatorDrillDown,
  renderReasoningWithValidatorLinks,
} from './ValidatorDrillDown'

export interface ValidatorMeta {
  domain: string | null
  domainVerified: boolean
}

interface RankedTableProps {
  context: ScoringContext
  priorScores: ScoresJson | null | undefined
  priorUnl: UnlArtifact | null | undefined
  snapshot: SnapshotJson | null
  validatorIdMap?: ValidatorIdMap | null
  validatorMetaByKey: Map<string, ValidatorMeta>
  expandedMasterKeys: Set<string>
  onToggleValidator: (masterKey: string) => void
}

interface OverrideRoundTableProps {
  round: ScoringRoundMeta
  unl: UnlArtifact
  latestScoredRound: ScoringRoundMeta | null
  latestScoredScores: ScoresJson | null
  validatorMetaByKey: Map<string, ValidatorMeta>
}

interface RankedRow {
  entry: ValidatorScoreEntry
  status: ScoringStatus
  delta: ValidatorDelta
  withinChurnGap: boolean
}

interface OverrideRow {
  masterKey: string
  kind: 'manual' | 'not_selected'
}

interface RenderableNetworkReportCategory {
  key: ScoringDimension
  label: string
  tone: NetworkReportTone
  body: string
}

interface RenderableNetworkReport {
  headline: string | null
  summary: string | null
  categories: RenderableNetworkReportCategory[]
}

const DIMENSION_COLS = SCORING_DIMENSIONS.length
const TOTAL_COLS = 3 + DIMENSION_COLS // Rank + Validator + Overall + dimensions
const DEFAULT_NETWORK_REPORT_TONE: NetworkReportTone = 'neutral'
const NETWORK_REPORT_TONES = new Set<string>([
  'positive',
  'mixed',
  'warning',
  'negative',
  'neutral',
])
const ROUND_REASONING_MISSING_MESSAGE =
  'No round reasoning available for this round.'

const statusOf = (masterKey: string, unl: UnlArtifact): ScoringStatus => {
  if (unl.unl.includes(masterKey)) return 'on_unl'
  if (unl.alternates.includes(masterKey)) return 'candidate'
  return 'ineligible'
}

const DeltaTag: FC<{ delta: ValidatorDelta }> = ({ delta }) => {
  if (delta.kind === 'unresolved') return null
  if (delta.kind === 'new') return <span className="delta delta-new">new</span>
  const scoreChanged = delta.kind === 'up' || delta.kind === 'down'
  if (!delta.membership && !scoreChanged) return null

  const arrow = delta.kind === 'up' ? '↑' : '↓'
  const cls = delta.kind === 'up' ? 'delta-up' : 'delta-down'
  return (
    <>
      {delta.membership && (
        <span className={`delta delta-${delta.membership}`}>
          {delta.membership}
        </span>
      )}
      {scoreChanged && (
        <span className={`delta ${cls}`}>
          {arrow}
          {delta.value ?? 0}
        </span>
      )}
    </>
  )
}

const DimensionBar: FC<{ value: number }> = ({ value }) => {
  const color = getScoreColor(value)
  return (
    <div className="ranked-dimension">
      <span className={`ranked-dimension-value agreement-value ${color}`}>
        {value}
      </span>
      <div className="agreement-bar-track">
        <div
          className={`agreement-bar-fill ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

const SeparatorChip: FC<{ label: string }> = ({ label }) => (
  <tr className="ranked-separator">
    <td colSpan={TOTAL_COLS}>
      <div className="ranked-separator-line">
        <span className="ranked-separator-chip">{label}</span>
      </div>
    </td>
  </tr>
)

const EmptyZoneRow: FC<{ message: string }> = ({ message }) => (
  <tr className="ranked-empty-zone">
    <td colSpan={TOTAL_COLS}>{message}</td>
  </tr>
)

const RankedTableHeader: FC = () => (
  <thead>
    <tr>
      <th className="ranked-col-rank">Rank</th>
      <th className="ranked-col-validator">Validator</th>
      <th className="ranked-col-overall">Overall</th>
      {SCORING_DIMENSIONS.map((dim) => (
        <th className="ranked-col-dimension" key={dim.key} title={dim.tooltip}>
          {dim.label}
        </th>
      ))}
    </tr>
  </thead>
)

const formatPubkey = (masterKey: string): string =>
  `${masterKey.slice(0, 10)}...${masterKey.slice(-6)}`

const ValidatorIdentity: FC<{
  masterKey: string
  meta: ValidatorMeta | undefined
}> = ({ masterKey, meta }) => {
  const detailHref = buildPath(VALIDATOR_ROUTE, { identifier: masterKey })

  return (
    <div className="ranked-validator-cell">
      {meta?.domain && (
        <>
          <span className="ranked-validator-domain">
            {meta.domainVerified && (
              <CircleCheck className="domain-verified-badge" size={12} />
            )}
            <DomainLink domain={meta.domain} />
          </span>
          <span className="ranked-validator-sep">·</span>
        </>
      )}
      <a
        className={`ranked-validator-pubkey ${meta?.domain ? '' : 'ranked-validator-pubkey-primary'}`}
        href={detailHref}
        target="_blank"
        rel="noopener noreferrer"
        title={masterKey}
      >
        {formatPubkey(masterKey)}
      </a>
    </div>
  )
}

const normalizeReasoningText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

const normalizeNetworkReportTone = (tone: unknown): NetworkReportTone => {
  if (typeof tone === 'string' && NETWORK_REPORT_TONES.has(tone)) {
    return tone as NetworkReportTone
  }
  return DEFAULT_NETWORK_REPORT_TONE
}

const getRenderableNetworkReport = (
  report: NetworkReport | undefined,
): RenderableNetworkReport | null => {
  if (!report || typeof report !== 'object') return null

  const headline = normalizeReasoningText(report.headline)
  const summary = normalizeReasoningText(report.summary)
  const categories = SCORING_DIMENSIONS.map((dimension) => {
    const category = report.categories?.[dimension.key]
    if (!category || typeof category !== 'object') return null

    const body = normalizeReasoningText(category.body)
    if (!body) return null

    return {
      key: dimension.key,
      label: dimension.label,
      tone: normalizeNetworkReportTone(category.tone),
      body,
    }
  }).filter(
    (category): category is RenderableNetworkReportCategory =>
      category !== null,
  )

  if (!headline && !summary && categories.length === 0) return null
  return { headline, summary, categories }
}

const RankedValidatorRow: FC<{
  row: RankedRow
  rank: number
  meta: ValidatorMeta | undefined
  isExpanded: boolean
  onToggle: () => void
}> = ({ row, rank, meta, isExpanded, onToggle }) => {
  const { entry, status, delta, withinChurnGap } = row
  const overallColor = getStatusColor(status)

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('a, button')) return
    onToggle()
  }

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  const rowClass = [
    'ranked-row',
    withinChurnGap ? 'ranked-row-churn-gap' : '',
    isExpanded ? 'ranked-row-expanded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <tr
      className={rowClass}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      tabIndex={0}
      aria-expanded={isExpanded}
    >
      <td className="ranked-col-rank">{rank}</td>
      <td className="ranked-col-validator">
        <ValidatorIdentity masterKey={entry.master_key} meta={meta} />
      </td>
      <td className="ranked-col-overall">
        <div className="ranked-overall-inline">
          <span
            className={`ranked-overall-value agreement-value ${overallColor}`}
          >
            {entry.score}
          </span>
          <DeltaTag delta={delta} />
        </div>
      </td>
      {SCORING_DIMENSIONS.map((dim) => (
        <td className="ranked-col-dimension" key={dim.key}>
          <DimensionBar value={entry[dim.key]} />
        </td>
      ))}
    </tr>
  )
}

const RoundReasoningPanel: FC<{
  scores: ScoresJson
  validatorIdMap?: ValidatorIdMap | null
}> = ({ scores, validatorIdMap = null }) => {
  const networkReport = useMemo(
    () => getRenderableNetworkReport(scores.network_report),
    [scores.network_report],
  )
  const legacySummary = normalizeReasoningText(scores.network_summary)

  if (networkReport) {
    const title = networkReport.headline ?? 'Round reasoning'

    return (
      <section
        className="round-reasoning dashboard-panel"
        aria-label="Round reasoning"
      >
        <div className="round-reasoning-header">
          <h2 className="round-reasoning-title">{title}</h2>
        </div>

        {networkReport.summary && (
          <p className="round-reasoning-summary">
            {renderReasoningWithValidatorLinks(
              networkReport.summary,
              validatorIdMap,
            )}
          </p>
        )}

        {networkReport.categories.length > 0 && (
          <div className="round-reasoning-categories">
            {networkReport.categories.map((category) => (
              <section
                className={`round-reasoning-category unl-scoring-accent-panel unl-scoring-accent-panel-compact unl-scoring-accent-${category.tone} dashboard-panel`}
                key={category.key}
              >
                <div className="round-reasoning-category-header">
                  <h3 className="unl-scoring-accent-title">{category.label}</h3>
                  <span className="round-reasoning-tone-label">
                    {category.tone}
                  </span>
                </div>
                <p className="unl-scoring-accent-body">
                  {renderReasoningWithValidatorLinks(
                    category.body,
                    validatorIdMap,
                  )}
                </p>
              </section>
            ))}
          </div>
        )}
      </section>
    )
  }

  if (legacySummary) {
    return (
      <section
        className="round-reasoning dashboard-panel"
        aria-label="Round reasoning"
      >
        <div className="round-reasoning-header">
          <h2 className="round-reasoning-title">Round reasoning</h2>
        </div>
        <p className="round-reasoning-text">
          {renderReasoningWithValidatorLinks(legacySummary, validatorIdMap)}
        </p>
      </section>
    )
  }

  return (
    <section
      className="round-reasoning round-reasoning-empty dashboard-panel"
      aria-label="Round reasoning"
    >
      <div className="round-reasoning-header">
        <h2 className="round-reasoning-title">Round reasoning</h2>
      </div>
      <p className="round-reasoning-text">{ROUND_REASONING_MISSING_MESSAGE}</p>
    </section>
  )
}

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])
  return debounced
}

const OverrideValidatorRow: FC<{
  row: OverrideRow
  rank: number
  meta: ValidatorMeta | undefined
}> = ({ row, rank, meta }) => {
  const label = row.kind === 'manual' ? 'manual' : 'not selected'
  return (
    <tr className="ranked-row ranked-row-static">
      <td className="ranked-col-rank">{rank}</td>
      <td className="ranked-col-validator">
        <ValidatorIdentity masterKey={row.masterKey} meta={meta} />
      </td>
      <td className="ranked-col-overall">
        <span
          className={`ranked-override-pill ${
            row.kind === 'manual' ? 'ranked-override-pill-manual' : ''
          }`}
        >
          {label}
        </span>
      </td>
      {SCORING_DIMENSIONS.map((dim) => (
        <td className="ranked-col-dimension" key={dim.key}>
          <span className="ranked-score-unavailable">—</span>
        </td>
      ))}
    </tr>
  )
}

export const OverrideRoundTable: FC<OverrideRoundTableProps> = ({
  round,
  unl,
  latestScoredRound,
  latestScoredScores,
  validatorMetaByKey,
}) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim().toLowerCase(), 200)

  const { manualRows, notSelectedRows } = useMemo(() => {
    const manualSet = new Set(unl.unl)
    const manual = unl.unl.map<OverrideRow>((masterKey) => ({
      masterKey,
      kind: 'manual',
    }))
    const notSelected =
      latestScoredScores?.validator_scores
        .filter((entry) => !manualSet.has(entry.master_key))
        .slice()
        .sort((a, b) => b.score - a.score)
        .map<OverrideRow>((entry) => ({
          masterKey: entry.master_key,
          kind: 'not_selected',
        })) ?? []
    return { manualRows: manual, notSelectedRows: notSelected }
  }, [latestScoredScores, unl.unl])

  const matchesFilter = (row: OverrideRow): boolean => {
    if (!debouncedQuery) return true
    if (row.masterKey.toLowerCase().includes(debouncedQuery)) return true
    const domain = validatorMetaByKey.get(row.masterKey)?.domain
    return domain ? domain.toLowerCase().includes(debouncedQuery) : false
  }

  const visibleManualRows = manualRows.filter(matchesFilter)
  const visibleNotSelectedRows = notSelectedRows.filter(matchesFilter)
  const scoringContextText = latestScoredRound
    ? `Latest scored round: #${latestScoredRound.round_number}.`
    : 'No scored round is available for comparison.'

  let rank = 0

  return (
    <div className="unl-scoring-ranked dashboard-panel">
      <div className="ranked-header">
        <div>
          <h2 className="ranked-title">Manually selected validators</h2>
          <p className="ranked-subtitle">
            Round #{round.round_number} is a manual override; no score artifacts
            were produced for this round. {scoringContextText}
          </p>
        </div>
        <input
          className="ranked-filter"
          type="search"
          placeholder="Filter by pubkey or domain…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="ranked-table-wrapper">
        <table className="basic ranked-table">
          <RankedTableHeader />
          <tbody>
            <SeparatorChip label="manually selected validators" />
            {visibleManualRows.length === 0 ? (
              <EmptyZoneRow message="— No manually selected validators match this filter —" />
            ) : (
              visibleManualRows.map((row) => {
                rank += 1
                return (
                  <OverrideValidatorRow
                    key={`manual-${row.masterKey}`}
                    row={row}
                    rank={rank}
                    meta={validatorMetaByKey.get(row.masterKey)}
                  />
                )
              })
            )}

            <SeparatorChip label="not selected in manual override" />
            {visibleNotSelectedRows.length === 0 ? (
              <EmptyZoneRow message="— No scored validators outside the manual set —" />
            ) : (
              visibleNotSelectedRows.map((row) => {
                rank += 1
                return (
                  <OverrideValidatorRow
                    key={`not-selected-${row.masterKey}`}
                    row={row}
                    rank={rank}
                    meta={validatorMetaByKey.get(row.masterKey)}
                  />
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const RankedTable: FC<RankedTableProps> = ({
  context,
  priorScores,
  priorUnl,
  snapshot,
  validatorIdMap = null,
  validatorMetaByKey,
  expandedMasterKeys,
  onToggleValidator,
}) => {
  const { scores, unl, config, round } = context

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim().toLowerCase(), 200)

  const snapshotByKey = useMemo<Map<string, SnapshotValidator>>(() => {
    const map = new Map<string, SnapshotValidator>()
    if (!snapshot) return map
    snapshot.validators.forEach((v) => map.set(v.master_key, v))
    return map
  }, [snapshot])

  const rows = useMemo<RankedRow[]>(() => {
    const onUnlSet = new Set(unl.unl)
    const base: RankedRow[] = scores.validator_scores.map((entry) => {
      const status = statusOf(entry.master_key, unl)
      return {
        entry,
        status,
        delta: computeValidatorDelta(
          entry.master_key,
          entry.score,
          status,
          priorScores,
          priorUnl,
        ),
        withinChurnGap: false,
      }
    })
    // Sort by score descending
    base.sort((a, b) => b.entry.score - a.entry.score)

    // Without config we cannot compute the churn-gap threshold — the highlight
    // is skipped rather than rendered from a hardcoded default.
    if (!config) return base

    const unlScores = base.filter((r) => onUnlSet.has(r.entry.master_key))
    if (unlScores.length === 0) return base
    const weakestOnUnl = unlScores[unlScores.length - 1].entry.score
    const gapThreshold = weakestOnUnl + config.unl_min_score_gap
    return base.map((r) =>
      r.status === 'candidate' &&
      r.entry.score >= config.unl_score_cutoff &&
      r.entry.score < gapThreshold
        ? { ...r, withinChurnGap: true }
        : r,
    )
  }, [scores, unl, priorScores, priorUnl, config])

  const filteredRows = useMemo(() => {
    if (!debouncedQuery) return rows
    return rows.filter((r) => {
      if (r.entry.master_key.toLowerCase().includes(debouncedQuery)) return true
      const domain = validatorMetaByKey.get(r.entry.master_key)?.domain
      return domain ? domain.toLowerCase().includes(debouncedQuery) : false
    })
  }, [rows, debouncedQuery, validatorMetaByKey])

  const onUnlRows = filteredRows.filter((r) => r.status === 'on_unl')
  const candidateRows = filteredRows.filter((r) => r.status === 'candidate')
  const ineligibleRows = filteredRows.filter((r) => r.status === 'ineligible')

  let rank = 0

  // Both candidate and ineligible empty → collapse the two chips into one
  const bothEmptyCollapse =
    onUnlRows.length > 0 &&
    candidateRows.length === 0 &&
    ineligibleRows.length === 0 &&
    !debouncedQuery

  const renderRowWithDrillDown = (r: RankedRow, rankValue: number) => {
    const isExpanded = expandedMasterKeys.has(r.entry.master_key)
    return (
      <Fragment key={r.entry.master_key}>
        <RankedValidatorRow
          row={r}
          rank={rankValue}
          meta={validatorMetaByKey.get(r.entry.master_key)}
          isExpanded={isExpanded}
          onToggle={() => onToggleValidator(r.entry.master_key)}
        />
        {isExpanded && (
          <ValidatorDrillDown
            masterKey={r.entry.master_key}
            currentRoundNumber={round.round_number}
            scoreEntry={r.entry}
            snapshotEntry={snapshotByKey.get(r.entry.master_key) ?? null}
            validatorIdMap={validatorIdMap}
            colspan={TOTAL_COLS}
          />
        )}
      </Fragment>
    )
  }

  if (bothEmptyCollapse) {
    return (
      <>
        <RoundReasoningPanel scores={scores} validatorIdMap={validatorIdMap} />
        <div className="unl-scoring-ranked dashboard-panel">
          <div className="ranked-header">
            <h2 className="ranked-title">Ranked validators</h2>
            <input
              className="ranked-filter"
              type="search"
              placeholder="Filter by pubkey or domain…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ranked-table-wrapper">
            <table className="basic ranked-table">
              <RankedTableHeader />
              <tbody>
                {onUnlRows.map((r) => {
                  rank += 1
                  return renderRowWithDrillDown(r, rank)
                })}
                <SeparatorChip label="all on UNL" />
              </tbody>
            </table>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <RoundReasoningPanel scores={scores} validatorIdMap={validatorIdMap} />
      <div className="unl-scoring-ranked dashboard-panel">
        <div className="ranked-header">
          <h2 className="ranked-title">Ranked validators</h2>
          <input
            className="ranked-filter"
            type="search"
            placeholder="Filter by pubkey or domain…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="ranked-table-wrapper">
          <table className="basic ranked-table">
            <RankedTableHeader />
            <tbody>
              {onUnlRows.map((r) => {
                rank += 1
                return renderRowWithDrillDown(r, rank)
              })}

              <SeparatorChip
                label={
                  config
                    ? `candidate · +${config.unl_min_score_gap} to displace`
                    : 'candidate · +— to displace'
                }
              />

              {candidateRows.length === 0 ? (
                <EmptyZoneRow message="— No candidates this round —" />
              ) : (
                candidateRows.map((r) => {
                  rank += 1
                  return renderRowWithDrillDown(r, rank)
                })
              )}

              <SeparatorChip
                label={
                  config
                    ? `ineligible · below ${config.unl_score_cutoff}`
                    : 'ineligible · below —'
                }
              />

              {ineligibleRows.length === 0 ? (
                <EmptyZoneRow message="— No ineligible validators this round —" />
              ) : (
                ineligibleRows.map((r) => {
                  rank += 1
                  return renderRowWithDrillDown(r, rank)
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
