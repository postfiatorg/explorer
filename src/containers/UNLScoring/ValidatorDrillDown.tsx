import { FC } from 'react'
import { buildPath } from '../shared/routing'
import { VALIDATOR_ROUTE } from '../App/routes'
import { ScoreSparkline } from '../Network/ScoreSparkline'
import { SnapshotValidator, ValidatorScoreEntry } from '../Network/scoringUtils'
import { useScoreHistory } from './useScoreHistory'

interface ValidatorDrillDownProps {
  masterKey: string
  currentRoundNumber: number
  scoreEntry: ValidatorScoreEntry
  snapshotEntry: SnapshotValidator | null
  colspan: number
}

const filenamePubkey = (masterKey: string): string =>
  `${masterKey.slice(0, 10)}${masterKey.slice(-6)}`

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
  return `AS${entry.asn.asn} — ${entry.asn.as_name}`
}

export const ValidatorDrillDown: FC<ValidatorDrillDownProps> = ({
  masterKey,
  currentRoundNumber,
  scoreEntry,
  snapshotEntry,
  colspan,
}) => {
  const { points } = useScoreHistory(masterKey, true)
  const sparklineScores = points
    .filter((p) => p.score !== null)
    .map((p) => p.score as number)

  const pubkeyFile = filenamePubkey(masterKey)
  const detailHref = buildPath(VALIDATOR_ROUTE, { identifier: masterKey })

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
    <tr className="drill-down-row">
      <td colSpan={colspan}>
        <div className="drill-down-panel">
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
                Score history ({sparklineScores.length}{' '}
                {sparklineScores.length === 1 ? 'round' : 'rounds'})
              </span>
              {sparklineScores.length > 0 ? (
                <ScoreSparkline
                  scores={sparklineScores}
                  currentScore={scoreEntry.score}
                />
              ) : (
                <span className="drill-down-value">—</span>
              )}
            </div>
          </div>

          <div className="drill-down-reasoning">
            <span className="drill-down-label">Reasoning</span>
            <p className="drill-down-reasoning-text">
              {scoreEntry.reasoning || 'No reasoning available'}
            </p>
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
