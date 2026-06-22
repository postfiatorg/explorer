import { normalizeConvergenceView } from './useConvergence'

describe('normalizeConvergenceView', () => {
  it('treats a null response (old backend / network failure) as unavailable', () => {
    const result = normalizeConvergenceView(null)
    expect(result.status).toBe('unavailable')
    expect(result.participants).toEqual([])
    expect(result.summary).toBeNull()
  })

  it('treats a not_tracked round as unavailable but keeps the round number', () => {
    const result = normalizeConvergenceView({
      round_number: 50,
      phase: 'not_tracked',
      finalized: false,
    })
    expect(result.status).toBe('unavailable')
    expect(result.roundNumber).toBe(50)
  })

  it('reads a live round from the top-level participants/summary', () => {
    const result = normalizeConvergenceView({
      round_number: 273,
      phase: 'live',
      finalized: false,
      participants: [{ validator_master_key: 'nHU1', outcome: 'valid' }],
      summary: { committers: 1, outcomes: { valid: 1 } },
    })
    expect(result.status).toBe('ready')
    expect(result.phase).toBe('live')
    expect(result.finalized).toBe(false)
    expect(result.participants).toHaveLength(1)
    expect(result.summary?.committers).toBe(1)
    expect(result.convergenceBundleCid).toBeNull()
  })

  it('reads a sealed round from the nested report and surfaces seal metadata', () => {
    const result = normalizeConvergenceView({
      round_number: 273,
      phase: 'sealed',
      finalized: true,
      convergence_bundle_cid: 'QmBundle',
      anchor_tx_hash: 'ANCHOR123',
      sealed_at: '2026-05-25T01:30:00+00:00',
      report: {
        round_number: 273,
        participants: [{ validator_master_key: 'nHU1', outcome: 'divergent' }],
        summary: { committers: 1, outcomes: { divergent: 1 } },
      },
    })
    expect(result.status).toBe('ready')
    expect(result.phase).toBe('sealed')
    expect(result.finalized).toBe(true)
    expect(result.participants[0].outcome).toBe('divergent')
    expect(result.convergenceBundleCid).toBe('QmBundle')
    expect(result.anchorTxHash).toBe('ANCHOR123')
    expect(result.sealedAt).toBe('2026-05-25T01:30:00+00:00')
  })

  it('tolerates a sealed round whose report is missing', () => {
    const result = normalizeConvergenceView({
      round_number: 9,
      phase: 'sealed',
      finalized: true,
      convergence_bundle_cid: 'QmBundle',
    })
    expect(result.status).toBe('ready')
    expect(result.participants).toEqual([])
    expect(result.summary).toBeNull()
  })

  it('treats an unknown phase as unavailable', () => {
    const result = normalizeConvergenceView({
      round_number: 1,
      phase: 'something_new',
    })
    expect(result.status).toBe('unavailable')
  })
})
