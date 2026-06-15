import { FC } from 'react'
import { IndependentVerificationResult } from './useIndependentVerification'

interface IndependentVerificationProps {
  result: IndependentVerificationResult
}

const pad = (n: number) => String(n).padStart(2, '0')

const formatUtcDateTime = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}

const formatUtcTime = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

const formatDuration = (
  fromIso: string | null,
  toIso: string | null,
): string => {
  if (!fromIso || !toIso) return ''
  const ms = Date.parse(toIso) - Date.parse(fromIso)
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

const Window: FC<{ label: string; from: string | null; to: string | null }> = ({
  label,
  from,
  to,
}) => (
  <div className="cr-window">
    <span className="cr-window-label">{label}</span>
    <span className="cr-window-time">
      {formatUtcTime(from)} – {formatUtcTime(to)} UTC
      <span className="cr-window-duration"> {formatDuration(from, to)}</span>
    </span>
  </div>
)

export const IndependentVerification: FC<IndependentVerificationProps> = ({
  result,
}) => {
  if (result.status === 'no_archive' || result.status === 'error') {
    const reason =
      result.status === 'no_archive'
        ? 'This network has no archive node configured, so it cannot be shown here.'
        : 'The archive node could not be reached, so it cannot be shown right now.'
    return (
      <section className="audit-trail-section">
        <span className="audit-trail-label">Independent verification</span>
        <p className="audit-card-hint">
          Independent commit-reveal verification is reconstructed from full
          ledger history. {reason}
        </p>
      </section>
    )
  }

  if (result.status !== 'ready' || !result.tally) return null

  const { tally, announcementTxHash } = result
  const segments = [
    { key: 'match', label: 'Same hashes (confirmed)', value: tally.matching },
    { key: 'divergent', label: 'Different hashes', value: tally.divergent },
    {
      key: 'noreveal',
      label: 'Committed, no reveal',
      value: tally.committedNoReveal,
    },
  ]

  return (
    <section className="audit-trail-section">
      <span className="audit-trail-label">Independent verification</span>

      <div className="cr-announce">
        <span className="audit-card-key">Announced</span>
        <span className="audit-card-value">
          {formatUtcDateTime(result.commitOpensAt)}
          {announcementTxHash && (
            <>
              {' '}
              <a
                className="external"
                href={`/transactions/${announcementTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on ledger
              </a>
            </>
          )}
        </span>
      </div>

      <div className="cr-windows">
        <Window
          label="Commit window"
          from={result.commitOpensAt}
          to={result.commitClosesAt}
        />
        <Window
          label="Reveal window"
          from={result.revealOpensAt}
          to={result.revealClosesAt}
        />
      </div>

      {tally.committed > 0 ? (
        <div className="cr-participation">
          <div className="cr-headline">
            <span className="cr-headline-count">
              {tally.matching} / {tally.committed}
            </span>
            <span className="cr-headline-text">
              committed validators reproduced the foundation&apos;s result
            </span>
          </div>
          <div
            className="cr-bar"
            role="img"
            aria-label={`${tally.matching} of ${tally.committed} committed validators reproduced the foundation's result; ${tally.divergent} diverged, ${tally.committedNoReveal} did not reveal`}
          >
            {segments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <div
                  key={segment.key}
                  className={`cr-bar-seg cr-seg-${segment.key}`}
                  style={{
                    width: `${(segment.value / tally.committed) * 100}%`,
                  }}
                />
              ))}
          </div>
          <dl className="cr-legend">
            {segments.map((segment) => (
              <div className="cr-legend-row" key={segment.key}>
                <dt>
                  <span className={`cr-swatch cr-seg-${segment.key}`} />
                  {segment.label}
                </dt>
                <dd>{segment.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="audit-card-hint">
          No validators committed to this round on chain.
        </p>
      )}
    </section>
  )
}
