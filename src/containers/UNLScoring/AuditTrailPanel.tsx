import { FC, useCallback, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { CopyableAddress } from '../shared/components/CopyableAddress/CopyableAddress'
import {
  ScoringRoundMeta,
  isMemoFailedPublishedRound,
} from '../Network/scoringUtils'
import { useAuditTrail } from './useAuditTrail'

interface AuditTrailPanelProps {
  round: ScoringRoundMeta
  supersedingRound?: ScoringRoundMeta | null
}

// Both devnet and testnet pin artifacts to the same shared IPFS gateway, so
// this hostname is constant regardless of VITE_ENVIRONMENT. If/when mainnet
// gets its own gateway, this becomes environment-driven.
const IPFS_PRIMARY_HOST = 'ipfs-testnet.postfiat.org'

const formatUtcTimestamp = (iso: string | null): string => {
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

const GatewayLink: FC<{ label: string; href: string }> = ({ label, href }) => (
  <a
    className="audit-gateway-link"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
  >
    {label}
  </a>
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
  const { vlEffectiveIso, vlExpiresIso, memoLedger, memoBodyText } =
    useAuditTrail(round)

  if (round.status === 'FAILED' || !round.ipfs_cid) {
    return <PlaceholderPanel round={round} />
  }

  const cid = round.ipfs_cid
  const ipfsPrimaryUrl = `https://${IPFS_PRIMARY_HOST}/ipfs/${cid}`
  const pinataUrl = `https://gateway.pinata.cloud/ipfs/${cid}`
  const vlDownloadUrl = `/api/scoring/rounds/${round.round_number}/vl.json`
  const memoTxLink = round.memo_tx_hash
    ? `/transactions/${round.memo_tx_hash}`
    : null
  const showMemoFailure =
    isMemoFailedPublishedRound(round) && !round.memo_tx_hash

  return (
    <div className="audit-trail dashboard-panel">
      <h2 className="audit-trail-title">{auditTitleFor(round)}</h2>
      {round.override_type && (
        <p className="audit-trail-note">
          Manual override round. Score artifacts are not expected.
        </p>
      )}

      <section className="audit-trail-section">
        <span className="audit-trail-label">IPFS CID</span>
        <div className="audit-trail-value audit-trail-cid">
          <CopyableAddress address={cid} />
        </div>
        <div className="audit-trail-links">
          <GatewayLink
            label={`Open on ${IPFS_PRIMARY_HOST}`}
            href={ipfsPrimaryUrl}
          />
          <GatewayLink label="Open on Pinata gateway" href={pinataUrl} />
        </div>
      </section>

      <section className="audit-trail-section">
        <span className="audit-trail-label">Published VL</span>
        <dl className="audit-trail-grid">
          <dt>VL sequence</dt>
          <dd>{round.vl_sequence ?? '—'}</dd>
          <dt>Effective from</dt>
          <dd>{formatUtcTimestamp(vlEffectiveIso)}</dd>
          {supersedingRound ? (
            <>
              <dt>Expired</dt>
              <dd>
                {formatUtcTimestamp(supersedingRound.completed_at)}{' '}
                <span className="audit-trail-relative">
                  (when round #{supersedingRound.round_number} completed)
                </span>
              </dd>
            </>
          ) : (
            <>
              <dt>Expires</dt>
              <dd>
                {formatUtcTimestamp(vlExpiresIso)}{' '}
                <span className="audit-trail-relative">
                  {formatExpiresRelative(vlExpiresIso)}
                </span>
              </dd>
            </>
          )}
        </dl>
        <a
          className="audit-trail-download"
          href={vlDownloadUrl}
          download={`round-${round.round_number}-vl.json`}
        >
          Download vl.json (round #{round.round_number})
        </a>
      </section>

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
