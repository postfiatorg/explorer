import { VerificationHashes } from '../Network/scoringUtils'

// On-chain memo type strings emitted by the Dynamic UNL commit-reveal protocol.
// The announcement type is also surfaced in /api/scoring/config; the commit and
// reveal types are protocol constants the foundation never varies per round.
export const ANNOUNCEMENT_MEMO_TYPE = 'pf_dynamic_unl_round_announcement_v1'
export const COMMIT_MEMO_TYPE = 'pf_dynamic_unl_validator_commit_v1'
export const REVEAL_MEMO_TYPE = 'pf_dynamic_unl_validator_reveal_v1'

interface RawMemo {
  Memo?: {
    MemoType?: string
    MemoData?: string
  }
}

export interface MemoTx {
  hash?: string
  Memos?: RawMemo[]
}

export interface AnnouncementPayload {
  round_number?: number
  input_package_hash?: string
  input_package_cid?: string
  commit_opens_at?: string
  commit_closes_at?: string
  reveal_opens_at?: string
  reveal_closes_at?: string
}

export interface CommitPayload {
  round_number?: number
  validator_master_key?: string
  input_package_hash?: string
  commitment_hash?: string
}

export interface RevealPayload {
  round_number?: number
  validator_master_key?: string
  input_package_hash?: string
  output_hashes?: VerificationHashes
}

export interface RoundMemos {
  announcement: { txHash: string; payload: AnnouncementPayload } | null
  commits: CommitPayload[]
  reveals: RevealPayload[]
}

export type RevealMatch = 'matching' | 'divergent'

export interface ParticipationTally {
  committed: number
  revealed: number
  matching: number
  divergent: number
  committedNoReveal: number
}

export const hexToUtf8 = (hex: string | undefined): string | null => {
  if (!hex) return null
  const cleaned = hex.replace(/[^0-9a-fA-F]/g, '')
  if (cleaned.length === 0 || cleaned.length % 2 !== 0) return null
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16)
  }
  try {
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return null
  }
}

const parseMemoData = <T>(memoDataHex: string | undefined): T | null => {
  const text = hexToUtf8(memoDataHex)
  if (text === null) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

interface RoundMemoSources {
  transactions: MemoTx[]
  roundNumber: number
  announcementType: string
}

// Walk an account's transactions, decode each commit-reveal memo, and keep only
// those tagged with the requested round. The on-chain sender is a relay wallet,
// so validator identity is taken from `validator_master_key` inside the memo,
// never from the transaction account.
export const collectRoundMemos = ({
  transactions,
  roundNumber,
  announcementType,
}: RoundMemoSources): RoundMemos => {
  const result: RoundMemos = {
    announcement: null,
    commits: [],
    reveals: [],
  }

  transactions.forEach((tx) => {
    const memos = tx.Memos ?? []
    memos.forEach((entry) => {
      const memoType = hexToUtf8(entry.Memo?.MemoType)
      if (!memoType) return

      if (memoType === COMMIT_MEMO_TYPE) {
        const payload = parseMemoData<CommitPayload>(entry.Memo?.MemoData)
        if (payload?.round_number === roundNumber) result.commits.push(payload)
        return
      }

      if (memoType === REVEAL_MEMO_TYPE) {
        const payload = parseMemoData<RevealPayload>(entry.Memo?.MemoData)
        if (payload?.round_number === roundNumber) result.reveals.push(payload)
        return
      }

      if (memoType === announcementType && !result.announcement && tx.hash) {
        const payload = parseMemoData<AnnouncementPayload>(entry.Memo?.MemoData)
        if (payload?.round_number === roundNumber) {
          result.announcement = { txHash: tx.hash, payload }
        }
      }
    })
  })

  return result
}

const hashesEqual = (
  a: VerificationHashes | undefined,
  b: VerificationHashes | undefined,
): boolean => {
  if (!a || !b) return false
  const fields: (keyof VerificationHashes)[] = [
    'model_response_hash',
    'validator_scores_hash',
    'selected_unl_hash',
  ]
  return fields.every((field) => Boolean(a[field]) && a[field] === b[field])
}

export const classifyReveal = (
  reveal: RevealPayload,
  foundationHashes: VerificationHashes | null | undefined,
): RevealMatch =>
  hashesEqual(reveal.output_hashes, foundationHashes ?? undefined)
    ? 'matching'
    : 'divergent'

// Tally participation over the validators observed committing on chain. The
// denominator is the set of distinct committing validators — never an assumed
// roster, since commit-reveal participation is open. `committedNoReveal` is only
// counted once the reveal window has closed; before then those validators may
// still reveal.
export const tallyParticipation = (
  memos: RoundMemos,
  foundationHashes: VerificationHashes | null | undefined,
  revealWindowClosed: boolean,
): ParticipationTally => {
  const committedKeys = new Set(
    memos.commits
      .map((commit) => commit.validator_master_key)
      .filter((key): key is string => Boolean(key)),
  )

  const revealByKey = new Map<string, RevealPayload>()
  memos.reveals.forEach((reveal) => {
    const key = reveal.validator_master_key
    if (key && committedKeys.has(key)) revealByKey.set(key, reveal)
  })

  let matching = 0
  revealByKey.forEach((reveal) => {
    if (classifyReveal(reveal, foundationHashes) === 'matching') matching += 1
  })

  const committed = committedKeys.size
  const revealed = revealByKey.size
  const divergent = revealed - matching
  const committedNoReveal = revealWindowClosed
    ? Math.max(0, committed - revealed)
    : 0

  return { committed, revealed, matching, divergent, committedNoReveal }
}
