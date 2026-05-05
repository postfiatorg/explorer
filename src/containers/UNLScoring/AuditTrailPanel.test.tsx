import { mount } from 'enzyme'
import { AuditTrailPanel } from './AuditTrailPanel'
import { useAuditTrail } from './useAuditTrail'
import type { ScoringRoundMeta } from '../Network/scoringUtils'

jest.mock('./useAuditTrail', () => ({
  __esModule: true,
  useAuditTrail: jest.fn(),
}))

const round = (
  status = 'COMPLETE',
  extra: Partial<ScoringRoundMeta> = {},
): ScoringRoundMeta => ({
  round_number: 240,
  status,
  completed_at: '2026-04-29T12:00:00Z',
  ipfs_cid: 'QmMemoWarningCid',
  vl_sequence: 7,
  github_pages_commit_url:
    'https://github.com/postfiatorg/postfiatorg.github.io/commit/abc',
  ...extra,
})

describe('AuditTrailPanel memo warnings', () => {
  beforeEach(() => {
    ;(useAuditTrail as jest.Mock).mockReturnValue({
      vlEffectiveIso: '2026-04-29T13:00:00.000Z',
      vlExpiresIso: '2026-05-29T13:00:00.000Z',
      memoLedger: 12345,
      memoBodyText: '{"round_number":240}',
      vlJsonAvailable: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('shows explicit memo failure context for memo-failed published rounds', () => {
    const wrapper = mount(
      <AuditTrailPanel
        round={round('VL_PUBLISHED_MEMO_FAILED', {
          memo_tx_hash: null,
          error_message: 'ONCHAIN_PUBLISHED: tecNO_DST',
        })}
      />,
    )

    expect(wrapper.find('.audit-trail-placeholder').exists()).toBe(false)
    expect(wrapper.text()).toContain('IPFS CID')
    expect(wrapper.text()).toContain('Published VL')
    expect(wrapper.text()).toContain('On-chain memo')
    expect(wrapper.text()).toContain(
      'Memo publication failed after the VL was published.',
    )
    expect(wrapper.text()).toContain('No memo transaction was anchored')
    expect(wrapper.text()).toContain('ONCHAIN_PUBLISHED: tecNO_DST')
    expect(wrapper.find('.audit-trail-hash-link').exists()).toBe(false)

    wrapper.unmount()
  })

  it('preserves normal memo transaction rendering for completed rounds', () => {
    const wrapper = mount(
      <AuditTrailPanel
        round={round('COMPLETE', {
          memo_tx_hash: 'ABC123',
        })}
      />,
    )

    expect(wrapper.find('.audit-trail-hash-link').text()).toBe('ABC123')
    expect(wrapper.text()).toContain('"round_number": 240')
    expect(wrapper.text()).not.toContain('Memo publication failed')

    wrapper.unmount()
  })
})
