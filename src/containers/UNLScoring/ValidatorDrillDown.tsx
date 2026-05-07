import { FC, ReactNode, useMemo, useState } from 'react'
import { buildPath } from '../shared/routing'
import { VALIDATOR_ROUTE } from '../App/routes'
import { ScoreSparkline } from '../Network/ScoreSparkline'
import { formatASNDisplayName } from '../Network/asnDisplayNames'
import {
  SCORING_DIMENSIONS,
  SnapshotValidator,
  ValidatorIdMap,
  ValidatorScoreEntry,
  getScoreColor,
} from '../Network/scoringUtils'
import { useScoreHistory } from './useScoreHistory'

interface ValidatorDrillDownProps {
  masterKey: string
  currentRoundNumber: number
  scoreEntry: ValidatorScoreEntry
  snapshotEntry: SnapshotValidator | null
  validatorIdMap?: ValidatorIdMap | null
  colspan: number
}

const filenamePubkey = (masterKey: string): string =>
  `${masterKey.slice(0, 10)}${masterKey.slice(-6)}`

const REASONING_PUBKEY_PREFIX_LENGTH = 5
const COLLAPSED_VALIDATOR_REFERENCE_COUNT = 2
const MIN_COLLAPSIBLE_VALIDATOR_REFERENCE_COUNT = 4

const formatReasoningPubkey = (masterKey: string): string =>
  `${masterKey.slice(0, REASONING_PUBKEY_PREFIX_LENGTH)}...`

const isIdentifierChar = (value: string | undefined): boolean =>
  Boolean(value && /[A-Za-z0-9_]/.test(value))

const validatorIdTokenMatcher = /v\d+/g

const parseValidatorIdNumber = (validatorId: string): number | null => {
  if (!/^v\d+$/.test(validatorId)) return null
  const n = Number(validatorId.slice(1))
  return Number.isSafeInteger(n) ? n : null
}

interface ValidatorReferenceSegment {
  kind: 'validator'
  token: string
  masterKey: string
  start: number
}

type ReasoningSegment = string | ValidatorReferenceSegment

const isValidatorReferenceSegment = (
  segment: ReasoningSegment,
): segment is ValidatorReferenceSegment =>
  typeof segment !== 'string' && segment.kind === 'validator'

const isLightweightValidatorSeparator = (value: string): boolean => {
  const remaining = value
    .toLowerCase()
    .replace(/\band\b/g, '')
    .replace(/[,\s/]/g, '')

  return remaining.length === 0
}

const ValidatorReferenceLink: FC<{
  reference: ValidatorReferenceSegment
}> = ({ reference }) => (
  <a
    className="drill-down-reasoning-validator-link"
    href={buildPath(VALIDATOR_ROUTE, { identifier: reference.masterKey })}
    target="_blank"
    rel="noopener noreferrer"
    title={reference.masterKey}
  >
    {formatReasoningPubkey(reference.masterKey)}
  </a>
)

const validatorReferenceSeparator = (
  index: number,
  referenceCount: number,
): string | null => {
  if (index === 0) return null
  if (index === referenceCount - 1) {
    return referenceCount === 2 ? ' and ' : ', and '
  }
  return ', '
}

const renderValidatorReferenceList = (
  references: ValidatorReferenceSegment[],
): ReactNode[] =>
  references.map((reference, index) => {
    const separator = validatorReferenceSeparator(index, references.length)

    return (
      <span key={`${reference.token}-${reference.start}`}>
        {separator}
        <ValidatorReferenceLink reference={reference} />
      </span>
    )
  })

const renderCommaSeparatedValidatorReferenceList = (
  references: ValidatorReferenceSegment[],
): ReactNode[] =>
  references.map((reference, index) => (
    <span key={`${reference.token}-${reference.start}`}>
      {index > 0 ? ', ' : null}
      <ValidatorReferenceLink reference={reference} />
    </span>
  ))

const ValidatorReferenceGroup: FC<{
  references: ValidatorReferenceSegment[]
}> = ({ references }) => {
  const [expanded, setExpanded] = useState(false)
  const visibleReferences = expanded
    ? references
    : references.slice(0, COLLAPSED_VALIDATOR_REFERENCE_COUNT)
  const hiddenCount = references.length - visibleReferences.length

  return (
    <span className="drill-down-reasoning-validator-group">
      {hiddenCount > 0 ? (
        <>
          {renderCommaSeparatedValidatorReferenceList(visibleReferences)}
          {' and '}
          <button
            type="button"
            className="drill-down-reasoning-validator-more"
            aria-expanded={expanded}
            onClick={() => setExpanded(true)}
            title={`Show ${hiddenCount} more validator${
              hiddenCount === 1 ? '' : 's'
            }`}
          >
            {hiddenCount} more validator{hiddenCount === 1 ? '' : 's'}
          </button>
        </>
      ) : (
        renderValidatorReferenceList(visibleReferences)
      )}
    </span>
  )
}

const renderReasoningSegments = (segments: ReasoningSegment[]): ReactNode[] => {
  const parts: ReactNode[] = []
  let index = 0

  while (index < segments.length) {
    const segment = segments[index]

    if (!isValidatorReferenceSegment(segment)) {
      parts.push(segment)
      index += 1
    } else {
      const referenceRun = [segment]
      let cursor = index + 1
      while (
        cursor + 1 < segments.length &&
        typeof segments[cursor] === 'string' &&
        isLightweightValidatorSeparator(segments[cursor] as string) &&
        isValidatorReferenceSegment(segments[cursor + 1])
      ) {
        referenceRun.push(segments[cursor + 1] as ValidatorReferenceSegment)
        cursor += 2
      }

      if (referenceRun.length >= MIN_COLLAPSIBLE_VALIDATOR_REFERENCE_COUNT) {
        parts.push(
          <ValidatorReferenceGroup
            key={`validator-group-${segment.start}`}
            references={referenceRun}
          />,
        )
        index = cursor
      } else {
        parts.push(...renderValidatorReferenceList(referenceRun))
        index = cursor
      }
    }
  }

  return parts
}

export const renderReasoningWithValidatorLinks = (
  reasoning: string,
  validatorIdMap?: ValidatorIdMap | null,
): ReactNode => {
  if (!reasoning) return 'No reasoning available'

  const validatorIds = Object.keys(validatorIdMap ?? {})
    .filter((validatorId) => validatorIdMap?.[validatorId]?.master_key)
    .sort((a, b) => b.length - a.length)

  if (validatorIds.length === 0) return reasoning

  const validatorIdByNumber = new Map<number, string | null>()
  validatorIds.forEach((validatorId) => {
    const n = parseValidatorIdNumber(validatorId)
    if (n == null) return
    validatorIdByNumber.set(n, validatorIdByNumber.has(n) ? null : validatorId)
  })

  const resolveValidatorId = (token: string): string | null => {
    if (validatorIdMap?.[token]?.master_key) return token

    const n = parseValidatorIdNumber(token)
    if (n == null) return null

    const normalizedValidatorId = validatorIdByNumber.get(n)
    if (!normalizedValidatorId) return null

    const tokenDigits = token.slice(1)
    const normalizedDigitCount = normalizedValidatorId.length - 1
    if (
      tokenDigits.length <= normalizedDigitCount ||
      !tokenDigits.startsWith('0')
    ) {
      return null
    }

    return normalizedValidatorId
  }

  const matcher = validatorIdTokenMatcher
  const segments: ReasoningSegment[] = []
  let lastIndex = 0
  let replacementCount = 0
  let match: RegExpExecArray | null

  while ((match = matcher.exec(reasoning)) !== null) {
    const token = match[0]
    const start = match.index
    const end = start + token.length
    const before = start > 0 ? reasoning[start - 1] : undefined
    const after = end < reasoning.length ? reasoning[end] : undefined

    const validatorId = resolveValidatorId(token)
    const masterKey = validatorId
      ? validatorIdMap?.[validatorId]?.master_key
      : null
    const isExactToken =
      !isIdentifierChar(before) &&
      !isIdentifierChar(after) &&
      Boolean(masterKey)

    if (isExactToken && masterKey) {
      if (start > lastIndex) {
        segments.push(reasoning.slice(lastIndex, start))
      }

      segments.push({ kind: 'validator', token, masterKey, start })
      replacementCount += 1
      lastIndex = end
    }
  }

  if (replacementCount === 0) return reasoning

  if (lastIndex < reasoning.length) {
    segments.push(reasoning.slice(lastIndex))
  }

  return renderReasoningSegments(segments)
}

const downloadJson = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

const formatAgreement30d = (entry: SnapshotValidator | null): string => {
  if (!entry?.agreement_30d) return '—'
  return `${(entry.agreement_30d.score * 100).toFixed(2)}%`
}

export const ValidatorDrillDown: FC<ValidatorDrillDownProps> = ({
  masterKey,
  currentRoundNumber,
  scoreEntry,
  snapshotEntry,
  validatorIdMap = null,
  colspan,
}) => {
  const { points } = useScoreHistory(masterKey, true)

  const pubkeyFile = filenamePubkey(masterKey)
  const detailHref = buildPath(VALIDATOR_ROUTE, { identifier: masterKey })
  const renderedReasoning = useMemo(
    () =>
      renderReasoningWithValidatorLinks(scoreEntry.reasoning, validatorIdMap),
    [scoreEntry.reasoning, validatorIdMap],
  )

  const handleDownloadSnapshot = () => {
    if (!snapshotEntry) return
    downloadJson(
      snapshotEntry,
      `validator-${pubkeyFile}-round-${currentRoundNumber}-snapshot.json`,
    )
  }

  const handleDownloadScore = () => {
    downloadJson(
      scoreEntry,
      `validator-${pubkeyFile}-round-${currentRoundNumber}-score.json`,
    )
  }

  return (
    <tr className="drill-down-row" data-drilldown-key={masterKey}>
      <td colSpan={colspan}>
        <div className="drill-down-panel">
          {/* Dimension scores on mobile only — the table's dimension columns
              collapse below the tablet-portrait breakpoint, so the scores move
              into the single inline expansion to keep the row readable. */}
          <div className="drill-down-dimensions">
            {SCORING_DIMENSIONS.map((dim) => {
              const value = scoreEntry[dim.key]
              const color = getScoreColor(value)
              return (
                <div className="drill-down-dim-row" key={dim.key}>
                  <span className="drill-down-dim-label" title={dim.tooltip}>
                    {dim.label}
                  </span>
                  <div className="drill-down-dim-bar-wrapper">
                    <div className="agreement-bar-track">
                      <div
                        className={`agreement-bar-fill ${color}`}
                        style={{
                          width: `${Math.max(0, Math.min(100, value))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className={`drill-down-dim-value agreement-value ${color}`}
                  >
                    {value}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="drill-down-enrichment">
            <div className="drill-down-field">
              <span className="drill-down-label">Network provider</span>
              <span className="drill-down-value">
                {formatASNDisplayName(snapshotEntry?.asn ?? null)}
              </span>
            </div>
            <div className="drill-down-field">
              <span className="drill-down-label">Country</span>
              <span className="drill-down-value">
                {snapshotEntry?.geolocation?.country ?? '—'}
              </span>
            </div>
            <div className="drill-down-field">
              <span className="drill-down-label">Agreement (30D)</span>
              <span className="drill-down-value">
                {formatAgreement30d(snapshotEntry)}
              </span>
            </div>
            <div className="drill-down-field drill-down-sparkline-field">
              <span className="drill-down-label">
                Score history ({points.length}{' '}
                {points.length === 1 ? 'round' : 'rounds'})
              </span>
              {points.length > 0 ? (
                <ScoreSparkline points={points} />
              ) : (
                <span className="drill-down-value">—</span>
              )}
            </div>
          </div>

          <div className="drill-down-reasoning">
            <span className="drill-down-label">Reasoning</span>
            <p className="drill-down-reasoning-text">{renderedReasoning}</p>
          </div>

          <div className="drill-down-actions">
            <button
              type="button"
              className="drill-down-button"
              onClick={handleDownloadSnapshot}
              disabled={!snapshotEntry}
            >
              Download snapshot entry
            </button>
            <button
              type="button"
              className="drill-down-button"
              onClick={handleDownloadScore}
            >
              Download score entry
            </button>
            <a
              className="drill-down-link"
              href={detailHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open validator detail page →
            </a>
          </div>
        </div>
      </td>
    </tr>
  )
}
