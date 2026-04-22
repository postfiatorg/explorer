import { FC, Fragment, useEffect, useMemo, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import DomainLink from '../shared/components/DomainLink'
import { buildPath } from '../shared/routing'
import { VALIDATOR_ROUTE } from '../App/routes'
import {
  SCORING_DIMENSIONS,
  ScoringContext,
  ScoringStatus,
  ScoresJson,
  SnapshotJson,
  SnapshotValidator,
  UnlArtifact,
  ValidatorDelta,
  ValidatorScoreEntry,
  computeValidatorDelta,
  getScoreColor,
  getStatusColor,
} from '../Network/scoringUtils'
import { ValidatorDrillDown } from './ValidatorDrillDown'

export interface ValidatorMeta {
  domain: string | null
  domainVerified: boolean
}

interface RankedTableProps {
  context: ScoringContext
  priorScores: ScoresJson | null
  priorUnl: UnlArtifact | null
  snapshot: SnapshotJson | null
  validatorMetaByKey: Map<string, ValidatorMeta>
}

interface RankedRow {
  entry: ValidatorScoreEntry
  status: ScoringStatus
  delta: ValidatorDelta
  withinChurnGap: boolean
}

const DIMENSION_COLS = SCORING_DIMENSIONS.length
const TOTAL_COLS = 3 + DIMENSION_COLS // Rank + Validator + Overall + dimensions

const statusOf = (masterKey: string, unl: UnlArtifact): ScoringStatus => {
  if (unl.unl.includes(masterKey)) return 'on_unl'
  if (unl.alternates.includes(masterKey)) return 'candidate'
  return 'ineligible'
}

const DeltaTag: FC<{ delta: ValidatorDelta }> = ({ delta }) => {
  if (delta.kind === 'same') return null
  if (delta.kind === 'new') return <span className="delta delta-new">new</span>
  if (delta.kind === 'displaced')
    return <span className="delta delta-displaced">displaced</span>
  const arrow = delta.kind === 'up' ? '↑' : '↓'
  const cls = delta.kind === 'up' ? 'delta-up' : 'delta-down'
  return (
    <span className={`delta ${cls}`}>
      {arrow}
      {delta.value ?? 0}
    </span>
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

const RankedValidatorRow: FC<{
  row: RankedRow
  rank: number
  meta: ValidatorMeta | undefined
  isExpanded: boolean
  onToggle: () => void
}> = ({ row, rank, meta, isExpanded, onToggle }) => {
  const { entry, status, delta, withinChurnGap } = row
  const pubkeyTruncated = `${entry.master_key.slice(0, 10)}...${entry.master_key.slice(-6)}`
  const detailHref = buildPath(VALIDATOR_ROUTE, {
    identifier: entry.master_key,
  })
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
            className={`ranked-validator-pubkey ${meta?.domain ? '' : 'ranked-validator-pubkey--primary'}`}
            href={detailHref}
            target="_blank"
            rel="noopener noreferrer"
            title={entry.master_key}
          >
            {pubkeyTruncated}
          </a>
        </div>
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

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])
  return debounced
}

export const RankedTable: FC<RankedTableProps> = ({
  context,
  priorScores,
  priorUnl,
  snapshot,
  validatorMetaByKey,
}) => {
  const { scores, unl, config, round } = context

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim().toLowerCase(), 200)

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())
  const toggleExpansion = (masterKey: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(masterKey)) next.delete(masterKey)
      else next.add(masterKey)
      return next
    })
  }

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

    // Compute weakest-on-UNL for churn-gap highlight
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

  const renderHeader = () => (
    <thead>
      <tr>
        <th className="ranked-col-rank">Rank</th>
        <th className="ranked-col-validator">Validator</th>
        <th className="ranked-col-overall">Overall</th>
        {SCORING_DIMENSIONS.map((dim) => (
          <th
            className="ranked-col-dimension"
            key={dim.key}
            title={dim.tooltip}
          >
            {dim.label}
          </th>
        ))}
      </tr>
    </thead>
  )

  // Both candidate and ineligible empty → collapse the two chips into one
  const bothEmptyCollapse =
    onUnlRows.length > 0 &&
    candidateRows.length === 0 &&
    ineligibleRows.length === 0 &&
    !debouncedQuery

  const renderRowWithDrillDown = (r: RankedRow, rankValue: number) => {
    const isExpanded = expandedKeys.has(r.entry.master_key)
    return (
      <Fragment key={r.entry.master_key}>
        <RankedValidatorRow
          row={r}
          rank={rankValue}
          meta={validatorMetaByKey.get(r.entry.master_key)}
          isExpanded={isExpanded}
          onToggle={() => toggleExpansion(r.entry.master_key)}
        />
        {isExpanded && (
          <ValidatorDrillDown
            masterKey={r.entry.master_key}
            currentRoundNumber={round.round_number}
            scoreEntry={r.entry}
            snapshotEntry={snapshotByKey.get(r.entry.master_key) ?? null}
            colspan={TOTAL_COLS}
          />
        )}
      </Fragment>
    )
  }

  if (bothEmptyCollapse) {
    return (
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
            {renderHeader()}
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
    )
  }

  return (
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
          {renderHeader()}
          <tbody>
            {onUnlRows.map((r) => {
              rank += 1
              return renderRowWithDrillDown(r, rank)
            })}

            <SeparatorChip
              label={`candidate · +${config.unl_min_score_gap} to displace`}
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
              label={`ineligible · below ${config.unl_score_cutoff}`}
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
  )
}
