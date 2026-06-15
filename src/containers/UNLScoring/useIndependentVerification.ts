import { useContext } from 'react'
import { useQuery } from 'react-query'
import SocketContext from '../shared/SocketContext'
import {
  ScoringConfig,
  ScoringRoundMeta,
  VerificationHashes,
  fetchJsonOrNull,
} from '../Network/scoringUtils'
import {
  ANNOUNCEMENT_MEMO_TYPE,
  MemoTx,
  ParticipationTally,
  RoundMemos,
  collectRoundMemos,
  tallyParticipation,
} from './commitReveal'

const ONE_HOUR_MS = 60 * 60 * 1000
const FIVE_MINUTES_MS = 5 * 60 * 1000

// Bounds on the backward account_tx walk. Recent rounds resolve in the first
// page; the cap stops a runaway scan when an old round sits deep behind many
// newer rounds' commit-reveal traffic.
const PAGE_LIMIT = 200
const MAX_PAGES = 15

// Caps the scan so a configured-but-unreachable archive node surfaces an
// explanatory note instead of spinning indefinitely.
const SCAN_TIMEOUT_MS = 20 * 1000

export type IndependentVerificationStatus =
  | 'loading'
  | 'no_archive'
  | 'unavailable'
  | 'error'
  | 'ready'

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('scan timed out')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export interface IndependentVerificationResult {
  status: IndependentVerificationStatus
  announcementTxHash: string | null
  commitOpensAt: string | null
  commitClosesAt: string | null
  revealOpensAt: string | null
  revealClosesAt: string | null
  revealWindowClosed: boolean
  tally: ParticipationTally | null
}

const EMPTY: Omit<IndependentVerificationResult, 'status'> = {
  announcementTxHash: null,
  commitOpensAt: null,
  commitClosesAt: null,
  revealOpensAt: null,
  revealClosesAt: null,
  revealWindowClosed: false,
  tally: null,
}

export interface VerificationGateFlags {
  loadingConfig: boolean
  hasPublisher: boolean
  enabled: boolean
  isError: boolean
  isLoading: boolean
  hasData: boolean
}

// Resolves the section's status before the scan result is consulted. An old
// backend (no publisher address) hides the section entirely. Returns null once
// the query has settled with data, in which case the caller returns the scan
// result, which carries its own status (`ready` / `unavailable` / `no_archive`).
export const resolveVerificationStatus = (
  flags: VerificationGateFlags,
): IndependentVerificationStatus | null => {
  if (flags.loadingConfig) return 'loading'
  if (!flags.hasPublisher) return 'unavailable'
  if (!flags.enabled) return 'unavailable'
  if (flags.isError) return 'error'
  if (flags.isLoading || !flags.hasData) return 'loading'
  return null
}

interface AccountTxEntry {
  tx?: { hash?: string; Memos?: MemoTx['Memos'] }
  tx_json?: { Memos?: MemoTx['Memos'] }
  hash?: string
}

interface AccountTxResponse {
  transactions?: AccountTxEntry[]
  marker?: unknown
  error_message?: string
}

const normalizeEntry = (entry: AccountTxEntry): MemoTx => {
  const tx = entry.tx ?? entry.tx_json ?? {}
  return {
    hash: entry.hash ?? entry.tx?.hash,
    Memos: tx.Memos,
  }
}

interface ScanSocket {
  send: (request: object) => Promise<AccountTxResponse>
}

interface ScanArgs {
  mainSocket: ScanSocket
  archiveSocket: ScanSocket | null
  publisher: string
  roundNumber: number
  announcementType: string
  foundationHashes: VerificationHashes
}

// Walk a single account's transactions newest→oldest, collecting the round's
// commit-reveal memos. The announcement is published at input-freeze, before
// any commit or reveal, so reaching it means the round's traffic is fully
// collected and the walk can stop.
const scanAccount = async (
  socket: ScanSocket,
  publisher: string,
  roundNumber: number,
  announcementType: string,
): Promise<RoundMemos> => {
  const aggregate: RoundMemos = { announcement: null, commits: [], reveals: [] }
  let marker: unknown

  for (let page = 0; page < MAX_PAGES; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await socket.send({
      command: 'account_tx',
      account: publisher,
      ledger_index_min: -1,
      ledger_index_max: -1,
      limit: PAGE_LIMIT,
      forward: false,
      marker,
    })

    if (resp.error_message) break

    const transactions = (resp.transactions ?? []).map(normalizeEntry)
    const memos = collectRoundMemos({
      transactions,
      roundNumber,
      announcementType,
    })
    aggregate.commits.push(...memos.commits)
    aggregate.reveals.push(...memos.reveals)
    if (!aggregate.announcement && memos.announcement) {
      aggregate.announcement = memos.announcement
    }

    if (aggregate.announcement || !resp.marker) break
    marker = resp.marker
  }

  return aggregate
}

const scanParticipation = async ({
  mainSocket,
  archiveSocket,
  publisher,
  roundNumber,
  announcementType,
  foundationHashes,
}: ScanArgs): Promise<IndependentVerificationResult> => {
  // Recent rounds live in the main node's retained window, so try it first —
  // no archive node is needed for them. Fall back to the archive only when the
  // round is older than the main node's history.
  let memos = await scanAccount(
    mainSocket,
    publisher,
    roundNumber,
    announcementType,
  )
  if (!memos.announcement && archiveSocket) {
    memos = await scanAccount(
      archiveSocket,
      publisher,
      roundNumber,
      announcementType,
    )
  }

  if (!memos.announcement) {
    // Not in the main node's window. With an archive node, full history was
    // searched, so the round genuinely has no commit-reveal activity (hidden);
    // without one, older history is unreachable (explanatory note).
    return { status: archiveSocket ? 'unavailable' : 'no_archive', ...EMPTY }
  }

  const { payload, txHash } = memos.announcement
  const revealClosesAt = payload.reveal_closes_at ?? null
  const revealWindowClosed = revealClosesAt
    ? Date.parse(revealClosesAt) < Date.now()
    : false

  return {
    status: 'ready',
    announcementTxHash: txHash,
    commitOpensAt: payload.commit_opens_at ?? null,
    commitClosesAt: payload.commit_closes_at ?? null,
    revealOpensAt: payload.reveal_opens_at ?? null,
    revealClosesAt,
    revealWindowClosed,
    tally: tallyParticipation(memos, foundationHashes, revealWindowClosed),
  }
}

// Builds the commit-reveal participation view for a round by scanning the
// foundation publisher account. Recent rounds resolve on the main node; the
// archive node (when configured) extends coverage to older rounds.
export const useIndependentVerification = (
  round: ScoringRoundMeta | null,
  foundationHashes: VerificationHashes | null,
): IndependentVerificationResult => {
  const rippledSocket = useContext(SocketContext)
  const archiveSocket = rippledSocket?.archiveSocket ?? null

  const { data: config, isLoading: loadingConfig } =
    useQuery<ScoringConfig | null>(
      ['scoring-config'],
      () => fetchJsonOrNull<ScoringConfig>('/api/scoring/config'),
      { staleTime: ONE_HOUR_MS, retry: false },
    )

  const publisher = config?.foundation_publisher_address
  const announcementType =
    config?.announcement_memo_type ?? ANNOUNCEMENT_MEMO_TYPE
  const roundNumber = round?.round_number

  const enabled =
    Boolean(rippledSocket) &&
    Boolean(publisher) &&
    Boolean(foundationHashes) &&
    typeof roundNumber === 'number'

  const { data, isLoading, isError } = useQuery<IndependentVerificationResult>(
    ['cr-participation', roundNumber, publisher, announcementType],
    () =>
      withTimeout(
        scanParticipation({
          mainSocket: rippledSocket as ScanSocket,
          archiveSocket: archiveSocket as ScanSocket | null,
          publisher: publisher as string,
          roundNumber: roundNumber as number,
          announcementType,
          foundationHashes: foundationHashes as VerificationHashes,
        }),
        SCAN_TIMEOUT_MS,
      ),
    {
      enabled,
      staleTime: FIVE_MINUTES_MS,
      retry: false,
    },
  )

  const gate = resolveVerificationStatus({
    loadingConfig,
    hasPublisher: Boolean(publisher),
    enabled,
    isError,
    isLoading,
    hasData: Boolean(data),
  })
  if (gate) return { status: gate, ...EMPTY }
  return data as IndependentVerificationResult
}
