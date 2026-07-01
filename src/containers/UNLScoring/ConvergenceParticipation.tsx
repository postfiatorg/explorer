import { FC } from 'react'
import {
  PUBLIC_IPFS_GATEWAY_HOST,
  ipfsProxyUrl,
  ipfsGatewayUrl,
} from '../Network/scoringUtils'
import { ValidatorMeta } from './RankedTable'
import {
  ConvergenceOutcome,
  ConvergenceParticipant,
  ConvergenceResult,
} from './useConvergence'
import { CommitRevealTimeline } from './CommitRevealTimeline'

// The sealed convergence bundle contains this single JSON report; linking to it
// opens readable data rather than the gateway's directory-index page.
const CONVERGENCE_REPORT_FILE = 'convergence_report.json'

// The reproducibility levels the convergence service compares, surfaced only on
// a divergence to show exactly where a validator's result parted from the
// foundation's.
const LEVELS = [
  { key: 'RAW', label: 'Raw' },
  { key: 'PARSED', label: 'Scores' },
  { key: 'SELECTED_UNL', label: 'UNL selection' },
] as const

// What a validator's row communicates, derived from the raw outcome plus whether
// the round has sealed. A live round's awaiting/missing reveal is still pending,
// so it reads as "awaiting"; once the round is finalized the same outcome is a
// terminal miss. Divergence remains the adversarial signal and is always called
// out.
type DisplayStatus = 'reproduced' | 'diverged' | 'awaiting' | 'incomplete'
type StatusTone = 'ok' | 'bad' | 'wait' | 'none'

const TONE_BY_STATUS: Record<DisplayStatus, StatusTone> = {
  reproduced: 'ok',
  diverged: 'bad',
  awaiting: 'wait',
  incomplete: 'none',
}

const DISC_GLYPH: Record<StatusTone, string> = {
  ok: '✓',
  bad: '✕',
  wait: '',
  none: '–',
}

const INCOMPLETE_LABEL: Partial<Record<ConvergenceOutcome, string>> = {
  awaiting_reveal: 'No reveal',
  missing_reveal: 'No reveal',
  late: 'Late reveal',
  commitment_mismatch: 'Commitment mismatch',
  announcement_mismatch: 'Announcement mismatch',
  signature_invalid: 'Invalid signature',
}

const deriveStatus = (
  outcome: ConvergenceOutcome,
  finalized: boolean,
): DisplayStatus => {
  if (outcome === 'valid') return 'reproduced'
  if (outcome === 'divergent') return 'diverged'
  if (
    !finalized &&
    (outcome === 'awaiting_reveal' ||
      outcome === 'missing_reveal' ||
      outcome === 'late')
  ) {
    return 'awaiting'
  }
  return 'incomplete'
}

const statusLabel = (
  status: DisplayStatus,
  outcome: ConvergenceOutcome,
): string => {
  if (status === 'reproduced') return 'Matched'
  if (status === 'diverged') return 'Diverged'
  if (status === 'awaiting') return 'Awaiting reveal'
  return INCOMPLETE_LABEL[outcome] ?? 'No reveal'
}

const shortenKey = (key: string): string =>
  key.length > 18 ? `${key.slice(0, 12)}…${key.slice(-4)}` : key

const shortenHash = (hash: string): string =>
  hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')

// Shown in the viewer's local timezone (no explicit label) so the "Final" seal
// time matches the local window times in the commit/reveal timeline below.
const formatLocalDateTime = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

const parseMatchedLevels = (raw: string | null | undefined): Set<string> =>
  new Set(
    (raw ?? '')
      .split(',')
      .map((level) => level.trim())
      .filter((level) => level.length > 0),
  )

interface StatusCounts {
  reproduced: number
  diverged: number
  awaiting: number
  incomplete: number
}

const tallyStatuses = (
  participants: ConvergenceParticipant[],
  finalized: boolean,
): StatusCounts =>
  participants.reduce<StatusCounts>(
    (acc, participant) => {
      acc[deriveStatus(participant.outcome, finalized)] += 1
      return acc
    },
    { reproduced: 0, diverged: 0, awaiting: 0, incomplete: 0 },
  )

const Headline: FC<{
  counts: StatusCounts
  committed: number
  finalized: boolean
}> = ({ counts, committed, finalized }) => {
  const { reproduced, diverged, awaiting, incomplete } = counts

  // Pre-reveal: validators have committed but none has revealed yet. Framing it
  // as "0 of N reproduced" reads as a failure, so name the phase instead.
  if (
    !finalized &&
    reproduced === 0 &&
    diverged === 0 &&
    awaiting === committed
  ) {
    return (
      <p className="cr-line">
        <strong>{committed}</strong>{' '}
        {committed === 1 ? 'validator' : 'validators'} committed on chain —
        awaiting {committed === 1 ? 'its reveal' : 'their reveals'}.
      </p>
    )
  }

  if (reproduced === committed) {
    return (
      <p className="cr-line">
        <strong>
          {reproduced} of {committed}
        </strong>{' '}
        {finalized ? (
          <>
            validators revealed hashes matching the foundation output.{' '}
            <span className="cr-ok">Shadow verification sealed.</span>
          </>
        ) : (
          <>
            validators revealed hashes matching the{' '}
            <span className="cr-ok">foundation output</span>.
          </>
        )}
      </p>
    )
  }

  return (
    <p className="cr-line">
      <strong>
        {reproduced} of {committed}
      </strong>{' '}
      validators <span className="cr-ok">matched</span> the foundation output
      {diverged > 0 && (
        <>
          {' · '}
          <span className="cr-bad">{diverged} diverged</span>
        </>
      )}
      {awaiting > 0 && ` · ${awaiting} awaiting reveal`}
      {incomplete > 0 && ` · ${incomplete} no reveal`}.
    </p>
  )
}

const ParticipationBar: FC<{ counts: StatusCounts; committed: number }> = ({
  counts,
  committed,
}) => {
  const widthOf = (n: number) => `${(n / committed) * 100}%`
  return (
    <div
      className="cr-bar"
      role="img"
      aria-label={`${counts.reproduced} of ${committed} committed validators matched the foundation output; ${counts.diverged} diverged`}
    >
      {counts.reproduced > 0 && (
        <div
          className="cr-bar-seg cr-seg-ok"
          style={{ width: widthOf(counts.reproduced) }}
        />
      )}
      {counts.diverged > 0 && (
        <div
          className="cr-bar-seg cr-seg-bad"
          style={{ width: widthOf(counts.diverged) }}
        />
      )}
    </div>
  )
}

// Renders domain + key when metadata is present, key alone otherwise. The key
// stays gray whether or not a domain leads it; the whole identity links to the
// validator. Domain attestation is deliberately not surfaced here — the row's
// only verification signal is the reproduction-status disc.
const ValidatorIdentity: FC<{
  masterKey: string
  meta?: ValidatorMeta
}> = ({ masterKey, meta }) => {
  const href = `/validators/${masterKey}`
  const keyLink = (
    <a
      className="cr-key"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={masterKey}
    >
      {shortenKey(masterKey)}
    </a>
  )

  if (!meta?.domain) {
    return <span className="cr-ident">{keyLink}</span>
  }

  return (
    <span className="cr-ident">
      <a
        className="cr-dom"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {meta.domain}
      </a>
      {keyLink}
    </span>
  )
}

const DivergenceDetail: FC<{ levelsMatched: string | null | undefined }> = ({
  levelsMatched,
}) => {
  const matched = parseMatchedLevels(levelsMatched)
  return (
    <div className="cr-diverge">
      {LEVELS.map((level) => {
        const ok = matched.has(level.key)
        return (
          <span key={level.key} className="cr-lev">
            {level.label}{' '}
            <span className={ok ? 'cr-lev-y' : 'cr-lev-n'}>
              {ok ? 'match' : 'differs'}
            </span>
          </span>
        )
      })}
    </div>
  )
}

const ParticipantRow: FC<{
  participant: ConvergenceParticipant
  finalized: boolean
  meta?: ValidatorMeta
}> = ({ participant, finalized, meta }) => {
  const status = deriveStatus(participant.outcome, finalized)
  const tone = TONE_BY_STATUS[status]

  return (
    <>
      <div className="cr-row" data-testid="cr-participant">
        <span className={`cr-disc cr-disc-${tone}`} aria-hidden="true">
          {DISC_GLYPH[tone]}
        </span>
        <ValidatorIdentity
          masterKey={participant.validator_master_key}
          meta={meta}
        />
        <span className={`cr-word cr-word-${tone}`}>
          {statusLabel(status, participant.outcome)}
        </span>
      </div>
      {status === 'diverged' && (
        <DivergenceDetail
          levelsMatched={participant.comparison_levels_matched}
        />
      )}
    </>
  )
}

const SealedReport: FC<{
  cid: string
  anchorTxHash: string | null
}> = ({ cid, anchorTxHash }) => (
  <div className="cr-foot">
    <div className="cr-foot-field">
      <span className="audit-card-key">Sealed report</span>
      <div className="audit-trail-links">
        <a
          className="audit-gateway-link"
          href={ipfsProxyUrl(cid, CONVERGENCE_REPORT_FILE)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open on IPFS
        </a>
        <a
          className="audit-gateway-alt"
          href={ipfsGatewayUrl(
            PUBLIC_IPFS_GATEWAY_HOST,
            cid,
            CONVERGENCE_REPORT_FILE,
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          Public gateway
        </a>
      </div>
    </div>
    {anchorTxHash && (
      <div className="cr-foot-field">
        <span className="audit-card-key">Anchor tx</span>
        <a
          className="audit-trail-hash-link"
          href={`/transactions/${anchorTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          title={anchorTxHash}
        >
          {shortenHash(anchorTxHash)}
        </a>
      </div>
    )}
  </div>
)

interface ConvergenceParticipationProps {
  result: ConvergenceResult
  validatorMetaByKey?: Map<string, ValidatorMeta>
  // Frozen-input timestamp of the round — anchors the commit/reveal window
  // timeline. Absent on rounds that never froze an input package.
  frozenAt?: string | null
}

export const ConvergenceParticipation: FC<ConvergenceParticipationProps> = ({
  result,
  validatorMetaByKey,
  frozenAt,
}) => {
  if (result.status !== 'ready') return null

  const { participants, finalized } = result
  // Participants are exactly the validators observed committing on chain, so
  // their count is the committed denominator (summary.committers mirrors it).
  const committed = participants.length
  const counts = tallyStatuses(participants, finalized)
  const finalizedAt = finalized ? formatLocalDateTime(result.sealedAt) : ''

  return (
    <section className="audit-trail-section">
      <div className="cr-head">
        <span className="audit-trail-label">Shadow verification</span>
        {finalized ? (
          <span className="cr-final">
            <span className="cr-final-tag">Final</span>
            {finalizedAt && (
              <span className="cr-final-at">· {finalizedAt}</span>
            )}
          </span>
        ) : (
          <span className="cr-live-tag">
            <span className="cr-live-dot" aria-hidden="true" />
            Live
          </span>
        )}
      </div>

      <CommitRevealTimeline frozenAt={frozenAt} finalized={finalized} />

      {committed > 0 ? (
        <div className="cr-participation">
          <Headline
            counts={counts}
            committed={committed}
            finalized={finalized}
          />
          <ParticipationBar counts={counts} committed={committed} />
          <div className="cr-rows">
            {participants.map((participant) => (
              <ParticipantRow
                key={participant.validator_master_key}
                participant={participant}
                finalized={finalized}
                meta={validatorMetaByKey?.get(participant.validator_master_key)}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="audit-card-hint">
          No validators committed to this round on chain.
        </p>
      )}

      {finalized && result.convergenceBundleCid && (
        <SealedReport
          cid={result.convergenceBundleCid}
          anchorTxHash={result.anchorTxHash}
        />
      )}
    </section>
  )
}
