import { FC, ReactNode, useMemo } from 'react'
import { buildPath } from '../shared/routing'
import { VALIDATOR_ROUTE } from '../App/routes'
import { ScoreSparkline } from '../Network/ScoreSparkline'
import { ASN_DISPLAY_NAMES } from '../Network/asnDisplayNames'
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

const formatPubkey = (masterKey: string): string =>
  `${masterKey.slice(0, 10)}...${masterKey.slice(-6)}`

const isIdentifierChar = (value: string | undefined): boolean =>
  Boolean(value && /[A-Za-z0-9_]/.test(value))

const validatorIdTokenMatcher = /v\d+/g

const parseValidatorIdNumber = (validatorId: string): number | null => {
  if (!/^v\d+$/.test(validatorId)) return null
  const n = Number(validatorId.slice(1))
  return Number.isSafeInteger(n) ? n : null
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
  const parts: ReactNode[] = []
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
        parts.push(reasoning.slice(lastIndex, start))
      }

      parts.push(
        <a
          className="drill-down-reasoning-validator-link"
          href={buildPath(VALIDATOR_ROUTE, { identifier: masterKey })}
          key={`${token}-${start}`}
          target="_blank"
          rel="noopener noreferrer"
          title={masterKey}
        >
          {formatPubkey(masterKey)}
        </a>,
      )
      replacementCount += 1
      lastIndex = end
    }
  }

  if (replacementCount === 0) return reasoning

  if (lastIndex < reasoning.length) {
    parts.push(reasoning.slice(lastIndex))
  }

  return parts
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

const formatASN = (entry: SnapshotValidator | null): string => {
  if (!entry?.asn) return '—'
  const friendly = ASN_DISPLAY_NAMES[entry.asn.asn]
  if (friendly) return friendly
  return entry.asn.as_name
    ? `AS${entry.asn.asn} — ${entry.asn.as_name}`
    : `AS${entry.asn.asn}`
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
                {formatASN(snapshotEntry)}
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
