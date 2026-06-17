import { FC, ReactNode, useCallback, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { CopyableAddress } from '../shared/components/CopyableAddress/CopyableAddress'
import {
  ScoringRoundMeta,
  getRoundBundleCid,
  getRoundInputPackageCid,
  isMemoFailedPublishedRound,
} from '../Network/scoringUtils'
import { useAuditTrail } from './useAuditTrail'
import { useIndependentVerification } from './useIndependentVerification'
import { IndependentVerification } from './IndependentVerification'

interface AuditTrailPanelProps {
  round: ScoringRoundMeta
  supersedingRound?: ScoringRoundMeta | null
}

// Both devnet and testnet pin artifacts to the same shared IPFS gateway, so
// this hostname is constant regardless of VITE_ENVIRONMENT. If/when mainnet
// gets its own gateway, this becomes environment-driven.
const IPFS_PRIMARY_HOST = 'ipfs-testnet.postfiat.org'
const PINATA_GATEWAY_HOST = 'gateway.pinata.cloud'

const ipfsUrl = (host: string, cid: string): string =>
  `https://${host}/ipfs/${cid}`

const VERIFICATION_HASH_FIELDS = [
  { key: 'model_response_hash', label: 'Model response' },
  { key: 'validator_scores_hash', label: 'Validator scores' },
  { key: 'selected_unl_hash', label: 'Selected UNL' },
] as const

const formatUtcTimestamp = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  const Y = date.getUTCFullYear()
  const M = pad(date.getUTCMonth() + 1)
  const D = pad(date.getUTCDate())
  const h = pad(date.getUTCHours())
  const m = pad(date.getUTCMinutes())
  return `${Y}-${M}-${D} ${h}:${m} UTC`
}

const formatExpiresRelative = (
  iso: string | null,
  from: Date = new Date(),
): string => {
  if (!iso) return ''
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return ''
  const diffDays = Math.round(
    (target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
  )
  const tail = ', or when the next round publishes'
  if (diffDays === 0) return `(today${tail})`
  if (diffDays > 0) {
    return `(in ${diffDays} day${diffDays === 1 ? '' : 's'}${tail})`
  }
  const ago = -diffDays
  return `(${ago} day${ago === 1 ? '' : 's'} ago${tail})`
}

const formatLedger = (ledger: number | null): string => {
  if (ledger === null) return '—'
  return ledger.toLocaleString('en-US')
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

const MemoBody: FC<{ raw: string }> = ({ raw }) => {
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      return raw
    }
  }, [raw])

  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(pretty)
    setCopied(true)
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [pretty])

  return (
    <div className="audit-trail-memo-wrap">
      <pre className="audit-trail-memo-body">{pretty}</pre>
      <button
        type="button"
        className="audit-trail-memo-copy"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        aria-label={copied ? 'Copied to clipboard' : 'Copy memo to clipboard'}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

// PostFiat gateway is the primary; Pinata is offered as a manual fallback the
// user can click if the primary is unreachable. These are plain external links
// — Explorer fetches round data through its own /api/scoring proxy, not through
// these gateways — so there is nothing to fall back to automatically.
const GatewayLinks: FC<{ cid: string; children?: ReactNode }> = ({
  cid,
  children,
}) => (
  <div className="audit-trail-links">
    <a
      className="audit-gateway-link"
      href={ipfsUrl(IPFS_PRIMARY_HOST, cid)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open on IPFS
    </a>
    <a
      className="audit-gateway-alt"
      href={ipfsUrl(PINATA_GATEWAY_HOST, cid)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Pinata
    </a>
    {children}
  </div>
)

const Field: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <div className="audit-card-field">
    <span className="audit-card-key">{label}</span>
    <span className="audit-card-value">{children}</span>
  </div>
)

const auditTitleFor = (round: ScoringRoundMeta): string =>
  round.override_type ? 'OVERRIDE AUDIT TRAIL' : 'AUDIT TRAIL'

const PlaceholderPanel: FC<{ round: ScoringRoundMeta }> = ({ round }) => (
  <div className="audit-trail dashboard-panel">
    <h2 className="audit-trail-title">{auditTitleFor(round)}</h2>
    <p className="audit-trail-placeholder">
      No audit trail — round did not publish. See the Round navigation strip
      above for the failure stage, and the Header banner for the error message.
    </p>
  </div>
)

export const AuditTrailPanel: FC<AuditTrailPanelProps> = ({
  round,
  supersedingRound = null,
}) => {
  const {
    vlEffectiveIso,
    vlExpiresIso,
    memoLedger,
    memoBodyText,
    signedVl,
    verificationHashes,
  } = useAuditTrail(round)
  const verification = useIndependentVerification(round, verificationHashes)
  const cid = getRoundBundleCid(round)
  const inputCid = getRoundInputPackageCid(round)

  if (round.status === 'FAILED' || !cid) {
    return <PlaceholderPanel round={round} />
  }

  const memoTxLink = round.memo_tx_hash
    ? `/transactions/${round.memo_tx_hash}`
    : null
  const showMemoFailure =
    isMemoFailedPublishedRound(round) && !round.memo_tx_hash
  const handleDownloadSignedVl = () => {
    if (!signedVl) return
    downloadJson(signedVl, `round-${round.round_number}-vl.json`)
  }

  const reproducibleHashes = VERIFICATION_HASH_FIELDS.flatMap((field) => {
    const value = verificationHashes?.[field.key]
    return value ? [{ label: field.label, value }] : []
  })

  const outputsCard = (
    <section className="audit-trail-card">
      <h3 className="audit-card-title">
        <span className="audit-card-dot audit-card-dot-out" />
        Published outputs
      </h3>
      <div className="audit-card-field">
        <span className="audit-card-key">Final bundle CID</span>
        <div className="audit-trail-cid">
          <CopyableAddress address={cid} />
        </div>
      </div>
      <Field label="VL sequence">
        {round.vl_sequence ?? '—'}
        {vlEffectiveIso && (
          <span className="audit-card-muted">
            {' '}
            · effective {formatUtcTimestamp(vlEffectiveIso)}
          </span>
        )}
      </Field>
      {supersedingRound ? (
        <Field label="Expired">
          {formatUtcTimestamp(supersedingRound.completed_at)}
          <span className="audit-card-muted">
            {' '}
            (when round #{supersedingRound.round_number} completed)
          </span>
        </Field>
      ) : (
        <Field label="Expires">
          {formatUtcTimestamp(vlExpiresIso)}
          <span className="audit-card-muted">
            {' '}
            {formatExpiresRelative(vlExpiresIso)}
          </span>
        </Field>
      )}
      <GatewayLinks cid={cid}>
        <span className="audit-trail-sep" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          className="audit-gateway-alt"
          onClick={handleDownloadSignedVl}
          disabled={!signedVl}
        >
          Download vl.json
        </button>
      </GatewayLinks>
    </section>
  )

  return (
    <div className="audit-trail dashboard-panel">
      <h2 className="audit-trail-title">{auditTitleFor(round)}</h2>
      {round.override_type && (
        <p className="audit-trail-note">
          Manual override round. Score artifacts are not expected.
        </p>
      )}

      {inputCid ? (
        <div className="audit-trail-cols">
          <section className="audit-trail-card">
            <h3 className="audit-card-title">
              <span className="audit-card-dot audit-card-dot-in" />
              Frozen inputs
            </h3>
            <Field label="Frozen at">
              {formatUtcTimestamp(round.input_frozen_at)}
            </Field>
            <div className="audit-card-field">
              <span className="audit-card-key">Input package CID</span>
              <div className="audit-trail-cid">
                <CopyableAddress address={inputCid} />
              </div>
            </div>
            {round.input_package_hash && (
              <div className="audit-card-field">
                <span className="audit-card-key">Package hash</span>
                <span className="audit-trail-cid">
                  {round.input_package_hash}
                </span>
              </div>
            )}
            <GatewayLinks cid={inputCid} />
          </section>
          {outputsCard}
        </div>
      ) : (
        outputsCard
      )}

      {reproducibleHashes.length > 0 && (
        <section className="audit-trail-section">
          <span className="audit-trail-label">Reproducible output hashes</span>
          <table className="audit-hash-table">
            <thead>
              <tr>
                <th>Output</th>
                <th>SHA-256</th>
              </tr>
            </thead>
            <tbody>
              {reproducibleHashes.map((entry) => (
                <tr key={entry.label}>
                  <td>{entry.label}</td>
                  <td className="audit-hash-cell">{entry.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <IndependentVerification result={verification} />

      {round.memo_tx_hash && (
        <section className="audit-trail-section">
          <span className="audit-trail-label">On-chain memo</span>
          <dl className="audit-trail-grid">
            <dt>Tx hash</dt>
            <dd>
              {memoTxLink ? (
                <a
                  className="audit-trail-hash-link"
                  href={memoTxLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {round.memo_tx_hash}
                </a>
              ) : (
                '—'
              )}
            </dd>
            <dt>Ledger</dt>
            <dd>{formatLedger(memoLedger)}</dd>
            <dt>Memo</dt>
            <dd>
              {memoBodyText ? (
                <MemoBody raw={memoBodyText} />
              ) : (
                <span className="audit-trail-muted">
                  Not loaded (ledger node may be unreachable)
                </span>
              )}
            </dd>
          </dl>
        </section>
      )}

      {showMemoFailure && (
        <section className="audit-trail-section">
          <span className="audit-trail-label">On-chain memo</span>
          <p className="audit-trail-memo-warning">
            Memo publication failed after the VL was published. No memo
            transaction was anchored for this round.
          </p>
          {round.error_message && (
            <p className="audit-trail-memo-warning-error">
              {round.error_message}
            </p>
          )}
        </section>
      )}

      {round.override_type && round.override_reason && (
        <section className="audit-trail-section">
          <span className="audit-trail-label">Override reason</span>
          <p className="audit-trail-value audit-trail-override">
            {round.override_reason}
          </p>
        </section>
      )}
    </div>
  )
}
