import {
  ANNOUNCEMENT_MEMO_TYPE,
  COMMIT_MEMO_TYPE,
  REVEAL_MEMO_TYPE,
  MemoTx,
  classifyReveal,
  collectRoundMemos,
  hexToUtf8,
  tallyParticipation,
} from './commitReveal'

const hex = (s: string) => Buffer.from(s, 'utf-8').toString('hex')

const memoTx = (type: string, payload: object, hash?: string): MemoTx => ({
  hash,
  Memos: [
    { Memo: { MemoType: hex(type), MemoData: hex(JSON.stringify(payload)) } },
  ],
})

const FOUNDATION = {
  model_response_hash: 'mr',
  validator_scores_hash: 'vs',
  selected_unl_hash: 'su',
}

describe('commitReveal hexToUtf8', () => {
  it('decodes hex to UTF-8 and rejects malformed input', () => {
    expect(hexToUtf8(hex('hello'))).toBe('hello')
    expect(hexToUtf8(undefined)).toBeNull()
    expect(hexToUtf8('abc')).toBeNull()
  })
})

describe('commitReveal collectRoundMemos', () => {
  const transactions: MemoTx[] = [
    memoTx(
      ANNOUNCEMENT_MEMO_TYPE,
      { round_number: 273, commit_opens_at: '2026-06-12T13:46:35Z' },
      'ANNHASH',
    ),
    memoTx(COMMIT_MEMO_TYPE, { round_number: 273, validator_master_key: 'v1' }),
    memoTx(REVEAL_MEMO_TYPE, {
      round_number: 273,
      validator_master_key: 'v1',
      output_hashes: FOUNDATION,
    }),
    // A different round must be ignored.
    memoTx(COMMIT_MEMO_TYPE, { round_number: 272, validator_master_key: 'v9' }),
    // A non commit-reveal memo must be ignored.
    memoTx('pf_other_memo_v1', { round_number: 273 }),
  ]

  it('extracts only the requested round and ignores other memo types', () => {
    const memos = collectRoundMemos({
      transactions,
      roundNumber: 273,
      announcementType: ANNOUNCEMENT_MEMO_TYPE,
    })

    expect(memos.announcement?.txHash).toBe('ANNHASH')
    expect(memos.announcement?.payload.commit_opens_at).toBe(
      '2026-06-12T13:46:35Z',
    )
    expect(memos.commits).toHaveLength(1)
    expect(memos.commits[0].validator_master_key).toBe('v1')
    expect(memos.reveals).toHaveLength(1)
  })
})

describe('commitReveal classifyReveal', () => {
  it('matches only when all three hashes equal the foundation', () => {
    expect(classifyReveal({ output_hashes: FOUNDATION }, FOUNDATION)).toBe(
      'matching',
    )
    expect(
      classifyReveal(
        { output_hashes: { ...FOUNDATION, selected_unl_hash: 'other' } },
        FOUNDATION,
      ),
    ).toBe('divergent')
    expect(classifyReveal({ output_hashes: FOUNDATION }, null)).toBe(
      'divergent',
    )
  })
})

describe('commitReveal tallyParticipation', () => {
  const memos = {
    announcement: null,
    commits: [
      { round_number: 273, validator_master_key: 'v1' },
      { round_number: 273, validator_master_key: 'v2' },
      { round_number: 273, validator_master_key: 'v3' },
      // Duplicate commit from v1 must not double-count.
      { round_number: 273, validator_master_key: 'v1' },
    ],
    reveals: [
      {
        round_number: 273,
        validator_master_key: 'v1',
        output_hashes: FOUNDATION,
      },
      {
        round_number: 273,
        validator_master_key: 'v2',
        output_hashes: { ...FOUNDATION, validator_scores_hash: 'diff' },
      },
    ],
  }

  it('tallies matching, divergent, and committed-no-reveal after the window closes', () => {
    const tally = tallyParticipation(memos, FOUNDATION, true)
    expect(tally).toEqual({
      committed: 3,
      revealed: 2,
      matching: 1,
      divergent: 1,
      committedNoReveal: 1,
    })
  })

  it('does not count committed-no-reveal while the reveal window is open', () => {
    const tally = tallyParticipation(memos, FOUNDATION, false)
    expect(tally.committedNoReveal).toBe(0)
    expect(tally.committed).toBe(3)
    expect(tally.revealed).toBe(2)
  })

  it('ignores reveals from validators that never committed', () => {
    const tally = tallyParticipation(
      {
        announcement: null,
        commits: [{ round_number: 273, validator_master_key: 'v1' }],
        reveals: [
          {
            round_number: 273,
            validator_master_key: 'v1',
            output_hashes: FOUNDATION,
          },
          {
            round_number: 273,
            validator_master_key: 'ghost',
            output_hashes: FOUNDATION,
          },
        ],
      },
      FOUNDATION,
      true,
    )
    expect(tally.committed).toBe(1)
    expect(tally.revealed).toBe(1)
  })
})
