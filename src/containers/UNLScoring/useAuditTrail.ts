import { useContext } from 'react'
import { useQuery } from 'react-query'
import { ScoringRoundMeta, fetchJsonOrNull } from '../Network/scoringUtils'
import SocketContext from '../shared/SocketContext'
import { getTransaction } from '../../rippled'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

// Ripple Epoch starts 2000-01-01T00:00:00Z; offset to Unix epoch in seconds.
const RIPPLE_EPOCH_OFFSET_SECONDS = 946684800

// Scoring-service VLs are v2 format — the signed payload lives in
// `blobs_v2[0].blob` rather than a top-level `blob` field. Fall back to the
// legacy location so this continues to work if the service ever emits a v1.
interface VLBlobEntry {
  blob?: string
}

interface VLJsonEnvelope {
  blob?: string
  blobs_v2?: VLBlobEntry[]
}

interface VLBlobPayload {
  sequence?: number
  effective?: number
  expiration?: number
}

export interface AuditTrailData {
  vlEffectiveIso: string | null
  vlExpiresIso: string | null
  memoLedger: number | null
  memoBodyText: string | null
  vlJsonAvailable: boolean
}

const decodeVlBlob = (envelope: VLJsonEnvelope): VLBlobPayload | null => {
  const blob = envelope.blobs_v2?.[0]?.blob ?? envelope.blob
  if (!blob) return null
  try {
    const decoded =
      typeof atob === 'function'
        ? atob(blob)
        : Buffer.from(blob, 'base64').toString('utf-8')
    return JSON.parse(decoded) as VLBlobPayload
  } catch {
    return null
  }
}

const rippleEpochToIso = (seconds: number | undefined): string | null => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null
  const ms = (seconds + RIPPLE_EPOCH_OFFSET_SECONDS) * 1000
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const hexToUtf8 = (hex: string): string | null => {
  try {
    const cleaned = hex.replace(/[^0-9a-fA-F]/g, '')
    if (cleaned.length % 2 !== 0) return null
    const bytes = new Uint8Array(cleaned.length / 2)
    for (let i = 0; i < cleaned.length; i += 2) {
      bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16)
    }
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes)
    }
    return String.fromCharCode(...bytes)
  } catch {
    return null
  }
}

interface RippledTxResult {
  raw?: {
    ledger_index?: number
    Memos?: Array<{ Memo?: { MemoData?: string } }>
  }
}

export const useAuditTrail = (
  round: ScoringRoundMeta | null,
): AuditTrailData => {
  const rippledSocket = useContext(SocketContext)

  const hasCid = Boolean(round?.ipfs_cid)
  const hasMemo = Boolean(round?.memo_tx_hash)
  const roundNumber = round?.round_number

  const { data: vlEnvelope, status: vlStatus } =
    useQuery<VLJsonEnvelope | null>(
      ['scoring-vl', roundNumber],
      () =>
        fetchJsonOrNull<VLJsonEnvelope>(
          `/api/scoring/rounds/${roundNumber}/vl.json`,
        ),
      {
        enabled: typeof roundNumber === 'number' && hasCid,
        staleTime: TWENTY_FOUR_HOURS_MS,
        retry: false,
      },
    )

  const { data: tx } = useQuery<RippledTxResult | null>(
    ['scoring-memo-tx', round?.memo_tx_hash],
    async () => {
      if (!round?.memo_tx_hash || !rippledSocket) return null
      try {
        const result = await getTransaction(round.memo_tx_hash, rippledSocket)
        return result as RippledTxResult
      } catch {
        return null
      }
    },
    {
      enabled: hasMemo && Boolean(rippledSocket),
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const blob = vlEnvelope ? decodeVlBlob(vlEnvelope) : null
  const vlEffectiveIso = blob ? rippleEpochToIso(blob.effective) : null
  const vlExpiresIso = blob ? rippleEpochToIso(blob.expiration) : null

  const memoLedger =
    typeof tx?.raw?.ledger_index === 'number' ? tx.raw.ledger_index : null
  const memoHex = tx?.raw?.Memos?.[0]?.Memo?.MemoData
  const memoBodyText = memoHex ? hexToUtf8(memoHex) : null

  return {
    vlEffectiveIso,
    vlExpiresIso,
    memoLedger,
    memoBodyText,
    vlJsonAvailable: vlStatus === 'success' && vlEnvelope !== null,
  }
}
