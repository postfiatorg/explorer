import { FC } from 'react'
import {
  IPFS_PRIMARY_HOST,
  PINATA_GATEWAY_HOST,
  ipfsGatewayUrl,
} from '../Network/scoringUtils'
import { ConvergenceOutcome, ConvergenceResult } from './useConvergence'

// The three reproducibility levels the convergence service compares, in order.
const LEVELS = [
  { key: 'RAW', label: 'Raw' },
  { key: 'PARSED', label: 'Scores' },
  { key: 'SELECTED_UNL', label: 'UNL' },
] as const

const OUTCOME_LABEL: Record<ConvergenceOutcome, string> = {
  valid: 'Matched',
  divergent: 'Diverged',
  missing_reveal: 'No reveal',
  late: 'Late',
  commitment_mismatch: 'Commitment mismatch',
  signature_invalid: 'Invalid signature',
}

type OutcomeTone = 'match' | 'divergent' | 'other'

const OUTCOME_TONE: Record<ConvergenceOutcome, OutcomeTone> = {
  valid: 'match',
  divergent: 'divergent',
  missing_reveal: 'other',
  late: 'other',
  commitment_mismatch: 'other',
  signature_invalid: 'other',
}

const toneOf = (outcome: ConvergenceOutcome): OutcomeTone =>
  OUTCOME_TONE[outcome] ?? 'other'

const outcomeLabelOf = (outcome: ConvergenceOutcome): string =>
  OUTCOME_LABEL[outcome] ?? outcome

const shortenKey = (key: string): string =>
  key.length > 18 ? `${key.slice(0, 12)}…${key.slice(-4)}` : key

const formatUtcDateTime = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}

const parseMatchedLevels = (raw: string | null | undefined): Set<string> =>
  new Set(
    (raw ?? '')
      .split(',')
      .map((level) => level.trim())
      .filter((level) => level.length > 0),
  )

interface ConvergenceParticipationProps {
  result: ConvergenceResult
}

export const ConvergenceParticipation: FC<ConvergenceParticipationProps> = ({
  result,
}) => {
  if (result.status !== 'ready') return null

  const { participants } = result
  // Participants are exactly the validators observed committing on chain, so
  // their count is the committed-validator denominator for the bar and headline.
  const committed = participants.length

  const counts = participants.reduce(
    (acc, participant) => {
      acc[toneOf(participant.outcome)] += 1
      return acc
    },
    { match: 0, divergent: 0, other: 0 },
  )

  const segments = [
    { key: 'match', label: 'Reproduced (matched)', value: counts.match },
    { key: 'divergent', label: 'Diverged', value: counts.divergent },
    { key: 'other', label: 'No valid reveal', value: counts.other },
  ]

  return (
    <section className="audit-trail-section">
      <span className="audit-trail-label">
        Validator participation
        {!result.finalized && <span className="cr-live-tag">Live</span>}
      </span>

      {committed > 0 ? (
        <div className="cr-participation">
          <div className="cr-headline">
            <span className="cr-headline-count">
              {counts.match} / {committed}
            </span>
            <span className="cr-headline-text">
              committed validators reproduced the foundation&apos;s result
            </span>
          </div>

          <div
            className="cr-bar"
            role="img"
            aria-label={`${counts.match} of ${committed} committed validators reproduced the foundation's result; ${counts.divergent} diverged, ${counts.other} had no valid reveal`}
          >
            {segments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <div
                  key={segment.key}
                  className={`cr-bar-seg cr-seg-${segment.key}`}
                  style={{ width: `${(segment.value / committed) * 100}%` }}
                />
              ))}
          </div>

          <table className="cr-table">
            <thead>
              <tr>
                <th>Validator</th>
                <th>Outcome</th>
                <th className="cr-levels-head">Levels matched</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => {
                const matched = parseMatchedLevels(
                  participant.comparison_levels_matched,
                )
                const conflicting =
                  participant.conflicting_commit ||
                  participant.conflicting_reveal
                return (
                  <tr
                    key={participant.validator_master_key}
                    data-testid="cr-participant"
                  >
                    <td className="cr-validator">
                      <a
                        href={`/validators/${participant.validator_master_key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={participant.validator_master_key}
                      >
                        {shortenKey(participant.validator_master_key)}
                      </a>
                    </td>
                    <td>
                      <span
                        className={`cr-outcome cr-outcome-${toneOf(
                          participant.outcome,
                        )}`}
                      >
                        {outcomeLabelOf(participant.outcome)}
                      </span>
                      {conflicting && (
                        <span
                          className="cr-conflict"
                          title="Multiple conflicting submissions were seen on chain for this validator"
                        >
                          conflicting
                        </span>
                      )}
                    </td>
                    <td className="cr-levels">
                      {LEVELS.map((level) => (
                        <span
                          key={level.key}
                          className={`cr-level ${
                            matched.has(level.key)
                              ? 'cr-level-on'
                              : 'cr-level-off'
                          }`}
                          title={
                            matched.has(level.key)
                              ? `${level.key} matched the foundation`
                              : `${level.key} not matched`
                          }
                        >
                          {level.label}
                        </span>
                      ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="audit-card-hint">
          No validators committed to this round on chain.
        </p>
      )}

      {result.finalized && result.convergenceBundleCid && (
        <div className="cr-sealed">
          <span className="audit-card-key">Sealed report</span>
          <div className="audit-trail-links">
            <a
              className="audit-gateway-link"
              href={ipfsGatewayUrl(
                IPFS_PRIMARY_HOST,
                result.convergenceBundleCid,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on IPFS
            </a>
            <a
              className="audit-gateway-alt"
              href={ipfsGatewayUrl(
                PINATA_GATEWAY_HOST,
                result.convergenceBundleCid,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Pinata
            </a>
            {result.anchorTxHash && (
              <a
                className="audit-gateway-alt"
                href={`/transactions/${result.anchorTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                On-chain anchor
              </a>
            )}
          </div>
          {result.sealedAt && (
            <span className="audit-card-muted">
              Sealed {formatUtcDateTime(result.sealedAt)}
            </span>
          )}
        </div>
      )}
    </section>
  )
}
